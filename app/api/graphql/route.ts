import { createSchema, createYoga } from "graphql-yoga";
import { readdirSync, readFileSync } from "fs";
import path from "path";
import resolvers from "../../../graphql/resolvers";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getToken } from "next-auth/jwt";
import { createDataLoaders } from "../../../graphql/dataloaders";
import { prisma } from "../../../graphql/prismaClient";
import { useResponseCache } from "@graphql-yoga/plugin-response-cache";

// =====================================================
// 速率限制實現（記憶體版，適合單伺服器環境）
// =====================================================
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// 定期清理過期的速率限制記錄（每 5 分鐘）
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

// 速率限制配置
const RATE_LIMIT_CONFIG = {
  windowMs: 60 * 1000, // 1 分鐘窗口
  maxRequests: 100,     // 每分鐘最多 100 個請求
  maxMutations: 20,     // 每分鐘最多 20 個 mutation
};

// 獲取客戶端 IP
function getClientIP(request: any): string {
  const ip =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.ip ||
    request.connection?.remoteAddress ||
    '127.0.0.1';

  return ip;
}

function checkRateLimit(clientIP: string, isMutation: boolean): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const key = `${clientIP}:${isMutation ? 'mutation' : 'query'}`;
  const limit = isMutation ? RATE_LIMIT_CONFIG.maxMutations : RATE_LIMIT_CONFIG.maxRequests;

  let entry = rateLimitStore.get(key);

  // 如果沒有記錄或已過期，創建新記錄
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 1,
      resetTime: now + RATE_LIMIT_CONFIG.windowMs,
    };
    rateLimitStore.set(key, entry);
    return { allowed: true, remaining: limit - 1, resetIn: RATE_LIMIT_CONFIG.windowMs };
  }

  // 增加計數
  entry.count++;

  // 檢查是否超過限制
  if (entry.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: entry.resetTime - now
    };
  }

  return {
    allowed: true,
    remaining: limit - entry.count,
    resetIn: entry.resetTime - now
  };
}


// 權限包裝器 - Token 驗證
const withAuth = (resolvers: any) => {
  const wrappedResolvers = { ...resolvers };

  // 遍歷所有 Mutation 解析器
  if (resolvers.Mutation) {
    wrappedResolvers.Mutation = Object.keys(resolvers.Mutation).reduce(
      (acc: any, key: string) => {
        // 為每個 Mutation 添加 Token 驗證檢查
        acc[key] = async (parent: any, args: any, context: any, info: any) => {
          // 檢查 Token 驗證
          if (!context.isAuthenticated) {
            throw new Error(
              "驗證失敗：需要有效的 Authorization Bearer Token 才能執行修改操作"
            );
          }

          return resolvers.Mutation[key](parent, args, context, info);
        };
        return acc;
      },
      {}
    );
  }

  return wrappedResolvers;
};

// 定义 schemas 目录路径
const schemasDir = path.join(process.cwd(), "graphql/schemas");

// 动态读取所有 .graphql 文件并合并内容
const typeDefs = readdirSync(schemasDir)
  .filter((file: string) => file.endsWith(".graphql"))
  .map((file: string) => readFileSync(path.join(schemasDir, file), "utf-8"))
  .join("\n");

// GraphQL 效能追蹤 Plugin
const performancePlugin = {
  onExecute({ args }: { args: { document?: { definitions?: Array<{ name?: { value?: string } }> } } }) {
    const startTime = Date.now();
    const operationName = args.document?.definitions?.[0]?.['name']?.value || 'unknown';

    return {
      onExecuteDone({ result }: { result: { errors?: unknown[] } }) {
        const duration = Date.now() - startTime;

        // 記錄慢查詢（> 200ms）
        if (duration > 200) {
          console.warn(
            `🐌 GraphQL 慢查詢 [${duration}ms]\n` +
            `操作: ${operationName}\n` +
            `錯誤: ${result.errors ? result.errors.length : 0}`
          );
        }

        // 開發環境顯示所有查詢（可選）
        if (process.env.NODE_ENV === 'development' && process.env.DEBUG_GRAPHQL === 'true') {
          console.log(`⚡ GraphQL [${duration}ms]: ${operationName}`);
        }
      },
    };
  },
};

// 速率限制 Plugin
const rateLimitPlugin = {
  onRequest({ request, fetchAPI }: { request: Request; fetchAPI: any }) {
    const clientIP =
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-real-ip') ||
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      '127.0.0.1';

    // 對所有請求進行基礎速率限制檢查
    const rateLimit = checkRateLimit(clientIP, false);
    if (!rateLimit.allowed) {
      return new fetchAPI.Response(
        JSON.stringify({
          errors: [{
            message: `請求過於頻繁，請在 ${Math.ceil(rateLimit.resetIn / 1000)} 秒後重試`,
            extensions: {
              code: 'RATE_LIMITED',
              resetIn: rateLimit.resetIn,
            },
          }],
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil(rateLimit.resetIn / 1000).toString(),
            'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          },
        }
      );
    }
  },
};

// 🔒 Introspection 防護 Plugin（生產環境禁用 schema 查詢）
// 使用 onExecute hook 來檢查已解析的 GraphQL 文檔，更加可靠
const introspectionPlugin = {
  onExecute({ args }: { args: { document?: any } }) {
    // 只在生產環境禁用 introspection 查詢
    if (process.env.NODE_ENV !== 'production') {
      return;
    }

    const document = args.document;
    if (!document?.definitions) {
      return;
    }

    // 遍歷所有操作定義，檢查是否有 introspection 查詢
    for (const definition of document.definitions) {
      if (definition.kind === 'OperationDefinition' && definition.selectionSet?.selections) {
        for (const selection of definition.selectionSet.selections) {
          if (selection.kind === 'Field') {
            const fieldName = selection.name?.value;
            // 只檢查頂層的 __schema 和 __type 查詢
            if (fieldName === '__schema' || fieldName === '__type') {
              throw new Error('Introspection 查詢在生產環境已被禁用');
            }
          }
        }
      }
    }
  },
};

// 創建 Yoga 實例
const yoga = createYoga({
  schema: createSchema({
    typeDefs,
    resolvers: withAuth(resolvers),
  }),
  // 添加 GraphQL 相關配置
  graphqlEndpoint: "/api/graphql",
  fetchAPI: { Response: NextResponse },
  // 顯示完整的錯誤信息（不隱藏）
  maskedErrors: false,
  plugins: [
    performancePlugin,
    rateLimitPlugin,
    introspectionPlugin,
    // 響應快取 - 優化：根據操作類型調整 TTL
    // eslint-disable-next-line react-hooks/rules-of-hooks -- useResponseCache is not a React hook, it's a GraphQL Yoga plugin factory
    useResponseCache({
      // 根據用戶認證狀態區分快取，避免未授權錯誤被快取給認證用戶
      session: (request) => {
        // 檢查是否有 session cookie，有則返回 'authenticated'，否則返回 null
        const cookie = request.headers.get('cookie') || '';
        const hasSession = cookie.includes('next-auth.session-token') ||
                          cookie.includes('__Secure-next-auth.session-token');
        return hasSession ? 'authenticated' : null;
      },
      ttl: 30 * 1000, // 預設 30 秒快取
      // 根據操作名稱動態設置 TTL
      ttlPerSchemaCoordinate: {
        // 靜態資料：長快取（5 分鐘）
        'Query.activeNavigations': 5 * 60 * 1000,
        'Query.navigations': 5 * 60 * 1000,
        'Query.staffList': 5 * 60 * 1000,
        'Query.contractTemplates': 3 * 60 * 1000,
        'Query.formTemplates': 3 * 60 * 1000,
        // 任務類型：中長快取（5 分鐘）- 變動不頻繁
        'Query.taskTypes': 5 * 60 * 1000,
        // 統計資料：不快取（需要認證）
        'Query.formStats': 0,
        'Query.dashboardData': 0,
        'Query.adminTaskStats': 0,
        'Query.adminTaskStatsByType': 0,
        // 動態列表：不快取（需要認證且即時更新）
        'Query.users': 0,
        'Query.formSubmissions': 0,
        'Query.contracts': 0,
        'Query.manpowerRequests': 0,
        'Query.adminTasks': 0,
        // 需要認證的管理操作：不快取
        'Query.adminsWithAssignments': 0,
        'Query.myAssignedTaskTypes': 0,
        // 待處理任務提醒：不快取（需要即時）
        'Query.myPendingTaskReminders': 0,
        'Query.checkPendingReminders': 0,
        // 維護模式：不快取（需要即時生效）
        'Query.maintenanceMode': 0,
        // 全局分配設定：不快取（需要即時更新）
        'Query.taskTypeDefaultAssignments': 0,
        'Query.taskTypeDefaultAssignmentsByType': 0,
        'Query.allTaskTypeAssignmentSummaries': 0,
        // 案件分配相關：不快取
        'Query.allUserAssignmentSummaries': 0,
        'Query.assignableUsers': 0,
      },
      includeExtensionMetadata: process.env.NODE_ENV === 'development',
    }),
  ],
  async context({ request }) {
    let isAuthenticated = false;
    let clientIP = "unknown";
    let user = null;

    try {
      // 獲取客戶端 IP
      clientIP = getClientIP(request);

      // 調試：記錄 cookie
      const cookieHeader = request.headers.get('cookie') || '';
      console.log(`[GraphQL] Cookie length: ${cookieHeader.length}, Has session: ${cookieHeader.includes('next-auth')}`);

      // 優先從 NextAuth JWT cookie 獲取用戶資訊
      try {
        const token = await getToken({
          req: request as any,
          secret: process.env.NEXTAUTH_SECRET
        });

        console.log(`[GraphQL] Token: ${token ? JSON.stringify({ id: token.sub || token.id, role: token.role }) : 'null'}`);

        if (token) {
          isAuthenticated = true;
          const userId = token.sub || token.id;

          // 從數據庫獲取最新的用戶資訊和權限（確保權限變更即時生效）
          const dbUser = await prisma.user.findUnique({
            where: { id: userId as string },
            select: {
              id: true,
              role: true,
              email: true,
              name: true,
              customPermissions: true,
            },
          });

          if (dbUser) {
            user = {
              id: dbUser.id,
              role: dbUser.role,
              email: dbUser.email,
              name: dbUser.name,
              customPermissions: dbUser.customPermissions,
            };
          } else {
            // 如果數據庫找不到用戶，使用 token 中的基本信息
            user = {
              id: userId,
              role: token.role,
              email: token.email,
            };
          }
        }
      } catch (error) {
        console.error("[GraphQL] Token error:", error);
      }

      // 如果沒有 NextAuth session，檢查 Authorization header（向後兼容）
      if (!isAuthenticated) {
        const authHeader = request.headers.get("Authorization");
        if (authHeader && authHeader.startsWith("Bearer ")) {
          const token = authHeader.substring(7);
          try {
            const decoded: any = jwt.verify(token, process.env.NEXTAUTH_SECRET || "");
            isAuthenticated = true;
            user = {
              id: decoded.sub || decoded.id,
              role: decoded.role,
              email: decoded.email,
            };
          } catch (error) {
            if (process.env.NODE_ENV === 'development') {
              console.error("Bearer token 驗證失敗:", error);
            }
          }
        }
      }

      // 僅在開發環境記錄詳細資訊
      if (process.env.NODE_ENV === 'development') {
        console.log(`📍 IP: ${clientIP} | 認證: ${isAuthenticated ? '✅' : '❌'}`);
      }

    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("驗證錯誤:", error);
      }
    }

    // 為每個請求創建新的 DataLoaders（避免跨請求快取）
    const loaders = createDataLoaders(prisma);

    return {
      isAuthenticated,
      clientIP,
      user,
      loaders,
    };
  },
});

// 處理所有支持的 HTTP 方法
export async function GET(request: Request) {
  return yoga.fetch(request);
}

export async function POST(request: Request) {
  return yoga.fetch(request);
}

export async function OPTIONS(request: Request) {
  return yoga.fetch(request);
}
