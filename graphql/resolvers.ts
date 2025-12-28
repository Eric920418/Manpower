import type { ContentBlock, Prisma, Role } from "@prisma/client";
import { prisma } from "./prismaClient";
import { JSONScalar } from "./utils/jsonScalar";
import { getDefaultPayload, type BlockKey } from "./utils/defaults";
import { userResolvers } from "./resolvers/userResolvers";
import { navigationResolvers } from "./resolvers/navigationResolvers";
import { manpowerRequestResolvers } from "./resolvers/manpowerRequestResolvers";
import { adminTaskResolvers } from "./resolvers/adminTaskResolvers";
import { adminTaskAssignmentResolvers } from "./resolvers/adminTaskAssignmentResolvers";
import { taskTypeDefaultAssignmentResolvers } from "./resolvers/taskTypeDefaultAssignmentResolvers";
import { taskTypeResolvers } from "./resolvers/taskTypeResolvers";
import { taskTypeFlowResolvers } from "./resolvers/taskTypeFlowResolvers";
import { dashboardResolvers } from "./resolvers/dashboardResolvers";
import { activityLogResolvers } from "./resolvers/activityLogResolvers";
import { pendingTaskReminderResolvers } from "./resolvers/pendingTaskReminderResolvers";
import { hasPermissionWithCustom, type CustomPermissions } from "@/lib/permissions";

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const deepClone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const deepMerge = (
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> => {
  const result = deepClone(target);

  for (const [key, value] of Object.entries(source)) {
    if (isPlainObject(value) && isPlainObject(result[key])) {
      result[key] = deepMerge(result[key] as Record<string, unknown>, value);
    } else {
      result[key] = value;
    }
  }

  return result;
};

const ensureBlock = async (key: BlockKey): Promise<ContentBlock> => {
  return prisma.contentBlock.upsert({
    where: { key },
    create: { key, payload: getDefaultPayload(key) },
    update: {},
  });
};

const normalizePayload = (key: BlockKey, payload: unknown) => {
  const base = getDefaultPayload(key) as Record<string, unknown>;
  const source = isPlainObject(payload) ? payload : {};
  return deepMerge(base, source);
};

const toResponse = (key: BlockKey, block: ContentBlock) => {
  const payload = normalizePayload(key, block.payload);
  return { id: block.id, ...payload };
};

const createQueryResolver = (key: BlockKey) => async () => {
  const block = await ensureBlock(key);
  return [toResponse(key, block)];
};

// 頁面名稱對照表
const pageLabels: Record<BlockKey, string> = {
  homePage: "首頁",
  applicationProcessPage: "申請流程頁",
  workersPage: "移工列表頁",
  faqPage: "常見問題頁",
  newsPage: "最新消息頁",
  staffPage: "業務人員頁",
  franchisePage: "創業加盟頁",
  floatingLinks: "懸浮連結",
};

interface MutationContext {
  user?: {
    id: string;
    role: string;
    customPermissions?: CustomPermissions | null;
  };
}

const createMutationResolver = (key: BlockKey) => async (
  _: unknown,
  { input }: { input?: Record<string, unknown> | null },
  context: MutationContext
) => {
  // 檢查 web_content:update 權限
  if (!context.user) {
    throw new Error("未登入");
  }

  const hasUpdatePermission = hasPermissionWithCustom(
    context.user.role as Role,
    'web_content:update',
    context.user.customPermissions
  );

  if (!hasUpdatePermission) {
    throw new Error("權限不足：需要「編輯網頁內容」權限才能進行此操作");
  }

  if (!input || typeof input !== "object") {
    throw new Error("Invalid input payload");
  }

  const block = await ensureBlock(key);
  const existingPayload = normalizePayload(key, block.payload);
  const nextPayload = deepMerge(existingPayload, input as Record<string, unknown>);

  const updated = await prisma.contentBlock.update({
    where: { id: block.id },
    data: { payload: nextPayload as Prisma.InputJsonValue },
  });

  // 記錄活動日誌
  if (context.user) {
    await prisma.activityLog.create({
      data: {
        userId: context.user.id,
        action: "update",
        entity: "page",
        entityId: key,
        details: {
          pageName: pageLabels[key] || key,
          changedFields: Object.keys(input),
        },
      },
    });
  }

  return toResponse(key, updated);
};

const Query = {
  homePage: createQueryResolver("homePage"),
  applicationProcessPage: createQueryResolver("applicationProcessPage"),
  workersPage: createQueryResolver("workersPage"),
  faqPage: createQueryResolver("faqPage"),
  newsPage: createQueryResolver("newsPage"),
  staffPage: createQueryResolver("staffPage"),
  franchisePage: createQueryResolver("franchisePage"),
  floatingLinks: createQueryResolver("floatingLinks"),
  // 用戶管理 queries
  ...userResolvers.Query,
  // 導航管理 queries
  ...navigationResolvers.Query,
  // 人力需求管理 queries
  ...manpowerRequestResolvers.Query,
  // 任務類型 queries
  ...taskTypeResolvers.Query,
  // 任務類型流程 queries
  ...taskTypeFlowResolvers.Query,
  // 行政事務簽核 queries
  ...adminTaskResolvers.Query,
  // 案件分配 queries
  ...adminTaskAssignmentResolvers.Query,
  // 全局分配設定 queries
  ...taskTypeDefaultAssignmentResolvers.Query,
  // Dashboard 統計 queries
  ...dashboardResolvers.Query,
  // 活動日誌 queries
  ...activityLogResolvers.Query,
  // 待處理任務提醒 queries
  ...pendingTaskReminderResolvers.Query,
};

const Mutation = {
  updateHomePage: createMutationResolver("homePage"),
  updateApplicationProcessPage: createMutationResolver("applicationProcessPage"),
  updateWorkersPage: createMutationResolver("workersPage"),
  updateFaqPage: createMutationResolver("faqPage"),
  updateNewsPage: createMutationResolver("newsPage"),
  updateStaffPage: createMutationResolver("staffPage"),
  updateFranchisePage: createMutationResolver("franchisePage"),
  updateFloatingLinks: createMutationResolver("floatingLinks"),
  // 用戶管理 mutations
  ...userResolvers.Mutation,
  // 導航管理 mutations
  ...navigationResolvers.Mutation,
  // 人力需求管理 mutations
  ...manpowerRequestResolvers.Mutation,
  // 任務類型 mutations
  ...taskTypeResolvers.Mutation,
  // 任務類型流程 mutations
  ...taskTypeFlowResolvers.Mutation,
  // 行政事務簽核 mutations
  ...adminTaskResolvers.Mutation,
  // 案件分配 mutations
  ...adminTaskAssignmentResolvers.Mutation,
  // 全局分配設定 mutations
  ...taskTypeDefaultAssignmentResolvers.Mutation,
  // 待處理任務提醒 mutations
  ...pendingTaskReminderResolvers.Mutation,
};

const resolvers = {
  JSON: JSONScalar,
  Query,
  Mutation,
};

export default resolvers;
