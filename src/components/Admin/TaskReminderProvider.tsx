"use client";

import React, { createContext, useContext, useEffect, useCallback, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/UI/Toast";

// 提醒類型
interface PendingReminder {
  id: number;
  userId: string;
  sourceTaskId: number;
  taskTypeId: number;
  taskTypeLabel: string;
  isCompleted: boolean;
  completedTaskId: number | null;
  lastRemindedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Context 類型
interface TaskReminderContextType {
  pendingReminders: PendingReminder[];
  refreshReminders: () => Promise<void>;
  createReminders: (sourceTaskId: number, reminders: Array<{ taskTypeId: number; taskTypeLabel: string }>) => Promise<void>;
  completeReminder: (reminderId: number, completedTaskId: number) => Promise<void>;
  dismissReminder: (reminderId: number) => Promise<void>;
}

const TaskReminderContext = createContext<TaskReminderContextType | null>(null);

// 提醒間隔（10分鐘）
const REMINDER_INTERVAL_MS = 10 * 60 * 1000;

export function TaskReminderProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const { addToast } = useToast();
  const router = useRouter();
  const [pendingReminders, setPendingReminders] = useState<PendingReminder[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasShownInitialReminder = useRef(false);

  // 檢查並顯示提醒
  const checkAndShowReminders = useCallback(async () => {
    if (status !== "authenticated") {
      console.log("[TaskReminder] 未登入，跳過檢查");
      return;
    }

    console.log("[TaskReminder] 開始檢查待處理提醒...");

    try {
      const query = `
        query {
          checkPendingReminders {
            id
            userId
            sourceTaskId
            taskTypeId
            taskTypeLabel
            isCompleted
            completedTaskId
            lastRemindedAt
            createdAt
            updatedAt
          }
        }
      `;

      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ query }),
      });

      const data = await res.json();
      console.log("[TaskReminder] API 回應:", data);

      if (data.errors) {
        console.error("[TaskReminder] 檢查提醒失敗:", data.errors);
        return;
      }

      const reminders: PendingReminder[] = data.data?.checkPendingReminders || [];
      console.log("[TaskReminder] 找到提醒數量:", reminders.length);

      if (reminders.length > 0) {
        // 更新提醒的最後顯示時間
        const ids = reminders.map((r) => r.id);
        await fetch("/api/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            query: `
              mutation UpdateReminderLastShown($ids: [Int!]!) {
                updateReminderLastShown(ids: $ids)
              }
            `,
            variables: { ids },
          }),
        });

        // 顯示 Toast
        console.log("[TaskReminder] 顯示 Toast 提醒...");
        reminders.forEach((reminder) => {
          console.log("[TaskReminder] 顯示提醒:", reminder.taskTypeLabel);
          addToast({
            type: "reminder",
            title: "待建立關聯任務",
            message: `您有一個「${reminder.taskTypeLabel}」任務尚未建立`,
            duration: 0, // 不自動關閉
            action: {
              label: "立即建立",
              onClick: () => {
                // 導航到行政事務頁面並傳遞參數
                router.push(`/admin/admin-tasks?createTask=${reminder.taskTypeId}&sourceTask=${reminder.sourceTaskId}&reminderId=${reminder.id}`);
              },
            },
          });
        });
      }
    } catch (error) {
      console.error("檢查提醒時發生錯誤:", error);
    }
  }, [status, addToast, router]);

  // 獲取所有待處理提醒（用於內部狀態管理）
  const refreshReminders = useCallback(async () => {
    if (status !== "authenticated") return;

    try {
      const query = `
        query {
          myPendingTaskReminders {
            id
            userId
            sourceTaskId
            taskTypeId
            taskTypeLabel
            isCompleted
            completedTaskId
            lastRemindedAt
            createdAt
            updatedAt
          }
        }
      `;

      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ query }),
      });

      const data = await res.json();

      if (data.errors) {
        console.error("獲取提醒失敗:", data.errors);
        return;
      }

      setPendingReminders(data.data.myPendingTaskReminders || []);
    } catch (error) {
      console.error("獲取提醒時發生錯誤:", error);
    }
  }, [status]);

  // 創建提醒（用於「稍後處理」）
  const createReminders = useCallback(async (
    sourceTaskId: number,
    reminders: Array<{ taskTypeId: number; taskTypeLabel: string }>
  ) => {
    console.log("[TaskReminder] createReminders 被調用，sourceTaskId:", sourceTaskId, "reminders:", reminders);

    if (status !== "authenticated") {
      console.log("[TaskReminder] createReminders: 未登入，跳過");
      return;
    }

    try {
      const mutation = `
        mutation CreatePendingTaskReminders($input: CreatePendingTaskRemindersInput!) {
          createPendingTaskReminders(input: $input) {
            id
            taskTypeLabel
          }
        }
      `;

      const requestBody = {
        query: mutation,
        variables: {
          input: {
            sourceTaskId,
            reminders,
          },
        },
      };
      console.log("[TaskReminder] createReminders 發送請求:", requestBody);

      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();
      console.log("[TaskReminder] createReminders API 回應:", data);

      if (data.errors) {
        console.error("[TaskReminder] 創建提醒失敗:", data.errors);
        return;
      }

      console.log("[TaskReminder] 提醒創建成功，刷新列表");
      // 刷新提醒列表
      await refreshReminders();
    } catch (error) {
      console.error("創建提醒時發生錯誤:", error);
    }
  }, [status, refreshReminders]);

  // 完成提醒
  const completeReminder = useCallback(async (reminderId: number, completedTaskId: number) => {
    if (status !== "authenticated") return;

    try {
      const mutation = `
        mutation CompletePendingTaskReminder($id: Int!, $completedTaskId: Int!) {
          completePendingTaskReminder(id: $id, completedTaskId: $completedTaskId) {
            id
            isCompleted
          }
        }
      `;

      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          query: mutation,
          variables: { id: reminderId, completedTaskId },
        }),
      });

      const data = await res.json();

      if (data.errors) {
        console.error("完成提醒失敗:", data.errors);
        return;
      }

      // 刷新提醒列表
      await refreshReminders();
    } catch (error) {
      console.error("完成提醒時發生錯誤:", error);
    }
  }, [status, refreshReminders]);

  // 忽略提醒
  const dismissReminder = useCallback(async (reminderId: number) => {
    if (status !== "authenticated") return;

    try {
      const mutation = `
        mutation DismissPendingTaskReminder($id: Int!) {
          dismissPendingTaskReminder(id: $id)
        }
      `;

      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          query: mutation,
          variables: { id: reminderId },
        }),
      });

      const data = await res.json();

      if (data.errors) {
        console.error("忽略提醒失敗:", data.errors);
        return;
      }

      // 刷新提醒列表
      await refreshReminders();
    } catch (error) {
      console.error("忽略提醒時發生錯誤:", error);
    }
  }, [status, refreshReminders]);

  // 登入時檢查提醒
  useEffect(() => {
    if (status === "authenticated" && !hasShownInitialReminder.current) {
      hasShownInitialReminder.current = true;
      // 延遲一下再顯示，讓頁面先載入完成
      const timer = setTimeout(() => {
        checkAndShowReminders();
        refreshReminders();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [status, checkAndShowReminders, refreshReminders]);

  // 每 10 分鐘檢查一次
  useEffect(() => {
    if (status === "authenticated") {
      intervalRef.current = setInterval(checkAndShowReminders, REMINDER_INTERVAL_MS);
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [status, checkAndShowReminders]);

  return (
    <TaskReminderContext.Provider
      value={{
        pendingReminders,
        refreshReminders,
        createReminders,
        completeReminder,
        dismissReminder,
      }}
    >
      {children}
    </TaskReminderContext.Provider>
  );
}

// Hook
export function useTaskReminder() {
  const context = useContext(TaskReminderContext);
  if (!context) {
    throw new Error("useTaskReminder must be used within a TaskReminderProvider");
  }
  return context;
}
