import { prisma } from "../prismaClient";
import { GraphQLError } from "graphql";

// Flow 條件介面
interface FlowCondition {
  questionId?: string;
  answer?: string;
}

// 格式化 condition
const formatCondition = (condition: unknown): FlowCondition | null => {
  if (!condition) return null;
  if (typeof condition === "object" && condition !== null) {
    const c = condition as Record<string, unknown>;
    return {
      questionId: typeof c.questionId === "string" ? c.questionId : undefined,
      answer: typeof c.answer === "string" ? c.answer : undefined,
    };
  }
  return null;
};

// 格式化 TaskTypeFlow
const formatFlow = (flow: {
  id: number;
  fromTaskTypeId: number;
  toTaskTypeId: number;
  label: string | null;
  condition: unknown;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  fromTaskType?: { id: number; code: string; label: string; description: string | null; order: number; isActive: boolean; positionX: number | null; positionY: number | null };
  toTaskType?: { id: number; code: string; label: string; description: string | null; order: number; isActive: boolean; positionX: number | null; positionY: number | null };
}) => ({
  id: flow.id,
  fromTaskTypeId: flow.fromTaskTypeId,
  toTaskTypeId: flow.toTaskTypeId,
  label: flow.label,
  condition: formatCondition(flow.condition),
  order: flow.order,
  createdAt: flow.createdAt.toISOString(),
  updatedAt: flow.updatedAt.toISOString(),
  fromTaskType: flow.fromTaskType,
  toTaskType: flow.toTaskType,
});

export const taskTypeFlowResolvers = {
  Query: {
    // 獲取所有流程
    taskTypeFlows: async () => {
      const flows = await prisma.taskTypeFlow.findMany({
        include: {
          fromTaskType: true,
          toTaskType: true,
        },
        orderBy: [{ fromTaskTypeId: "asc" }, { order: "asc" }],
      });
      return flows.map(formatFlow);
    },

    // 獲取指定任務類型的後續流程
    taskTypeOutgoingFlows: async (_: unknown, args: { taskTypeId: number }) => {
      const flows = await prisma.taskTypeFlow.findMany({
        where: { fromTaskTypeId: args.taskTypeId },
        include: {
          fromTaskType: true,
          toTaskType: true,
        },
        orderBy: { order: "asc" },
      });
      return flows.map(formatFlow);
    },

    // 獲取指定任務類型的前置流程
    taskTypeIncomingFlows: async (_: unknown, args: { taskTypeId: number }) => {
      const flows = await prisma.taskTypeFlow.findMany({
        where: { toTaskTypeId: args.taskTypeId },
        include: {
          fromTaskType: true,
          toTaskType: true,
        },
        orderBy: { order: "asc" },
      });
      return flows.map(formatFlow);
    },
  },

  Mutation: {
    // 創建流程
    createTaskTypeFlow: async (
      _: unknown,
      args: {
        input: {
          fromTaskTypeId: number;
          toTaskTypeId: number;
          label?: string;
          condition?: FlowCondition;
          order?: number;
        };
      }
    ) => {
      // 檢查來源和目標任務類型是否存在
      const [fromType, toType] = await Promise.all([
        prisma.taskType.findUnique({ where: { id: args.input.fromTaskTypeId } }),
        prisma.taskType.findUnique({ where: { id: args.input.toTaskTypeId } }),
      ]);

      if (!fromType) {
        throw new GraphQLError(`來源任務類型 ID ${args.input.fromTaskTypeId} 不存在`);
      }
      if (!toType) {
        throw new GraphQLError(`目標任務類型 ID ${args.input.toTaskTypeId} 不存在`);
      }

      // 不允許自己連自己
      if (args.input.fromTaskTypeId === args.input.toTaskTypeId) {
        throw new GraphQLError("不能將任務類型連接到自己");
      }

      const flow = await prisma.taskTypeFlow.create({
        data: {
          fromTaskTypeId: args.input.fromTaskTypeId,
          toTaskTypeId: args.input.toTaskTypeId,
          label: args.input.label,
          condition: args.input.condition ? JSON.parse(JSON.stringify(args.input.condition)) : undefined,
          order: args.input.order ?? 0,
        },
        include: {
          fromTaskType: true,
          toTaskType: true,
        },
      });

      return formatFlow(flow);
    },

    // 更新流程
    updateTaskTypeFlow: async (
      _: unknown,
      args: {
        id: number;
        input: {
          label?: string;
          condition?: FlowCondition;
          order?: number;
        };
      }
    ) => {
      const existing = await prisma.taskTypeFlow.findUnique({
        where: { id: args.id },
      });

      if (!existing) {
        throw new GraphQLError(`流程 ID ${args.id} 不存在`);
      }

      const flow = await prisma.taskTypeFlow.update({
        where: { id: args.id },
        data: {
          label: args.input.label,
          condition: args.input.condition !== undefined ? JSON.parse(JSON.stringify(args.input.condition)) : undefined,
          order: args.input.order,
        },
        include: {
          fromTaskType: true,
          toTaskType: true,
        },
      });

      return formatFlow(flow);
    },

    // 刪除流程
    deleteTaskTypeFlow: async (_: unknown, args: { id: number }) => {
      const existing = await prisma.taskTypeFlow.findUnique({
        where: { id: args.id },
      });

      if (!existing) {
        throw new GraphQLError(`流程 ID ${args.id} 不存在`);
      }

      await prisma.taskTypeFlow.delete({
        where: { id: args.id },
      });

      return true;
    },

    // 批量保存工作流程（用於流程編輯器）
    saveWorkflow: async (
      _: unknown,
      args: {
        input: {
          nodes: Array<{ id: number; positionX: number; positionY: number }>;
          flows: Array<{
            fromTaskTypeId: number;
            toTaskTypeId: number;
            label?: string;
            condition?: FlowCondition;
            order?: number;
          }>;
          deletedFlowIds?: number[];
        };
      },
      context: { user?: { id: string; role: string } }
    ) => {
      const { nodes, flows, deletedFlowIds } = args.input;

      // 使用事務處理
      await prisma.$transaction(async (tx) => {
        // 1. 刪除被移除的流程
        if (deletedFlowIds && deletedFlowIds.length > 0) {
          await tx.taskTypeFlow.deleteMany({
            where: { id: { in: deletedFlowIds } },
          });
        }

        // 2. 更新節點位置
        for (const node of nodes) {
          await tx.taskType.update({
            where: { id: node.id },
            data: {
              positionX: node.positionX,
              positionY: node.positionY,
            },
          });
        }

        // 3. 刪除所有現有流程並重新創建（簡化處理）
        // 獲取所有涉及的來源任務類型
        const fromIds = [...new Set(flows.map((f) => f.fromTaskTypeId))];
        if (fromIds.length > 0) {
          await tx.taskTypeFlow.deleteMany({
            where: { fromTaskTypeId: { in: fromIds } },
          });
        }

        // 4. 創建新流程
        if (flows.length > 0) {
          await tx.taskTypeFlow.createMany({
            data: flows.map((f, index) => ({
              fromTaskTypeId: f.fromTaskTypeId,
              toTaskTypeId: f.toTaskTypeId,
              label: f.label,
              condition: f.condition ? JSON.parse(JSON.stringify(f.condition)) : undefined,
              order: f.order ?? index,
            })),
          });
        }
      });

      // 記錄活動日誌
      if (context.user) {
        await prisma.activityLog.create({
          data: {
            userId: context.user.id,
            action: "update",
            entity: "workflow",
            entityId: "all",
            details: {
              nodesUpdated: nodes.length,
              flowsCreated: flows.length,
              flowsDeleted: deletedFlowIds?.length || 0,
            },
          },
        });
      }

      return true;
    },
  },
};
