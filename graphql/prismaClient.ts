import { PrismaClient } from "@prisma/client";

// Reuse a single Prisma client instance across hot reloads in development.
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// 創建 Prisma Client（生產環境使用基本配置）
export const prisma = globalThis.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['error', 'warn']
    : ['error'],
});

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}
