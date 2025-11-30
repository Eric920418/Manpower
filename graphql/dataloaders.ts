/**
 * GraphQL DataLoaders - 解決 N+1 查詢問題
 *
 * DataLoader 會批量載入資料並快取結果，避免重複查詢
 */

import DataLoader from 'dataloader';
import { PrismaClient, User, AdminTask, ApprovalRecord } from '@prisma/client';

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
 * 創建 AdminTask DataLoader
 * 批量載入行政任務（通過 ID）
 */
export function createAdminTaskLoader(prisma: PrismaClient) {
  return new DataLoader<number, AdminTask | null>(async (taskIds) => {
    const tasks = await prisma.adminTask.findMany({
      where: {
        id: {
          in: [...taskIds],
        },
      },
    });

    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    return taskIds.map((id) => taskMap.get(id) || null);
  });
}

/**
 * 創建 ApprovalRecord DataLoader
 * 批量載入審批記錄（通過任務 ID）
 * 注意：這是一對多關係，返回陣列
 */
export function createApprovalRecordsByTaskLoader(prisma: PrismaClient) {
  return new DataLoader<number, ApprovalRecord[]>(async (taskIds) => {
    const records = await prisma.approvalRecord.findMany({
      where: {
        taskId: {
          in: [...taskIds],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 按 taskId 分組
    const recordMap = new Map<number, ApprovalRecord[]>();
    taskIds.forEach((id) => recordMap.set(id, []));
    records.forEach((record) => {
      const existing = recordMap.get(record.taskId) || [];
      existing.push(record);
      recordMap.set(record.taskId, existing);
    });

    return taskIds.map((id) => recordMap.get(id) || []);
  });
}

/**
 * 創建所有 DataLoaders
 * 每個請求都應該創建新的 DataLoader 實例（避免跨請求快取）
 */
export function createDataLoaders(prisma: PrismaClient) {
  return {
    userLoader: createUserLoader(prisma),
    adminTaskLoader: createAdminTaskLoader(prisma),
    approvalRecordsByTaskLoader: createApprovalRecordsByTaskLoader(prisma),
  };
}

export type DataLoaders = ReturnType<typeof createDataLoaders>;
