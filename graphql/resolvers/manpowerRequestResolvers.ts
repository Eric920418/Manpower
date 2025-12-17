import { prisma } from "../prismaClient";
import { hasPermissionWithCustom, type CustomPermissions } from "@/lib/permissions";
import type { Role } from "@prisma/client";

// 生成需求單號（格式：MPR-YYYYMMDD-XXXXX）
function generateRequestNo(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, "0");

  return `MPR-${year}${month}${day}-${random}`;
}

// Context 類型
interface Context {
  user?: {
    id: string;
    role: string;
    customPermissions?: CustomPermissions | null;
  };
}

// 權限檢查輔助函數 - 使用支援自訂權限的版本
function checkPermission(context: Context, permission: string): boolean {
  if (!context.user) return false;
  return hasPermissionWithCustom(
    context.user.role as Role,
    permission as any,
    context.user.customPermissions
  );
}

export const manpowerRequestResolvers = {
  Query: {
    // 獲取人力需求列表（支援篩選）
    manpowerRequests: async (
      _: any,
      { filter }: { filter?: any },
      context: any
    ) => {
      // 權限檢查
      if (!context.user) {
        throw new Error("未登入，無法查看人力需求");
      }

      if (!checkPermission(context, "form:read")) {
        throw new Error("沒有權限查看人力需求");
      }

      try {
        // 構建查詢條件
        const where: any = {};

        // 業務人員 (STAFF) 只能看到自己介紹的客戶
        // SUPER_ADMIN 和 OWNER 可以看到所有客戶
        if (context.user.role === "STAFF") {
          where.invitedBy = context.user.id;
        }

        if (filter) {
          if (filter.status) {
            where.status = filter.status;
          }
          if (filter.contactEmail) {
            where.contactEmail = {
              contains: filter.contactEmail,
              mode: "insensitive",
            };
          }
          if (filter.startDate || filter.endDate) {
            where.createdAt = {};
            if (filter.startDate) {
              where.createdAt.gte = new Date(filter.startDate);
            }
            if (filter.endDate) {
              where.createdAt.lte = new Date(filter.endDate);
            }
          }
        }

        const requests = await prisma.manpowerRequest.findMany({
          where,
          orderBy: {
            createdAt: "desc",
          },
        });

        return requests.map((req) => ({
          ...req,
          expectedStartDate: req.expectedStartDate?.toISOString() || null,
          processedAt: req.processedAt?.toISOString() || null,
          createdAt: req.createdAt.toISOString(),
          updatedAt: req.updatedAt.toISOString(),
        }));
      } catch (error) {
        console.error("查詢人力需求失敗：", error);
        throw new Error(
          `查詢失敗：${error instanceof Error ? error.message : "未知錯誤"}`
        );
      }
    },

    // 根據 ID 獲取單一需求
    manpowerRequest: async (_: any, { id }: { id: number }, context: any) => {
      if (!context.user) {
        throw new Error("未登入，無法查看人力需求");
      }

      if (!checkPermission(context, "form:read")) {
        throw new Error("沒有權限查看人力需求");
      }

      try {
        const request = await prisma.manpowerRequest.findUnique({
          where: { id },
        });

        if (!request) {
          throw new Error("找不到該人力需求");
        }

        return {
          ...request,
          expectedStartDate: request.expectedStartDate?.toISOString() || null,
          processedAt: request.processedAt?.toISOString() || null,
          createdAt: request.createdAt.toISOString(),
          updatedAt: request.updatedAt.toISOString(),
        };
      } catch (error) {
        console.error("查詢人力需求失敗：", error);
        throw new Error(
          `查詢失敗：${error instanceof Error ? error.message : "未知錯誤"}`
        );
      }
    },

    // 根據需求單號獲取需求
    manpowerRequestByNo: async (
      _: any,
      { requestNo }: { requestNo: string },
      context: any
    ) => {
      if (!context.user) {
        throw new Error("未登入，無法查看人力需求");
      }

      if (!checkPermission(context, "form:read")) {
        throw new Error("沒有權限查看人力需求");
      }

      try {
        const request = await prisma.manpowerRequest.findUnique({
          where: { requestNo },
        });

        if (!request) {
          throw new Error("找不到該人力需求");
        }

        return {
          ...request,
          expectedStartDate: request.expectedStartDate?.toISOString() || null,
          processedAt: request.processedAt?.toISOString() || null,
          createdAt: request.createdAt.toISOString(),
          updatedAt: request.updatedAt.toISOString(),
        };
      } catch (error) {
        console.error("查詢人力需求失敗：", error);
        throw new Error(
          `查詢失敗：${error instanceof Error ? error.message : "未知錯誤"}`
        );
      }
    },

    // 獲取統計資料
    manpowerRequestStats: async (_: any, __: any, context: any) => {
      if (!context.user) {
        throw new Error("未登入，無法查看統計資料");
      }

      if (!checkPermission(context, "form:read")) {
        throw new Error("沒有權限查看統計資料");
      }

      try {
        // 業務人員 (STAFF) 只統計自己介紹的客戶
        // SUPER_ADMIN 和 OWNER 可以看到所有統計
        const baseWhere =
          context.user.role === "STAFF"
            ? { invitedBy: context.user.id }
            : {};

        const [total, pending, processing, completed, rejected, cancelled] =
          await Promise.all([
            prisma.manpowerRequest.count({ where: baseWhere }),
            prisma.manpowerRequest.count({
              where: { ...baseWhere, status: "pending" },
            }),
            prisma.manpowerRequest.count({
              where: { ...baseWhere, status: "processing" },
            }),
            prisma.manpowerRequest.count({
              where: { ...baseWhere, status: "completed" },
            }),
            prisma.manpowerRequest.count({
              where: { ...baseWhere, status: "rejected" },
            }),
            prisma.manpowerRequest.count({
              where: { ...baseWhere, status: "cancelled" },
            }),
          ]);

        return {
          total,
          pending,
          processing,
          completed,
          rejected,
          cancelled,
        };
      } catch (error) {
        console.error("查詢統計資料失敗：", error);
        throw new Error(
          `查詢失敗：${error instanceof Error ? error.message : "未知錯誤"}`
        );
      }
    },
  },

  Mutation: {
    // 新增人力需求（手動建立）- 需要 form:create 權限
    createManpowerRequest: async (
      _: any,
      { input }: { input: any },
      context: Context
    ) => {
      if (!context.user) {
        throw new Error("未登入，無法新增人力需求");
      }

      // 使用 customPermissions 檢查權限
      const canCreate = hasPermissionWithCustom(
        context.user.role as Role,
        'form:create',
        context.user.customPermissions
      );

      if (!canCreate) {
        throw new Error("沒有權限新增人力需求");
      }

      try {
        // 生成唯一需求單號（檢查是否重複）
        let requestNo = generateRequestNo();
        let attempts = 0;
        while (attempts < 10) {
          const existing = await prisma.manpowerRequest.findUnique({
            where: { requestNo },
          });

          if (!existing) {
            break;
          }

          requestNo = generateRequestNo();
          attempts++;
        }

        if (attempts >= 10) {
          throw new Error("無法生成唯一需求單號，請稍後再試");
        }

        // 處理預計到職日期
        let expectedStartDate: Date | null = null;
        if (input.expectedStartDate) {
          expectedStartDate = new Date(input.expectedStartDate);
        }

        // 建立人力需求
        const request = await prisma.manpowerRequest.create({
          data: {
            requestNo,
            selectedResumeIds: input.selectedResumeIds || [],
            companyName: input.companyName || null,
            contactPerson: input.contactPerson,
            contactPhone: input.contactPhone,
            contactEmail: input.contactEmail || null,
            lineId: input.lineId || null,
            qualifications: input.qualifications || null,
            positionTitle: input.positionTitle || null,
            jobDescription: input.jobDescription || null,
            quantity: input.quantity || 1,
            salaryRange: input.salaryRange || null,
            expectedStartDate,
            workLocation: input.workLocation || null,
            additionalRequirements: input.additionalRequirements || null,
            status: "pending",
            invitedBy: context.user.id, // 建立者即為邀請人
          },
        });

        // 記錄活動日誌
        await prisma.activityLog.create({
          data: {
            userId: context.user.id,
            action: "create",
            entity: "manpower_request",
            entityId: request.id.toString(),
            details: {
              requestNo: request.requestNo,
              companyName: request.companyName,
              contactPerson: request.contactPerson,
            },
          },
        });

        return {
          ...request,
          expectedStartDate: request.expectedStartDate?.toISOString() || null,
          processedAt: request.processedAt?.toISOString() || null,
          createdAt: request.createdAt.toISOString(),
          updatedAt: request.updatedAt.toISOString(),
        };
      } catch (error) {
        console.error("新增人力需求失敗：", error);
        throw new Error(
          `新增失敗：${error instanceof Error ? error.message : "未知錯誤"}`
        );
      }
    },

    // 更新人力需求（主要用於更新狀態和備註）- 僅 SUPER_ADMIN 可操作
    updateManpowerRequest: async (
      _: any,
      { input }: { input: any },
      context: any
    ) => {
      if (!context.user) {
        throw new Error("未登入，無法更新人力需求");
      }

      // 只有 SUPER_ADMIN 可以更新狀態
      if (context.user.role !== "SUPER_ADMIN") {
        throw new Error("只有系統管理員可以更新人力需求狀態");
      }

      try {
        const updateData: any = {};

        if (input.status) {
          updateData.status = input.status;
        }

        if (input.notes !== undefined) {
          updateData.notes = input.notes;
        }

        if (input.processedBy) {
          updateData.processedBy = input.processedBy;
        }

        // 如果狀態更新為非 pending，記錄處理時間
        if (input.status && input.status !== "pending") {
          updateData.processedAt = new Date();
          if (!input.processedBy) {
            updateData.processedBy = context.user.id;
          }
        }

        const request = await prisma.manpowerRequest.update({
          where: { id: input.id },
          data: updateData,
        });

        // 記錄活動日誌
        await prisma.activityLog.create({
          data: {
            userId: context.user.id,
            action: "update",
            entity: "manpower_request",
            entityId: request.id.toString(),
            details: {
              requestNo: request.requestNo,
              changes: updateData,
            },
          },
        });

        return {
          ...request,
          expectedStartDate: request.expectedStartDate?.toISOString() || null,
          processedAt: request.processedAt?.toISOString() || null,
          createdAt: request.createdAt.toISOString(),
          updatedAt: request.updatedAt.toISOString(),
        };
      } catch (error) {
        console.error("更新人力需求失敗：", error);
        throw new Error(
          `更新失敗：${error instanceof Error ? error.message : "未知錯誤"}`
        );
      }
    },

    // 刪除人力需求（僅超級管理員和業主）
    deleteManpowerRequest: async (
      _: any,
      { id }: { id: number },
      context: any
    ) => {
      if (!context.user) {
        throw new Error("未登入，無法刪除人力需求");
      }

      if (!checkPermission(context, "form:delete")) {
        throw new Error("沒有權限刪除人力需求");
      }

      try {
        // 先獲取需求資訊以記錄日誌
        const request = await prisma.manpowerRequest.findUnique({
          where: { id },
        });

        await prisma.manpowerRequest.delete({
          where: { id },
        });

        // 記錄活動日誌
        if (request) {
          await prisma.activityLog.create({
            data: {
              userId: context.user.id,
              action: "delete",
              entity: "manpower_request",
              entityId: id.toString(),
              details: {
                requestNo: request.requestNo,
                contactPerson: request.contactPerson,
              },
            },
          });
        }

        return true;
      } catch (error) {
        console.error("刪除人力需求失敗：", error);
        throw new Error(
          `刪除失敗：${error instanceof Error ? error.message : "未知錯誤"}`
        );
      }
    },
  },
};
