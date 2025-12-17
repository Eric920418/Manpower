import { prisma } from "../prismaClient";
import { hasPermissionWithCustom, type CustomPermissions } from "@/lib/permissions";
import type { Role } from "@prisma/client";

// Context 介面
interface Context {
  user?: {
    id: string;
    role: string;
    customPermissions?: CustomPermissions | null;
  };
}

// 檢查網頁內容編輯權限
const requireWebContentUpdate = (context: Context) => {
  if (!context.user) {
    throw new Error("未登入");
  }

  const hasPermission = hasPermissionWithCustom(
    context.user.role as Role,
    'web_content:update',
    context.user.customPermissions
  );

  if (!hasPermission) {
    throw new Error("權限不足：需要「編輯網頁內容」權限才能進行此操作");
  }

  return context.user;
};

interface NavigationInput {
  label: string;
  url?: string | null;
  parentId?: number | null;
  order?: number | null;
  isActive?: boolean | null;
  icon?: string | null;
  target?: string | null;
}

interface UpdateNavigationInput {
  id: number;
  label?: string;
  url?: string | null;
  parentId?: number | null;
  order?: number | null;
  isActive?: boolean | null;
  icon?: string | null;
  target?: string | null;
}

export const navigationResolvers = {
  Query: {
    // 取得所有導航項目（包含階層結構）- 優化：單次查詢 + 記憶體組裝
    navigations: async () => {
      const navs = await prisma.navigation.findMany({
        orderBy: [{ order: "asc" }, { id: "asc" }],
        select: {
          id: true,
          label: true,
          url: true,
          parentId: true,
          order: true,
          isActive: true,
          icon: true,
          target: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // 組織成樹狀結構（記憶體內處理，無額外查詢）
      const navMap = new Map(navs.map((nav) => [nav.id, { ...nav, children: [] as typeof navs }]));
      const rootNavs: typeof navs = [];

      navs.forEach((nav) => {
        const navWithChildren = navMap.get(nav.id)!;
        if (nav.parentId) {
          const parent = navMap.get(nav.parentId);
          if (parent) {
            parent.children.push(navWithChildren);
          }
        } else {
          rootNavs.push(navWithChildren);
        }
      });

      return rootNavs;
    },

    // 取得單一導航項目 - 優化：使用 include 一次查詢完成
    navigation: async (_: unknown, { id }: { id: number }) => {
      const nav = await prisma.navigation.findUnique({
        where: { id },
        include: {
          children: {
            orderBy: [{ order: "asc" }, { id: "asc" }],
          },
          parent: true,
        },
      });

      if (!nav) {
        throw new Error(`Navigation with id ${id} not found`);
      }

      return nav;
    },

    // 取得啟用的頂層導航（用於前台 Header）- 優化：單次查詢取得所有資料
    activeNavigations: async () => {
      // 一次查詢取得所有啟用的導航
      const allActiveNavs = await prisma.navigation.findMany({
        where: { isActive: true },
        orderBy: [{ order: "asc" }, { id: "asc" }],
        select: {
          id: true,
          label: true,
          url: true,
          parentId: true,
          order: true,
          isActive: true,
          icon: true,
          target: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // 記憶體內組裝樹狀結構（避免 N+1）
      const childrenMap = new Map<number, typeof allActiveNavs>();
      const rootNavs: Array<typeof allActiveNavs[0] & { children: typeof allActiveNavs; parent: null }> = [];

      // 先將所有子項目分組
      allActiveNavs.forEach((nav) => {
        if (nav.parentId) {
          const siblings = childrenMap.get(nav.parentId) || [];
          siblings.push(nav);
          childrenMap.set(nav.parentId, siblings);
        }
      });

      // 組裝頂層導航及其子項目
      allActiveNavs.forEach((nav) => {
        if (!nav.parentId) {
          rootNavs.push({
            ...nav,
            children: childrenMap.get(nav.id) || [],
            parent: null,
          });
        }
      });

      return rootNavs;
    },
  },

  Mutation: {
    // 建立導航項目
    createNavigation: async (_: unknown, { input }: { input: NavigationInput }, context: Context) => {
      // 檢查權限
      requireWebContentUpdate(context);

      // 驗證 parentId 是否存在
      if (input.parentId) {
        const parent = await prisma.navigation.findUnique({
          where: { id: input.parentId },
        });
        if (!parent) {
          throw new Error(`Parent navigation with id ${input.parentId} not found`);
        }
      }

      // 如果沒有指定 order，自動設為最後
      let order = input.order ?? 0;
      if (!input.order) {
        const maxOrder = await prisma.navigation.findFirst({
          where: { parentId: input.parentId ?? null },
          orderBy: { order: "desc" },
          select: { order: true },
        });
        order = (maxOrder?.order ?? -1) + 1;
      }

      // 優化：使用 include 一次查詢完成，避免額外查詢
      const nav = await prisma.navigation.create({
        data: {
          label: input.label,
          url: input.url ?? null,
          parentId: input.parentId ?? null,
          order,
          isActive: input.isActive ?? true,
          icon: input.icon ?? null,
          target: input.target ?? "_self",
        },
        include: {
          children: true,
          parent: true,
        },
      });

      // 記錄活動日誌
      if (context.user) {
        await prisma.activityLog.create({
          data: {
            userId: context.user.id,
            action: "create",
            entity: "navigation",
            entityId: nav.id.toString(),
            details: {
              label: nav.label,
              url: nav.url,
              parentId: nav.parentId,
            },
          },
        });
      }

      return nav;
    },

    // 更新導航項目
    updateNavigation: async (_: unknown, { input }: { input: UpdateNavigationInput }, context: Context) => {
      // 檢查權限
      requireWebContentUpdate(context);

      const { id, ...data } = input;

      // 檢查導航是否存在
      const existing = await prisma.navigation.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new Error(`Navigation with id ${id} not found`);
      }

      // 驗證 parentId（如果有提供）
      if (data.parentId !== undefined && data.parentId !== null) {
        // 不能將自己設為父項目
        if (data.parentId === id) {
          throw new Error("Cannot set navigation as its own parent");
        }

        const parent = await prisma.navigation.findUnique({
          where: { id: data.parentId },
        });
        if (!parent) {
          throw new Error(`Parent navigation with id ${data.parentId} not found`);
        }
      }

      // 過濾掉 undefined 的值
      const updateData: Record<string, unknown> = {};
      if (data.label !== undefined) updateData.label = data.label;
      if (data.url !== undefined) updateData.url = data.url;
      if (data.parentId !== undefined) updateData.parentId = data.parentId;
      if (data.order !== undefined) updateData.order = data.order;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      if (data.icon !== undefined) updateData.icon = data.icon;
      if (data.target !== undefined) updateData.target = data.target;

      // 優化：使用 include 一次查詢完成
      const nav = await prisma.navigation.update({
        where: { id },
        data: updateData,
        include: {
          children: {
            orderBy: [{ order: "asc" }, { id: "asc" }],
          },
          parent: true,
        },
      });

      // 記錄活動日誌
      if (context.user) {
        await prisma.activityLog.create({
          data: {
            userId: context.user.id,
            action: "update",
            entity: "navigation",
            entityId: nav.id.toString(),
            details: {
              label: nav.label,
              changes: Object.keys(updateData),
            },
          },
        });
      }

      return nav;
    },

    // 刪除導航項目（Cascade 會自動刪除子項目）
    deleteNavigation: async (_: unknown, { id }: { id: number }, context: Context) => {
      // 檢查權限
      requireWebContentUpdate(context);

      const existing = await prisma.navigation.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new Error(`Navigation with id ${id} not found`);
      }

      await prisma.navigation.delete({
        where: { id },
      });

      // 記錄活動日誌
      if (context.user) {
        await prisma.activityLog.create({
          data: {
            userId: context.user.id,
            action: "delete",
            entity: "navigation",
            entityId: id.toString(),
            details: {
              label: existing.label,
              url: existing.url,
            },
          },
        });
      }

      return true;
    },

    // 批次更新排序
    reorderNavigations: async (_: unknown, { ids }: { ids: number[] }, context: Context) => {
      // 檢查權限
      requireWebContentUpdate(context);

      // 使用 transaction 確保原子性
      await prisma.$transaction(
        ids.map((id, index) =>
          prisma.navigation.update({
            where: { id },
            data: { order: index },
          })
        )
      );

      // 記錄活動日誌
      if (context.user) {
        await prisma.activityLog.create({
          data: {
            userId: context.user.id,
            action: "reorder",
            entity: "navigation",
            entityId: "batch",
            details: {
              reorderedIds: ids,
              count: ids.length,
            },
          },
        });
      }

      return true;
    },
  },
};
