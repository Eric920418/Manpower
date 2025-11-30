import { Session } from "next-auth";

/**
 * 向 GraphQL API 發送請求的通用函數
 * @param query GraphQL 查詢或修改操作
 * @param variables 查詢變量
 * @param session 用戶 session (僅修改操作需要)
 * @returns
 */
export async function graphqlRequest<T>(
  query: string,
  variables?: Record<string, any>,
  session?: Session | null
): Promise<T & { errors?: unknown }> {
  const isMutation = query.trim().toLowerCase().startsWith("mutation");

  // 準備請求頭
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  // 如果是修改操作但沒有 session，發出警告
  if (isMutation && !session) {
    console.warn("嘗試執行修改操作但未提供 session");
  }

  try {
    const response = await fetch("/api/graphql", {
      method: "POST",
      headers,
      credentials: "include", // ✅ 重要：確保發送 NextAuth cookie
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed with status ${response.status}`);
    }

    const result = await response.json();

    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    return result.data as T & { errors?: unknown };
  } catch (error) {
    console.error("GraphQL request error:", error);
    throw error;
  }
}
