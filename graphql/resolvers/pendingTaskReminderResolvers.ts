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

// 格式化日期
const formatDate = (date: Date | null | undefined): string | null => {
  if (!date) return null;
  return date.toISOString();
};

// 格式化提醒
const formatReminder = (reminder: {
  id: number;
  userId: string;
  sourceTaskId: number;
  taskTypeId: number;
  taskTypeLabel: string;
  isCompleted: boolean;
  completedTaskId: number | null;
  lastRemindedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: reminder.id,
  userId: reminder.userId,
  sourceTaskId: reminder.sourceTaskId,
  taskTypeId: reminder.taskTypeId,
  taskTypeLabel: reminder.taskTypeLabel,
  isCompleted: reminder.isCompleted,
  completedTaskId: reminder.completedTaskId,
  lastRemindedAt: formatDate(reminder.lastRemindedAt),
  createdAt: formatDate(reminder.createdAt),
  updatedAt: formatDate(reminder.updatedAt),
});

// 提醒間隔（10分鐘）
const REMINDER_INTERVAL_MS = 10 * 60 * 1000;

export const pendingTaskReminderResolvers = {
  Query: {
    // 獲取當前用戶的所有待處理提醒
    myPendingTaskReminders: async (_: unknown, __: unknown, context: Context) => {
      const user = requireAuth(context);

      const reminders = await prisma.pendingTaskReminder.findMany({
        where: {
          userId: user.id,
          isCompleted: false,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return reminders.map(formatReminder);
    },

    // 檢查是否有需要顯示的提醒（用於 Toast）
    // 只返回距離上次提醒超過 10 分鐘的提醒，或從未提醒過的
    checkPendingReminders: async (_: unknown, __: unknown, context: Context) => {
      const user = requireAuth(context);

      const now = new Date();
      const cutoffTime = new Date(now.getTime() - REMINDER_INTERVAL_MS);

      const reminders = await prisma.pendingTaskReminder.findMany({
        where: {
          userId: user.id,
          isCompleted: false,
          OR: [
            { lastRemindedAt: null },
            { lastRemindedAt: { lt: cutoffTime } },
          ],
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return reminders.map(formatReminder);
    },
  },

  Mutation: {
    // 創建單個待處理提醒
    createPendingTaskReminder: async (
      _: unknown,
      { input }: { input: { sourceTaskId: number; taskTypeId: number; taskTypeLabel: string } },
      context: Context
    ) => {
      const user = requireAuth(context);

      // 檢查是否已存在相同的提醒
      const existing = await prisma.pendingTaskReminder.findFirst({
        where: {
          userId: user.id,
          sourceTaskId: input.sourceTaskId,
          taskTypeId: input.taskTypeId,
          isCompleted: false,
        },
      });

      if (existing) {
        return formatReminder(existing);
      }

      const reminder = await prisma.pendingTaskReminder.create({
        data: {
          userId: user.id,
          sourceTaskId: input.sourceTaskId,
          taskTypeId: input.taskTypeId,
          taskTypeLabel: input.taskTypeLabel,
        },
      });

      return formatReminder(reminder);
    },

    // 批量創建待處理提醒（用於「稍後處理」時）
    createPendingTaskReminders: async (
      _: unknown,
      { input }: { input: { sourceTaskId: number; reminders: Array<{ taskTypeId: number; taskTypeLabel: string }> } },
      context: Context
    ) => {
      const user = requireAuth(context);

      const createdReminders = [];

      for (const item of input.reminders) {
        // 檢查是否已存在相同的提醒
        const existing = await prisma.pendingTaskReminder.findFirst({
          where: {
            userId: user.id,
            sourceTaskId: input.sourceTaskId,
            taskTypeId: item.taskTypeId,
            isCompleted: false,
          },
        });

        if (existing) {
          createdReminders.push(existing);
          continue;
        }

        const reminder = await prisma.pendingTaskReminder.create({
          data: {
            userId: user.id,
            sourceTaskId: input.sourceTaskId,
            taskTypeId: item.taskTypeId,
            taskTypeLabel: item.taskTypeLabel,
          },
        });
        createdReminders.push(reminder);
      }

      return createdReminders.map(formatReminder);
    },

    // 標記提醒為已完成
    completePendingTaskReminder: async (
      _: unknown,
      { id, completedTaskId }: { id: number; completedTaskId: number },
      context: Context
    ) => {
      const user = requireAuth(context);

      const reminder = await prisma.pendingTaskReminder.findFirst({
        where: {
          id,
          userId: user.id,
        },
      });

      if (!reminder) {
        throw new Error("找不到指定的提醒");
      }

      const updated = await prisma.pendingTaskReminder.update({
        where: { id },
        data: {
          isCompleted: true,
          completedTaskId,
        },
      });

      return formatReminder(updated);
    },

    // 更新提醒時間（每次顯示 Toast 後調用）
    updateReminderLastShown: async (
      _: unknown,
      { ids }: { ids: number[] },
      context: Context
    ) => {
      const user = requireAuth(context);

      await prisma.pendingTaskReminder.updateMany({
        where: {
          id: { in: ids },
          userId: user.id,
        },
        data: {
          lastRemindedAt: new Date(),
        },
      });

      return true;
    },

    // 刪除提醒（用戶主動忽略）
    dismissPendingTaskReminder: async (
      _: unknown,
      { id }: { id: number },
      context: Context
    ) => {
      const user = requireAuth(context);

      const reminder = await prisma.pendingTaskReminder.findFirst({
        where: {
          id,
          userId: user.id,
        },
      });

      if (!reminder) {
        throw new Error("找不到指定的提醒");
      }

      await prisma.pendingTaskReminder.delete({
        where: { id },
      });

      return true;
    },
  },
};
