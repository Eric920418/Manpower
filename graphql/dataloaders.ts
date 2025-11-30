/**
 * GraphQL DataLoaders - 解決 N+1 查詢問題
 *
 * DataLoader 會批量載入資料並快取結果，避免重複查詢
 */

import DataLoader from 'dataloader';
import { PrismaClient, User, FormTemplate, Contract, Signature } from '@prisma/client';

/**
 * 創建 User DataLoader
 * 批量載入用戶資料（通過 ID）
 */
export function createUserLoader(prisma: PrismaClient) {
  return new DataLoader<string, User | null>(async (userIds) => {
    const users = await prisma.user.findMany({
      where: {
        id: {
          in: [...userIds],
        },
      },
    });

    // 建立 ID -> User 的映射
    const userMap = new Map(users.map((user) => [user.id, user]));

    // 按照請求的順序返回結果（DataLoader 要求）
    return userIds.map((id) => userMap.get(id) || null);
  });
}

/**
 * 創建 FormTemplate DataLoader
 * 批量載入表單模板（通過 ID）
 */
export function createFormTemplateLoader(prisma: PrismaClient) {
  return new DataLoader<number, FormTemplate | null>(async (templateIds) => {
    const templates = await prisma.formTemplate.findMany({
      where: {
        id: {
          in: [...templateIds],
        },
      },
    });

    const templateMap = new Map(templates.map((t) => [t.id, t]));
    return templateIds.map((id) => templateMap.get(id) || null);
  });
}

/**
 * 創建 Contract DataLoader
 * 批量載入合約資料（通過 ID）
 */
export function createContractLoader(prisma: PrismaClient) {
  return new DataLoader<number, Contract | null>(async (contractIds) => {
    const contracts = await prisma.contract.findMany({
      where: {
        id: {
          in: [...contractIds],
        },
      },
    });

    const contractMap = new Map(contracts.map((c) => [c.id, c]));
    return contractIds.map((id) => contractMap.get(id) || null);
  });
}

/**
 * 創建 Signature DataLoader
 * 批量載入簽名資料（通過合約 ID）
 * 注意：這是一對多關係，返回陣列
 */
export function createSignaturesByContractLoader(prisma: PrismaClient) {
  return new DataLoader<number, Signature[]>(async (contractIds) => {
    const signatures = await prisma.signature.findMany({
      where: {
        contractId: {
          in: [...contractIds],
        },
      },
    });

    // 按 contractId 分組
    const signatureMap = new Map<number, Signature[]>();
    contractIds.forEach((id) => signatureMap.set(id, []));
    signatures.forEach((sig) => {
      const existing = signatureMap.get(sig.contractId) || [];
      existing.push(sig);
      signatureMap.set(sig.contractId, existing);
    });

    return contractIds.map((id) => signatureMap.get(id) || []);
  });
}

/**
 * 創建所有 DataLoaders
 * 每個請求都應該創建新的 DataLoader 實例（避免跨請求快取）
 */
export function createDataLoaders(prisma: PrismaClient) {
  return {
    userLoader: createUserLoader(prisma),
    formTemplateLoader: createFormTemplateLoader(prisma),
    contractLoader: createContractLoader(prisma),
    signaturesByContractLoader: createSignaturesByContractLoader(prisma),
  };
}

export type DataLoaders = ReturnType<typeof createDataLoaders>;
