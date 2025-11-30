"use client";
import { useEffect, useState, useCallback } from 'react';

interface StaffMember {
  id: string;
  name: string;
}

// 快取變數（模組級別）
let staffListCache: StaffMember[] | null = null;
let cacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 分鐘快取

/**
 * useStaffList Hook - 帶快取的業務人員列表
 *
 * 特點：
 * - 5 分鐘內的重複請求直接使用快取
 * - 自動處理載入狀態和錯誤
 * - 提供手動刷新功能
 */
export function useStaffList() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStaffList = useCallback(async (forceRefresh = false) => {
    const now = Date.now();

    // 如果快取有效且不強制刷新，直接使用快取
    if (!forceRefresh && staffListCache && now - cacheTime < CACHE_DURATION) {
      setStaffList(staffListCache);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `query GetStaffList { staffList { id name } }`,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const result = await response.json();

      if (result.errors) {
        throw new Error(result.errors[0]?.message || '查詢失敗');
      }

      const data = result.data?.staffList || [];

      // 更新快取
      staffListCache = data;
      cacheTime = now;

      setStaffList(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : '載入業務人員列表失敗';
      setError(message);
      console.error('useStaffList error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始載入
  useEffect(() => {
    fetchStaffList();
  }, [fetchStaffList]);

  // 手動刷新（強制重新載入）
  const refresh = useCallback(() => {
    fetchStaffList(true);
  }, [fetchStaffList]);

  return {
    staffList,
    loading,
    error,
    refresh,
  };
}

/**
 * 清除快取（用於登出或需要重新載入的場景）
 */
export function clearStaffListCache() {
  staffListCache = null;
  cacheTime = 0;
}
