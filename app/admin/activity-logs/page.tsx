"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { useSession } from "next-auth/react";
import AdminLayout from "@/components/Admin/AdminLayout";
import { usePermission } from "@/hooks/usePermission";
import { exportToExcel, formatDateForExcel } from "@/lib/exportExcel";

// 活動日誌
interface ActivityLog {
  id: number;
  userId: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
  createdAt: string;
}

// 活動統計
interface ActivityStats {
  totalToday: number;
  totalThisWeek: number;
  totalThisMonth: number;
  byAction: { action: string; count: number }[];
  byEntity: { entity: string; count: number }[];
}

// 用戶列表（用於篩選）
interface User {
  id: string;
  name: string | null;
  email: string;
}

// 操作類型中文對照
const actionLabels: Record<string, string> = {
  login: "登入",
  login_failed: "登入失敗",
  logout: "登出",
  create: "新增",
  update: "更新",
  delete: "刪除",
  restore: "復原",
  approve: "審批通過",
  reject: "退回",
  pending_documents: "待補件",
  request_revision: "要求修改",
  resubmit: "重新送出",
  submit_for_review: "送出複審",
  upload: "上傳",
  upload_attachment: "上傳附件",
  delete_attachment: "刪除附件",
  update_status: "狀態變更",
  update_task_remarks: "更新任務備註",
  update_task_notes: "更新任務備註",
  assign_processor: "分配處理人",
  assign_approver: "分配審批人",
  toggle_status: "切換狀態",
  reset_password: "重置密碼",
  reorder: "排序調整",
  bulk_create: "批量新增",
  replace: "取代分配",
  set_assignments: "設定分配",
  update_permissions: "更新權限",
  apply_global_assignments: "套用預設分配",
  sync_global_assignment_batch: "同步預設分配",
  complete_check: "標記完成",
  complete_uncheck: "取消完成",
  review_check: "標記複審",
  review_uncheck: "取消複審",
};

// 實體類型中文對照
const entityLabels: Record<string, string> = {
  user: "用戶",
  admin_task: "行政任務",
  admin_task_attachment: "任務附件",
  task_type: "任務類型",
  task_assignment: "任務分配",
  page: "頁面內容",
  navigation: "導航選單",
  manpower_request: "人力需求",
  workflow: "工作流程",
  image: "圖片",
  file: "檔案",
  franchise: "加盟店",
};

// 角色中文對照
const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "超級管理員",
  ADMIN: "管理員",
  OWNER: "業主",
  STAFF: "業務人員",
};

// 將詳情轉換為白話文描述（只顯示行政任務的任務編號和備註）
const formatDetails = (action: string, entity: string, details: Record<string, unknown> | null): string => {
  if (!details) return "";

  // 只顯示行政任務的詳情
  if (entity !== "admin_task") return "";

  const parts: string[] = [];

  // 顯示任務編號
  if (details.taskNo) parts.push(`${details.taskNo}`);

  // 顯示備註內容（可能是 remarks, notes, 或 comment）
  if (details.remarks) parts.push(`${details.remarks}`);
  if (details.notes) parts.push(`${details.notes}`);
  if (details.comment) parts.push(`${details.comment}`);

  return parts.join(" | ");
};

// 狀態中文對照
const statusLabels: Record<string, string> = {
  PENDING: "待處理",
  PENDING_DOCUMENTS: "待補件",
  PENDING_REVIEW: "待複審",
  REVISION_REQUESTED: "要求修改",
  APPROVED: "已批准",
  REJECTED: "已退回",
  COMPLETED: "已完成",
  REVIEWED: "已複審",
};

// 判斷是否有可展開的詳情（行政任務的操作）
const hasExpandableDetails = (action: string, entity: string, details: Record<string, unknown> | null): boolean => {
  if (entity !== "admin_task") return false;
  if (!details) return false;

  // 刪除操作使用原有的 snapshot 邏輯
  if (action === "delete") return !!details.snapshot;

  // 更新操作：檢查是否有詳細的變更資訊
  if (action === "update") {
    return !!(details.basicInfoChanges || details.notesChange || details.payloadChanges);
  }

  // 狀態變更操作
  if (action === "update_status") {
    return !!(details.oldStatus || details.newStatus);
  }

  // 審批相關操作
  if (["approve", "reject", "pending_documents", "request_revision"].includes(action)) {
    return !!(details.action || details.comment || details.newStatus);
  }

  // 複審相關操作
  if (["submit_for_review", "review_approve", "review_reject"].includes(action)) {
    return !!(details.taskNo || details.action || details.comment);
  }

  // 完成確認和複審確認
  if (["complete_check", "complete_uncheck", "review_check", "review_uncheck"].includes(action)) {
    return !!(details.checked !== undefined || details.newStatus);
  }

  // 重新送出
  if (action === "resubmit") {
    return !!(details.previousStatus || details.newStatus);
  }

  // 分配操作
  if (["assign_processor", "assign_approver"].includes(action)) {
    return !!(details.processorId || details.approverId);
  }

  // 備註更新
  if (action === "update_task_remarks") {
    return !!details.remarks;
  }

  // 附件操作
  if (["upload_attachment", "delete_attachment"].includes(action)) {
    return !!details.filename;
  }

  return false;
};

// 格式化操作詳情（用於展開視窗）
interface ChangeDetail {
  label: string;
  oldValue?: string | null;
  newValue?: string | null;
  value?: string;
}

const formatActionDetails = (action: string, details: Record<string, unknown>): ChangeDetail[] => {
  const result: ChangeDetail[] = [];

  // 更新操作
  if (action === "update") {
    // 基本資訊變更
    const basicChanges = details.basicInfoChanges as Array<{
      field: string;
      fieldLabel: string;
      oldValue: string | null;
      newValue: string | null;
    }> | undefined;

    if (basicChanges && basicChanges.length > 0) {
      for (const change of basicChanges) {
        result.push({
          label: change.fieldLabel,
          oldValue: change.oldValue || "(空)",
          newValue: change.newValue || "(空)",
        });
      }
    }

    // notes 變更
    const notesChange = details.notesChange as { oldValue: string | null; newValue: string | null } | undefined;
    if (notesChange) {
      result.push({
        label: "內部備註",
        oldValue: notesChange.oldValue || "(空)",
        newValue: notesChange.newValue || "(空)",
      });
    }

    // payload 變更
    const payloadChanges = details.payloadChanges as Array<{
      field: string;
      oldValue: unknown;
      newValue: unknown;
    }> | undefined;

    if (payloadChanges && payloadChanges.length > 0) {
      for (const change of payloadChanges) {
        const formatValue = (val: unknown): string => {
          if (val === null || val === undefined || val === "") return "(空)";
          if (typeof val === "object") return JSON.stringify(val);
          return String(val);
        };
        result.push({
          label: `表單欄位: ${change.field}`,
          oldValue: formatValue(change.oldValue),
          newValue: formatValue(change.newValue),
        });
      }
    }
  }

  // 狀態變更
  if (action === "update_status") {
    const oldStatus = details.oldStatus as string | undefined;
    const newStatus = details.newStatus as string | undefined;
    if (oldStatus || newStatus) {
      result.push({
        label: "狀態變更",
        oldValue: statusLabels[oldStatus || ""] || oldStatus || "(空)",
        newValue: statusLabels[newStatus || ""] || newStatus || "(空)",
      });
    }
  }

  // 審批操作
  if (["approve", "reject", "pending_documents", "request_revision"].includes(action)) {
    if (details.newStatus) {
      result.push({
        label: "新狀態",
        value: statusLabels[details.newStatus as string] || (details.newStatus as string),
      });
    }
    if (details.comment) {
      result.push({
        label: "審批意見",
        value: details.comment as string,
      });
    }
  }

  // 完成確認和複審確認
  if (["complete_check", "complete_uncheck", "review_check", "review_uncheck"].includes(action)) {
    const checked = details.checked as boolean | undefined;
    if (checked !== undefined) {
      result.push({
        label: "操作",
        value: checked ? "打勾確認" : "取消確認",
      });
    }
    const hasReviewer = details.hasReviewer as boolean | undefined;
    if (hasReviewer !== undefined) {
      result.push({
        label: "有複審人",
        value: hasReviewer ? "是" : "否",
      });
    }
    if (details.newStatus) {
      result.push({
        label: "新狀態",
        value: statusLabels[details.newStatus as string] || (details.newStatus as string),
      });
    }
  }

  // 重新送出
  if (action === "resubmit") {
    if (details.previousStatus) {
      result.push({
        label: "原狀態",
        value: statusLabels[details.previousStatus as string] || (details.previousStatus as string),
      });
    }
    if (details.newStatus) {
      result.push({
        label: "新狀態",
        value: statusLabels[details.newStatus as string] || (details.newStatus as string),
      });
    }
  }

  // 備註更新
  if (action === "update_task_remarks") {
    if (details.remarks) {
      result.push({
        label: "備註內容",
        value: details.remarks as string,
      });
    }
  }

  // 附件操作
  if (["upload_attachment", "delete_attachment"].includes(action)) {
    if (details.filename) {
      result.push({
        label: "檔案名稱",
        value: details.filename as string,
      });
    }
    if (details.size) {
      const sizeInKB = Math.round((details.size as number) / 1024);
      result.push({
        label: "檔案大小",
        value: sizeInKB > 1024 ? `${(sizeInKB / 1024).toFixed(2)} MB` : `${sizeInKB} KB`,
      });
    }
  }

  // 複審相關操作
  if (["submit_for_review", "review_approve", "review_reject"].includes(action)) {
    if (details.comment) {
      result.push({
        label: "意見",
        value: details.comment as string,
      });
    }
  }

  return result;
};

export default function ActivityLogsPage() {
  const { data: session, status } = useSession();
  const { can } = usePermission();
  const permissionLoading = status === "loading";
  const hasAccess = !permissionLoading && can("system:logs");
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [exporting, setExporting] = useState(false);

  // 分頁
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  // 篩選條件
  const [filterUserId, setFilterUserId] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterEntity, setFilterEntity] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  // 展開詳情的日誌 ID
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  // 復原操作狀態
  const [restoringLogId, setRestoringLogId] = useState<number | null>(null);
  const [restoreMessage, setRestoreMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 載入用戶列表
  const fetchUsers = useCallback(async () => {
    try {
      const query = `
        query {
          users(page: 1, pageSize: 1000) {
            users {
              id
              name
              email
            }
          }
        }
      `;

      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ query }),
      });

      const json = await res.json();
      if (json.data?.users?.users) {
        setUsers(json.data.users.users);
      }
    } catch (err) {
      console.error("載入用戶列表失敗:", err);
    }
  }, []);

  // 載入活動統計
  const fetchStats = useCallback(async () => {
    try {
      const query = `
        query {
          activityStats {
            totalToday
            totalThisWeek
            totalThisMonth
            byAction {
              action
              count
            }
            byEntity {
              entity
              count
            }
          }
        }
      `;

      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ query }),
      });

      const json = await res.json();
      if (json.data?.activityStats) {
        setStats(json.data.activityStats);
      }
    } catch (err) {
      console.error("載入活動統計失敗:", err);
    }
  }, []);

  // 載入活動日誌
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const query = `
        query($page: Int, $pageSize: Int, $userId: String, $action: String, $entity: String, $startDate: String, $endDate: String, $search: String) {
          activityLogs(
            page: $page
            pageSize: $pageSize
            userId: $userId
            action: $action
            entity: $entity
            startDate: $startDate
            endDate: $endDate
            search: $search
          ) {
            items {
              id
              userId
              action
              entity
              entityId
              details
              ipAddress
              userAgent
              user {
                id
                name
                email
                role
              }
              createdAt
            }
            total
            page
            pageSize
          }
        }
      `;

      const variables = {
        page,
        pageSize,
        userId: filterUserId || undefined,
        action: filterAction || undefined,
        entity: filterEntity || undefined,
        startDate: filterStartDate || undefined,
        endDate: filterEndDate || undefined,
        search: filterSearch || undefined,
      };

      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ query, variables }),
      });

      const json = await res.json();

      if (json.errors) {
        throw new Error(json.errors[0]?.message || "查詢失敗");
      }

      if (json.data?.activityLogs) {
        setLogs(json.data.activityLogs.items);
        setTotal(json.data.activityLogs.total);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入失敗");
      console.error("載入活動日誌失敗:", err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filterUserId, filterAction, filterEntity, filterStartDate, filterEndDate, filterSearch]);

  // 初始載入（只執行一次）
  useEffect(() => {
    if (hasAccess && !initialized) {
      setInitialized(true);
      fetchUsers();
      fetchStats();
      fetchLogs();
    }
  }, [hasAccess, initialized, fetchUsers, fetchStats, fetchLogs]);

  // 當篩選條件變化時重新載入（排除初始載入）
  useEffect(() => {
    if (hasAccess && initialized) {
      fetchLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterUserId, filterAction, filterEntity, filterStartDate, filterEndDate, filterSearch]);

  // 重置篩選
  const handleResetFilter = () => {
    setFilterUserId("");
    setFilterAction("");
    setFilterEntity("");
    setFilterStartDate("");
    setFilterEndDate("");
    setFilterSearch("");
    setPage(1);
  };

  // 格式化時間
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // 復原刪除的項目
  const handleRestore = async (logId: number) => {
    if (!confirm("確定要復原這個被刪除的項目嗎？")) {
      return;
    }

    setRestoringLogId(logId);
    setRestoreMessage(null);

    try {
      const mutation = `
        mutation RestoreDeletedItem($logId: Int!) {
          restoreDeletedItem(logId: $logId) {
            success
            message
            restoredId
          }
        }
      `;

      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ query: mutation, variables: { logId } }),
      });

      const json = await res.json();

      if (json.errors) {
        throw new Error(json.errors[0]?.message || "復原失敗");
      }

      const result = json.data?.restoreDeletedItem;
      if (result?.success) {
        setRestoreMessage({ type: "success", text: result.message });
        // 重新載入日誌列表
        fetchLogs();
        fetchStats();
      } else {
        setRestoreMessage({ type: "error", text: result?.message || "復原失敗" });
      }
    } catch (err) {
      setRestoreMessage({
        type: "error",
        text: err instanceof Error ? err.message : "復原失敗"
      });
    } finally {
      setRestoringLogId(null);
      // 3秒後自動清除訊息
      setTimeout(() => setRestoreMessage(null), 5000);
    }
  };

  // 判斷是否可以復原
  const canRestore = (log: ActivityLog): boolean => {
    if (log.action !== "delete") return false;
    if (!log.details) return false;
    const details = log.details as Record<string, unknown>;
    return !!details.snapshot;
  };

  // 格式化快照詳情
  const formatSnapshotDetails = (entity: string, snapshot: Record<string, unknown>): { label: string; value: string }[] => {
    const details: { label: string; value: string }[] = [];

    switch (entity) {
      case "admin_task":
        if (snapshot.taskNo) details.push({ label: "任務編號", value: String(snapshot.taskNo) });
        if (snapshot.title) details.push({ label: "標題", value: String(snapshot.title) });
        if (snapshot.status) {
          const statusMap: Record<string, string> = {
            PENDING: "待處理",
            PENDING_DOCUMENTS: "待補件",
            PENDING_REVIEW: "待複審",
            REVISION_REQUESTED: "要求修改",
            APPROVED: "已批准",
            REJECTED: "已退回",
            COMPLETED: "已完成",
            REVIEWED: "已複審",
          };
          details.push({ label: "狀態", value: statusMap[snapshot.status as string] || String(snapshot.status) });
        }
        if (snapshot.notes) details.push({ label: "備註", value: String(snapshot.notes) });
        if (snapshot.attachments && Array.isArray(snapshot.attachments) && snapshot.attachments.length > 0) {
          details.push({ label: "附件數量", value: `${snapshot.attachments.length} 個` });
        }
        break;

      case "user":
        if (snapshot.email) details.push({ label: "信箱", value: String(snapshot.email) });
        if (snapshot.name) details.push({ label: "姓名", value: String(snapshot.name) });
        if (snapshot.role) details.push({ label: "角色", value: roleLabels[snapshot.role as string] || String(snapshot.role) });
        if (snapshot.department) details.push({ label: "部門", value: String(snapshot.department) });
        if (snapshot.phone) details.push({ label: "電話", value: String(snapshot.phone) });
        break;

      case "navigation":
        if (snapshot.label) details.push({ label: "名稱", value: String(snapshot.label) });
        if (snapshot.url) details.push({ label: "連結", value: String(snapshot.url) });
        if (snapshot.icon) details.push({ label: "圖示", value: String(snapshot.icon) });
        break;

      case "task_type":
        if (snapshot.code) details.push({ label: "代碼", value: String(snapshot.code) });
        if (snapshot.label) details.push({ label: "名稱", value: String(snapshot.label) });
        if (snapshot.description) details.push({ label: "說明", value: String(snapshot.description) });
        if (snapshot.order !== undefined) details.push({ label: "排序", value: String(snapshot.order) });
        if (snapshot.isActive !== undefined) details.push({ label: "狀態", value: snapshot.isActive ? "啟用" : "停用" });
        break;

      case "task_assignment":
        if (snapshot.taskId) details.push({ label: "任務 ID", value: String(snapshot.taskId) });
        if (snapshot.role) details.push({ label: "角色", value: snapshot.role === "HANDLER" ? "負責人" : "複審人" });
        if (snapshot.notes) details.push({ label: "備註", value: String(snapshot.notes) });
        break;

      case "manpower_request":
        if (snapshot.requestNo) details.push({ label: "需求編號", value: String(snapshot.requestNo) });
        if (snapshot.contactPerson) details.push({ label: "聯絡人", value: String(snapshot.contactPerson) });
        if (snapshot.companyName) details.push({ label: "公司名稱", value: String(snapshot.companyName) });
        if (snapshot.contactPhone) details.push({ label: "電話", value: String(snapshot.contactPhone) });
        if (snapshot.positionTitle) details.push({ label: "職位名稱", value: String(snapshot.positionTitle) });
        if (snapshot.quantity) details.push({ label: "需求人數", value: String(snapshot.quantity) });
        if (snapshot.workLocation) details.push({ label: "工作地點", value: String(snapshot.workLocation) });
        break;

      default:
        // 顯示所有可用的欄位
        Object.entries(snapshot).forEach(([key, value]) => {
          if (value && typeof value !== "object") {
            details.push({ label: key, value: String(value) });
          }
        });
    }

    return details;
  };

  // 權限檢查
  if (permissionLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">載入中...</div>
        </div>
      </AdminLayout>
    );
  }

  if (!hasAccess) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-red-500">權限不足：您沒有查看活動日誌的權限</div>
        </div>
      </AdminLayout>
    );
  }

  const totalPages = Math.ceil(total / pageSize);

  // 導出 Excel - 使用 GraphQL 獲取全部資料
  const handleExportExcel = async () => {
    if (total === 0) {
      alert("沒有資料可以導出");
      return;
    }

    setExporting(true);
    try {
      // 使用 GraphQL 獲取所有資料
      const query = `
        query($page: Int, $pageSize: Int, $userId: String, $action: String, $entity: String, $startDate: String, $endDate: String, $search: String) {
          activityLogs(
            page: $page
            pageSize: $pageSize
            userId: $userId
            action: $action
            entity: $entity
            startDate: $startDate
            endDate: $endDate
            search: $search
          ) {
            items {
              id
              userId
              action
              entity
              entityId
              details
              user {
                id
                name
                email
                role
              }
              createdAt
            }
            total
          }
        }
      `;

      const variables = {
        page: 1,
        pageSize: 99999, // 獲取全部
        userId: filterUserId || undefined,
        action: filterAction || undefined,
        entity: filterEntity || undefined,
        startDate: filterStartDate || undefined,
        endDate: filterEndDate || undefined,
        search: filterSearch || undefined,
      };

      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ query, variables }),
      });

      const json = await res.json();

      if (json.errors) {
        throw new Error(json.errors[0]?.message || "查詢失敗");
      }

      const allLogs = json.data?.activityLogs?.items || [];

      if (allLogs.length === 0) {
        alert("沒有資料可以導出");
        return;
      }

      exportToExcel({
        filename: "活動日誌",
        sheetName: "日誌",
        columns: [
          { key: "createdAt", header: "時間", width: 20, format: (value) => formatDateForExcel(value) },
          { key: "user", header: "用戶", width: 20, format: (value) => value?.name || value?.email || "" },
          { key: "user", header: "用戶Email", width: 25, format: (value) => value?.email || "" },
          { key: "user", header: "角色", width: 12, format: (value) => roleLabels[value?.role] || value?.role || "" },
          { key: "action", header: "操作", width: 12, format: (value) => actionLabels[value] || value },
          { key: "entity", header: "對象", width: 15, format: (value) => entityLabels[value] || value },
          { key: "entityId", header: "對象ID", width: 12 },
          { key: "details", header: "詳情", width: 40, format: (value, row) => formatDetails(row.action, row.entity, value) },
        ],
        data: allLogs,
      });
    } catch (error) {
      console.error("導出失敗:", error);
      alert("導出失敗，請稍後再試");
    } finally {
      setExporting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 標題 */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">活動日誌</h1>
            <p className="text-gray-600 mt-1">查看全站用戶操作行為記錄</p>
          </div>
          <button
            onClick={handleExportExcel}
            disabled={total === 0 || exporting}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? "導出中..." : "導出 Excel"}
          </button>
        </div>

        {/* 統計圖表 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 操作類型統計 */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-medium text-gray-900 mb-3">操作類型分布</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {stats.byAction.map((item) => (
                  <div key={item.action} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {actionLabels[item.action] || item.action}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{
                            width: `${Math.min(
                              (item.count / Math.max(...stats.byAction.map((a) => a.count))) * 100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">{item.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 實體類型統計 */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-medium text-gray-900 mb-3">操作對象分布</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {stats.byEntity.map((item) => (
                  <div key={item.entity} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {entityLabels[item.entity] || item.entity}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{
                            width: `${Math.min(
                              (item.count / Math.max(...stats.byEntity.map((e) => e.count))) * 100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">{item.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 篩選區 */}
        <div className="bg-white rounded-lg shadow p-4">
          {/* 搜尋框 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">搜尋任務編號或名稱</label>
            <input
              type="text"
              value={filterSearch}
              onChange={(e) => {
                setFilterSearch(e.target.value);
                setPage(1);
              }}
              placeholder="輸入任務編號（如 AT-20260107-0001）或任務名稱"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* 用戶篩選 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">用戶</label>
              <select
                value={filterUserId}
                onChange={(e) => {
                  setFilterUserId(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">全部用戶</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.email}
                  </option>
                ))}
              </select>
            </div>

            {/* 操作類型篩選 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">操作類型</label>
              <select
                value={filterAction}
                onChange={(e) => {
                  setFilterAction(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">全部類型</option>
                {Object.entries(actionLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* 實體類型篩選 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">操作對象</label>
              <select
                value={filterEntity}
                onChange={(e) => {
                  setFilterEntity(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">全部對象</option>
                {Object.entries(entityLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* 開始日期 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">開始日期</label>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => {
                  setFilterStartDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>

            {/* 結束日期 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">結束日期</label>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => {
                  setFilterEndDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>

            {/* 重置按鈕 */}
            <div className="flex items-end">
              <button
                onClick={handleResetFilter}
                className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border rounded-lg hover:bg-gray-50"
              >
                重置篩選
              </button>
            </div>
          </div>
        </div>

        {/* 復原操作訊息 */}
        {restoreMessage && (
          <div
            className={`p-4 rounded-lg ${
              restoreMessage.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {restoreMessage.text}
          </div>
        )}

        {/* 日誌列表 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {error && (
            <div className="p-4 bg-red-50 text-red-600 border-b border-red-100">{error}</div>
          )}

          {loading ? (
            <div className="p-8 text-center text-gray-500">載入中...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">沒有找到活動記錄</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        時間
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        用戶
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        操作
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        對象
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        詳情
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {logs.map((log) => {
                      const isExpanded = expandedLogId === log.id;
                      const details = log.details as Record<string, unknown> | null;
                      const snapshot = details?.snapshot as Record<string, unknown> | undefined;
                      const showRestoreButton = isSuperAdmin && canRestore(log);

                      return (
                        <Fragment key={log.id}>
                          <tr className={`hover:bg-gray-50 ${log.action === "delete" ? "bg-red-50/30" : ""}`}>
                            <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                              {formatTime(log.createdAt)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium text-gray-900">
                                {log.user.name || "未命名"}
                              </div>
                              <div className="text-xs text-gray-500">{log.user.email}</div>
                              <div className="text-xs text-gray-400">
                                {roleLabels[log.user.role] || log.user.role}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                  log.action === "login"
                                    ? "bg-green-100 text-green-800"
                                    : log.action === "logout"
                                    ? "bg-gray-100 text-gray-800"
                                    : log.action === "create"
                                    ? "bg-blue-100 text-blue-800"
                                    : log.action === "update"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : log.action === "delete"
                                    ? "bg-red-100 text-red-800"
                                    : log.action === "restore"
                                    ? "bg-purple-100 text-purple-800"
                                    : log.action === "approve"
                                    ? "bg-green-100 text-green-800"
                                    : log.action === "reject"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {actionLabels[log.action] || log.action}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm text-gray-900">
                                {entityLabels[log.entity] || log.entity}
                              </div>
                              {log.entityId && (
                                <div className="text-xs text-gray-500">ID: {log.entityId}</div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 max-w-md">
                              {log.details ? (
                                <div className="space-y-1">
                                  <div className="text-gray-800">
                                    {formatDetails(log.action, log.entity, log.details) || "操作已完成"}
                                  </div>
                                  {/* 行政任務操作且有可展開的詳情時顯示展開按鈕 */}
                                  {hasExpandableDetails(log.action, log.entity, log.details) && (
                                    <button
                                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                    >
                                      <span>
                                        {isExpanded
                                          ? "▼ 收合詳情"
                                          : log.action === "delete"
                                            ? "▶ 查看被刪除的內容"
                                            : "▶ 查看變更詳情"
                                        }
                                      </span>
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                          {/* 展開的詳情列 - 刪除操作 */}
                          {isExpanded && log.action === "delete" && snapshot && (
                            <tr className="bg-gray-50">
                              <td colSpan={5} className="px-4 py-4">
                                <div className="bg-white rounded-lg border border-gray-200 p-4">
                                  <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                                    <span className="text-red-500">🗑</span>
                                    被刪除的{entityLabels[log.entity] || log.entity}詳細資料
                                  </h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {formatSnapshotDetails(log.entity, snapshot).map((item, index) => (
                                      <div key={index} className="bg-gray-50 rounded px-3 py-2">
                                        <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                                        <div className="text-sm text-gray-900 break-all">{item.value}</div>
                                      </div>
                                    ))}
                                  </div>
                                  {showRestoreButton && (
                                    <div className="mt-4 pt-3 border-t border-gray-200">
                                      <button
                                        onClick={() => handleRestore(log.id)}
                                        disabled={restoringLogId === log.id}
                                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                      >
                                        <span>↩️</span>
                                        {restoringLogId === log.id ? "復原中..." : "復原此項目"}
                                      </button>
                                      <p className="text-xs text-gray-500 mt-2">
                                        點擊復原將重新創建此項目，原始 ID 可能會改變
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                          {/* 展開的詳情列 - 其他操作（更新、審批等） */}
                          {isExpanded && log.action !== "delete" && details && hasExpandableDetails(log.action, log.entity, details) && (
                            <tr className="bg-blue-50/30">
                              <td colSpan={5} className="px-4 py-4">
                                <div className="bg-white rounded-lg border border-blue-200 p-4">
                                  <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                                    <span className="text-blue-500">📝</span>
                                    {actionLabels[log.action] || log.action}操作詳情
                                  </h4>
                                  <div className="space-y-3">
                                    {formatActionDetails(log.action, details).map((item, index) => (
                                      <div key={index} className="bg-gray-50 rounded px-3 py-2">
                                        <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                                        {item.oldValue !== undefined && item.newValue !== undefined ? (
                                          <div className="flex items-center gap-2 text-sm">
                                            <span className="text-red-600 line-through bg-red-50 px-2 py-0.5 rounded">
                                              {item.oldValue}
                                            </span>
                                            <span className="text-gray-400">→</span>
                                            <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded">
                                              {item.newValue}
                                            </span>
                                          </div>
                                        ) : (
                                          <div className="text-sm text-gray-900 break-all">
                                            {item.value}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                    {formatActionDetails(log.action, details).length === 0 && (
                                      <div className="text-sm text-gray-500">無詳細變更資訊</div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* 分頁 */}
              <div className="px-4 py-3 bg-gray-50 border-t flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  共 {total} 筆記錄，第 {page} / {totalPages} 頁
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    上一頁
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-3 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    下一頁
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
