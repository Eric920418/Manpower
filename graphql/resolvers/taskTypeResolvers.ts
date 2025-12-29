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

// 問題觸發條件定義
interface QuestionTrigger {
  answer: string;
  taskTypeId: number;
}

// 提醒設定定義
interface ReminderSetting {
  answer: string;
  message: string;
}

// 補充說明設定定義
interface ExplanationSetting {
  answer: string;
  prompt: string;
}

// 問題類型定義
interface Question {
  id: string;
  label: string;
  type: "TEXT" | "RADIO" | "CHECKBOX";
  options?: string[];
  required?: boolean;
  triggers?: QuestionTrigger[];  // 改為陣列，每個選項可設定不同的後續任務
  reminders?: ReminderSetting[];  // 改為陣列，每個選項可設定不同的提醒
  explanations?: ExplanationSetting[];  // 改為陣列，每個選項可要求補充說明
}

// 格式化問題列表
const formatQuestions = (questions: unknown): Question[] => {
  if (!questions || !Array.isArray(questions)) return [];
  return questions.map((q: Question) => ({
    id: q.id || crypto.randomUUID(),
    label: q.label || "",
    type: q.type || "TEXT",
    options: q.options || [],
    required: q.required || false,
    triggers: q.triggers || [],
    reminders: q.reminders || [],
    explanations: q.explanations || [],
  }));
};

// 格式化任務類型（基本）
const formatTaskTypeBasic = (taskType: {
  id: number;
  code: string;
  label: string;
  description: string | null;
  titlePlaceholder?: string | null;
  order: number;
  isActive: boolean;
  questions?: unknown;
  positionX?: number | null;
  positionY?: number | null;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  id: taskType.id,
  code: taskType.code,
  label: taskType.label,
  description: taskType.description,
  titlePlaceholder: taskType.titlePlaceholder ?? null,
  order: taskType.order,
  isActive: taskType.isActive,
  questions: formatQuestions(taskType.questions),
  positionX: taskType.positionX ?? null,
  positionY: taskType.positionY ?? null,
  outgoingFlows: [],
  incomingFlows: [],
  createdAt: formatDate(taskType.createdAt),
  updatedAt: formatDate(taskType.updatedAt),
});

// 流程關聯類型
interface FlowRelation {
  id: number;
  fromTaskTypeId: number;
  toTaskTypeId: number;
  label: string | null;
  condition: unknown;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  fromTaskType?: { id: number; code: string; label: string };
  toTaskType?: { id: number; code: string; label: string };
}

// 格式化任務類型（含分配資訊和流程）
interface TaskTypeWithAssignments {
  id: number;
  code: string;
  label: string;
  description: string | null;
  titlePlaceholder?: string | null;
  order: number;
  isActive: boolean;
  questions?: unknown;
  positionX?: number | null;
  positionY?: number | null;
  createdAt: Date;
  updatedAt: Date;
  outgoingFlows?: FlowRelation[];
  incomingFlows?: FlowRelation[];
}

// 格式化流程
const formatFlow = (flow: FlowRelation) => ({
  id: flow.id,
  fromTaskTypeId: flow.fromTaskTypeId,
  toTaskTypeId: flow.toTaskTypeId,
  label: flow.label,
  condition: flow.condition,
  order: flow.order,
  createdAt: formatDate(flow.createdAt),
  updatedAt: formatDate(flow.updatedAt),
  fromTaskType: flow.fromTaskType ? {
    id: flow.fromTaskType.id,
    code: flow.fromTaskType.code,
    label: flow.fromTaskType.label,
  } : undefined,
  toTaskType: flow.toTaskType ? {
    id: flow.toTaskType.id,
    code: flow.toTaskType.code,
    label: flow.toTaskType.label,
  } : undefined,
});

const formatTaskType = (taskType: TaskTypeWithAssignments) => ({
  id: taskType.id,
  code: taskType.code,
  label: taskType.label,
  description: taskType.description,
  titlePlaceholder: taskType.titlePlaceholder ?? null,
  order: taskType.order,
  isActive: taskType.isActive,
  questions: formatQuestions(taskType.questions),
  positionX: taskType.positionX ?? null,
  positionY: taskType.positionY ?? null,
  outgoingFlows: (taskType.outgoingFlows || []).map(formatFlow),
  incomingFlows: (taskType.incomingFlows || []).map(formatFlow),
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
        include: {
          outgoingFlows: {
            include: {
              toTaskType: {
                select: { id: true, code: true, label: true },
              },
            },
            orderBy: { order: "asc" },
          },
          incomingFlows: {
            include: {
              fromTaskType: {
                select: { id: true, code: true, label: true },
              },
            },
            orderBy: { order: "asc" },
          },
        },
      });

      return taskTypes.map(formatTaskType);
    },

    // 獲取單個任務類型
    taskType: async (_: unknown, args: { id: number }, context: Context) => {
      requireAuth(context);

      const taskType = await prisma.taskType.findUnique({
        where: { id: args.id },
        include: {
          outgoingFlows: {
            include: {
              toTaskType: {
                select: { id: true, code: true, label: true },
              },
            },
            orderBy: { order: "asc" },
          },
          incomingFlows: {
            include: {
              fromTaskType: {
                select: { id: true, code: true, label: true },
              },
            },
            orderBy: { order: "asc" },
          },
        },
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
          titlePlaceholder?: string;
          order?: number;
          questions?: Array<{
            id?: string;
            label: string;
            type: "TEXT" | "RADIO" | "CHECKBOX";
            options?: string[];
            required?: boolean;
            triggers?: Array<{ answer: string; taskTypeId: number }>;
            reminders?: Array<{ answer: string; message: string }>;
            explanations?: Array<{ answer: string; prompt: string }>;
          }>;
          positionX?: number;
          positionY?: number;
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

      // 處理問題列表，確保每個問題都有 id
      const questions = (args.input.questions || []).map((q) => ({
        id: q.id || crypto.randomUUID(),
        label: q.label,
        type: q.type,
        options: q.options || [],
        required: q.required || false,
        triggers: q.triggers || [],
        reminders: q.reminders || [],
        explanations: q.explanations || [],
      }));

      const taskType = await prisma.taskType.create({
        data: {
          code: args.input.code,
          label: args.input.label,
          description: args.input.description,
          titlePlaceholder: args.input.titlePlaceholder,
          order,
          questions,
          positionX: args.input.positionX,
          positionY: args.input.positionY,
        },
      });

      // 記錄活動日誌
      const user = requireSuperAdmin(context);
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: "create",
          entity: "task_type",
          entityId: taskType.id.toString(),
          details: {
            code: taskType.code,
            label: taskType.label,
          },
        },
      });

      return formatTaskTypeBasic(taskType);
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
          titlePlaceholder?: string;
          order?: number;
          isActive?: boolean;
          questions?: Array<{
            id?: string;
            label: string;
            type: "TEXT" | "RADIO" | "CHECKBOX";
            options?: string[];
            required?: boolean;
            triggers?: Array<{ answer: string; taskTypeId: number }>;
            reminders?: Array<{ answer: string; message: string }>;
            explanations?: Array<{ answer: string; prompt: string }>;
          }>;
          positionX?: number;
          positionY?: number;
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

      // 處理問題列表
      let questions;
      if (args.input.questions !== undefined) {
        questions = args.input.questions.map((q) => ({
          id: q.id || crypto.randomUUID(),
          label: q.label,
          type: q.type,
          options: q.options || [],
          required: q.required || false,
          triggers: q.triggers || [],
          reminders: q.reminders || [],
          explanations: q.explanations || [],
        }));
      }

      // 除錯日誌
      console.log("[updateTaskType] Input received:", JSON.stringify(args.input, null, 2));
      console.log("[updateTaskType] titlePlaceholder value:", args.input.titlePlaceholder);

      const taskType = await prisma.taskType.update({
        where: { id: args.input.id },
        data: {
          code: args.input.code,
          label: args.input.label,
          description: args.input.description,
          titlePlaceholder: args.input.titlePlaceholder,
          order: args.input.order,
          isActive: args.input.isActive,
          ...(questions !== undefined && { questions }),
          ...(args.input.positionX !== undefined && { positionX: args.input.positionX }),
          ...(args.input.positionY !== undefined && { positionY: args.input.positionY }),
        },
      });

      // === 雙向同步：問題 triggers → 流程連線 ===
      if (questions !== undefined) {
        // 獲取現有的流程連線
        const existingFlows = await prisma.taskTypeFlow.findMany({
          where: { fromTaskTypeId: args.input.id },
        });

        // 收集問題中所有的 triggers 設定
        const triggersFromQuestions: Array<{
          questionId: string;
          answer: string;
          targetTaskTypeId: number;
        }> = [];

        for (const q of questions) {
          // 現在支援多個 triggers
          if (q.triggers && q.triggers.length > 0) {
            for (const trigger of q.triggers) {
              if (trigger.taskTypeId) {
                triggersFromQuestions.push({
                  questionId: q.id,
                  answer: trigger.answer,
                  targetTaskTypeId: trigger.taskTypeId,
                });
              }
            }
          }
        }

        // 為每個 trigger 創建或更新流程連線
        for (const trigger of triggersFromQuestions) {
          // 檢查是否已存在相同目標和答案的流程
          const existingFlow = existingFlows.find(
            (f) => {
              const condition = f.condition as { questionId?: string; answer?: string } | null;
              return f.toTaskTypeId === trigger.targetTaskTypeId &&
                     condition?.questionId === trigger.questionId &&
                     condition?.answer === trigger.answer;
            }
          );

          if (existingFlow) {
            // 流程已存在，無需更新
          } else {
            // 檢查是否有相同目標但不同條件的流程
            const sameTargetFlow = existingFlows.find(
              (f) => f.toTaskTypeId === trigger.targetTaskTypeId
            );

            if (sameTargetFlow) {
              // 更新現有流程的條件
              await prisma.taskTypeFlow.update({
                where: { id: sameTargetFlow.id },
                data: {
                  condition: {
                    questionId: trigger.questionId,
                    answer: trigger.answer,
                  },
                },
              });
            } else {
              // 創建新的流程連線
              const maxOrder = await prisma.taskTypeFlow.aggregate({
                where: { fromTaskTypeId: args.input.id },
                _max: { order: true },
              });

              await prisma.taskTypeFlow.create({
                data: {
                  fromTaskTypeId: args.input.id,
                  toTaskTypeId: trigger.targetTaskTypeId,
                  condition: {
                    questionId: trigger.questionId,
                    answer: trigger.answer,
                  },
                  order: (maxOrder._max.order || 0) + 1,
                },
              });
            }
          }
        }

        // 注意：不自動刪除沒有 trigger 對應的流程，因為可能是在流程編輯器中手動創建的
      }

      // 記錄活動日誌
      const user = requireSuperAdmin(context);
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: "update",
          entity: "task_type",
          entityId: taskType.id.toString(),
          details: {
            code: taskType.code,
            label: taskType.label,
            changes: {
              ...(args.input.code && { code: args.input.code }),
              ...(args.input.label && { label: args.input.label }),
              ...(args.input.isActive !== undefined && { isActive: args.input.isActive }),
              ...(args.input.questions && { questionsUpdated: true }),
            },
          },
        },
      });

      return formatTaskTypeBasic(taskType);
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

      // 記錄活動日誌（保存完整資料快照以便復原）
      const user = requireSuperAdmin(context);
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: "delete",
          entity: "task_type",
          entityId: args.id.toString(),
          details: {
            // 顯示用的摘要資訊
            code: existing.code,
            label: existing.label,
            softDelete: existing.tasks.length > 0,
            // 完整的資料快照（用於復原）
            snapshot: {
              code: existing.code,
              label: existing.label,
              description: existing.description,
              titlePlaceholder: existing.titlePlaceholder,
              order: existing.order,
              isActive: existing.isActive,
              questions: existing.questions,
              positionX: existing.positionX,
              positionY: existing.positionY,
            },
          },
        },
      });

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

      return taskTypes.map(formatTaskTypeBasic);
    },

  },
};
