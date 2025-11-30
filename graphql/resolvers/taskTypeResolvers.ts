import { prisma } from "../prismaClient";

// Context 類型
interface Context {
  user?: {
    id: string;
    email: string;
    role: string;
    name?: string;
  };
}

// 權限檢查
const requireAuth = (context: Context) => {
  if (!context.user) {
    throw new Error("未授權：請先登入");
  }
  return context.user;
};

const requireSuperAdmin = (context: Context) => {
  const user = requireAuth(context);
  if (user.role !== "SUPER_ADMIN") {
    throw new Error("權限不足：需要超級管理員權限");
  }
  return user;
};

// 格式化日期
const formatDate = (date: Date | null | undefined): string | null => {
  if (!date) return null;
  return date.toISOString();
};

// 格式化任務類型
const formatTaskType = (taskType: {
  id: number;
  code: string;
  label: string;
  description: string | null;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: taskType.id,
  code: taskType.code,
  label: taskType.label,
  description: taskType.description,
  order: taskType.order,
  isActive: taskType.isActive,
  createdAt: formatDate(taskType.createdAt),
  updatedAt: formatDate(taskType.updatedAt),
});

export const taskTypeResolvers = {
  Query: {
    // 獲取所有任務類型
    taskTypes: async (
      _: unknown,
      args: { includeInactive?: boolean },
      context: Context
    ) => {
      requireAuth(context);

      const where = args.includeInactive ? {} : { isActive: true };

      const taskTypes = await prisma.taskType.findMany({
        where,
        orderBy: { order: "asc" },
      });

      return taskTypes.map(formatTaskType);
    },

    // 獲取單個任務類型
    taskType: async (_: unknown, args: { id: number }, context: Context) => {
      requireAuth(context);

      const taskType = await prisma.taskType.findUnique({
        where: { id: args.id },
      });

      if (!taskType) return null;
      return formatTaskType(taskType);
    },
  },

  Mutation: {
    // 創建任務類型
    createTaskType: async (
      _: unknown,
      args: {
        input: {
          code: string;
          label: string;
          description?: string;
          order?: number;
        };
      },
      context: Context
    ) => {
      requireSuperAdmin(context);

      // 檢查 code 是否已存在
      const existing = await prisma.taskType.findUnique({
        where: { code: args.input.code },
      });

      if (existing) {
        throw new Error(`類型代碼 "${args.input.code}" 已存在`);
      }

      // 如果沒有指定 order，取最大值 + 1
      let order = args.input.order;
      if (order === undefined) {
        const maxOrder = await prisma.taskType.aggregate({
          _max: { order: true },
        });
        order = (maxOrder._max.order || 0) + 1;
      }

      const taskType = await prisma.taskType.create({
        data: {
          code: args.input.code,
          label: args.input.label,
          description: args.input.description,
          order,
        },
      });

      return formatTaskType(taskType);
    },

    // 更新任務類型
    updateTaskType: async (
      _: unknown,
      args: {
        input: {
          id: number;
          code?: string;
          label?: string;
          description?: string;
          order?: number;
          isActive?: boolean;
        };
      },
      context: Context
    ) => {
      requireSuperAdmin(context);

      const existing = await prisma.taskType.findUnique({
        where: { id: args.input.id },
      });

      if (!existing) {
        throw new Error("找不到該任務類型");
      }

      // 如果更新 code，檢查是否重複
      if (args.input.code && args.input.code !== existing.code) {
        const duplicate = await prisma.taskType.findUnique({
          where: { code: args.input.code },
        });
        if (duplicate) {
          throw new Error(`類型代碼 "${args.input.code}" 已存在`);
        }
      }

      const taskType = await prisma.taskType.update({
        where: { id: args.input.id },
        data: {
          code: args.input.code,
          label: args.input.label,
          description: args.input.description,
          order: args.input.order,
          isActive: args.input.isActive,
        },
      });

      return formatTaskType(taskType);
    },

    // 刪除任務類型（軟刪除）
    deleteTaskType: async (
      _: unknown,
      args: { id: number },
      context: Context
    ) => {
      requireSuperAdmin(context);

      const existing = await prisma.taskType.findUnique({
        where: { id: args.id },
        include: { tasks: { take: 1 } },
      });

      if (!existing) {
        throw new Error("找不到該任務類型");
      }

      // 如果有關聯的任務，只能軟刪除
      if (existing.tasks.length > 0) {
        await prisma.taskType.update({
          where: { id: args.id },
          data: { isActive: false },
        });
      } else {
        // 沒有關聯任務，可以硬刪除
        await prisma.taskType.delete({
          where: { id: args.id },
        });
      }

      return true;
    },

    // 批量更新排序
    reorderTaskTypes: async (
      _: unknown,
      args: { ids: number[] },
      context: Context
    ) => {
      requireSuperAdmin(context);

      // 批量更新排序
      await Promise.all(
        args.ids.map((id, index) =>
          prisma.taskType.update({
            where: { id },
            data: { order: index },
          })
        )
      );

      const taskTypes = await prisma.taskType.findMany({
        where: { id: { in: args.ids } },
        orderBy: { order: "asc" },
      });

      return taskTypes.map(formatTaskType);
    },
  },
};
