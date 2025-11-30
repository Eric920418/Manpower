import type { ContentBlock, Prisma } from "@prisma/client";
import { prisma } from "./prismaClient";
import { JSONScalar } from "./utils/jsonScalar";
import { getDefaultPayload, type BlockKey } from "./utils/defaults";
import { userResolvers } from "./resolvers/userResolvers";
import { formResolvers } from "./resolvers/formResolvers";
import { navigationResolvers } from "./resolvers/navigationResolvers";
import { contractResolvers } from "./resolvers/contractResolvers";
import { manpowerRequestResolvers } from "./resolvers/manpowerRequestResolvers";

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

const createMutationResolver = (key: BlockKey) => async (
  _: unknown,
  { input }: { input?: Record<string, unknown> | null }
) => {
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
  // 用戶管理 queries
  ...userResolvers.Query,
  // 表單管理 queries
  ...formResolvers.Query,
  // 導航管理 queries
  ...navigationResolvers.Query,
  // 合約管理 queries
  ...contractResolvers.Query,
  // 人力需求管理 queries
  ...manpowerRequestResolvers.Query,
};

const Mutation = {
  updateHomePage: createMutationResolver("homePage"),
  updateApplicationProcessPage: createMutationResolver("applicationProcessPage"),
  updateWorkersPage: createMutationResolver("workersPage"),
  updateFaqPage: createMutationResolver("faqPage"),
  updateNewsPage: createMutationResolver("newsPage"),
  updateStaffPage: createMutationResolver("staffPage"),
  updateFranchisePage: createMutationResolver("franchisePage"),
  // 用戶管理 mutations
  ...userResolvers.Mutation,
  // 表單管理 mutations
  ...formResolvers.Mutation,
  // 導航管理 mutations
  ...navigationResolvers.Mutation,
  // 合約管理 mutations
  ...contractResolvers.Mutation,
  // 人力需求管理 mutations
  ...manpowerRequestResolvers.Mutation,
};

const resolvers = {
  JSON: JSONScalar,
  Query,
  Mutation,
};

export default resolvers;
