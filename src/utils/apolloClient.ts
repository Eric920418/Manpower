import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { persistCache, LocalStorageWrapper } from 'apollo3-cache-persist';

// HTTP 連結
const httpLink = createHttpLink({
  uri: '/api/graphql',
});

// 認證連結（添加 token 到請求頭）
const authLink = setContext((_, { headers }) => {
  return {
    headers: {
      ...headers,
    }
  };
});

// 錯誤處理連結
const errorLink = onError(({ graphQLErrors, networkError, operation }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path, extensions }) => {
      // 處理速率限制錯誤
      if (extensions?.code === 'RATE_LIMITED') {
        console.warn(`[Rate Limited] ${message}`);
        return;
      }
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}, Operation: ${operation.operationName}`
      );
    });
  }
  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
  }
});

// 分頁列表合併函數（用於實現無限滾動）
function paginatedListMerge(existing: any, incoming: any, { args }: any) {
  // 如果是第一頁或刷新，直接替換
  if (!args?.page || args.page === 1) {
    return incoming;
  }
  // 否則合併資料（用於無限滾動）
  if (existing && incoming) {
    return {
      ...incoming,
      // 假設列表資料在某個字段中（如 users, formSubmissions 等）
      ...(existing.users && incoming.users && {
        users: [...existing.users, ...incoming.users],
      }),
      ...(existing.formSubmissions && incoming.formSubmissions && {
        formSubmissions: [...existing.formSubmissions, ...incoming.formSubmissions],
      }),
    };
  }
  return incoming;
}

// 創建快取實例
const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        // 分頁列表：支援合併或覆蓋
        users: {
          keyArgs: ['filter'], // 根據 filter 區分快取
          merge(existing, incoming, options) {
            return paginatedListMerge(existing, incoming, options);
          },
        },
        formSubmissions: {
          keyArgs: ['filter', 'formType'],
          merge(existing, incoming, options) {
            return paginatedListMerge(existing, incoming, options);
          },
        },
        formTemplates: {
          keyArgs: false, // 不區分參數，統一快取
          merge: false,
        },
        contracts: {
          keyArgs: ['filter'],
          merge(existing, incoming, options) {
            return paginatedListMerge(existing, incoming, options);
          },
        },
        manpowerRequests: {
          keyArgs: ['filter', 'status'],
          merge(existing, incoming, options) {
            return paginatedListMerge(existing, incoming, options);
          },
        },
        // 導航資料：快取但不合併
        navigations: {
          merge: false,
        },
        activeNavigations: {
          merge: false,
        },
      },
    },
    // 為各種類型指定快取鍵
    User: {
      keyFields: ['id'],
    },
    FormSubmission: {
      keyFields: ['id'],
    },
    FormTemplate: {
      keyFields: ['id'],
    },
    Contract: {
      keyFields: ['id'],
    },
    ManpowerRequest: {
      keyFields: ['id'],
    },
    Navigation: {
      keyFields: ['id'],
    },
  },
});

// 快取持久化初始化狀態
let persistInitialized = false;

/**
 * 初始化快取持久化
 * 將 Apollo 快取保存到 localStorage，頁面重載後可恢復
 */
export async function initCachePersist(): Promise<void> {
  if (persistInitialized || typeof window === 'undefined') {
    return;
  }

  try {
    await persistCache({
      cache,
      storage: new LocalStorageWrapper(window.localStorage),
      key: 'apollo-cache-persist',
      maxSize: 1048576 * 2, // 2MB 限制，避免 localStorage 溢出
      debug: process.env.NODE_ENV === 'development',
    });
    persistInitialized = true;
    console.log('Apollo cache persistence initialized');
  } catch (error) {
    console.error('Failed to initialize cache persistence:', error);
  }
}

// 創建 Apollo Client 實例
export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache,
  defaultOptions: {
    watchQuery: {
      // 先顯示快取資料，然後在背景更新（最佳用戶體驗）
      fetchPolicy: 'cache-and-network',
      // 當快取過期時自動重新獲取
      nextFetchPolicy: 'cache-first',
      errorPolicy: 'all',
    },
    query: {
      // 優先使用快取，只在快取不存在時才發送請求
      fetchPolicy: 'cache-first',
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
  // 開發環境啟用 DevTools
  devtools: {
    enabled: process.env.NODE_ENV === 'development',
  },
});

// 在客戶端自動初始化快取持久化
if (typeof window !== 'undefined') {
  initCachePersist();
}
