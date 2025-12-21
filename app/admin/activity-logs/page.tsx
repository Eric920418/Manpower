"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import AdminLayout from "@/components/Admin/AdminLayout";
import { usePermission } from "@/hooks/usePermission";

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
  logout: "登出",
  create: "新增",
  update: "更新",
  delete: "刪除",
  approve: "審批通過",
  reject: "退回",
  pending_documents: "待補件",
  request_revision: "要求修改",
  upload: "上傳",
  upload_attachment: "上傳附件",
  delete_attachment: "刪除附件",
  update_status: "狀態變更",
  assign_processor: "分配處理人",
  assign_approver: "分配審批人",
  toggle_status: "切換狀態",
  reset_password: "重置密碼",
  reorder: "排序調整",
};

// 實體類型中文對照
const entityLabels: Record<string, string> = {
  user: "用戶",
  admin_task: "行政任務",
  admin_task_attachment: "任務附件",
  task_type: "任務類型",
  page: "頁面內容",
  navigation: "導航選單",
  manpower_request: "人力需求",
  workflow: "工作流程",
  image: "圖片",
  file: "檔案",
};

// 角色中文對照
const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "超級管理員",
  ADMIN: "管理員",
  OWNER: "業主",
  STAFF: "業務人員",
};

// 將詳情轉換為白話文描述
const formatDetails = (action: string, entity: string, details: Record<string, unknown> | null): string => {
  if (!details) return "";

  const parts: string[] = [];

  // 根據不同的操作和實體類型生成描述
  switch (entity) {
    case "user":
      if (details.targetEmail) parts.push(`對象：${details.targetEmail}`);
      if (details.targetRole) parts.push(`角色：${roleLabels[details.targetRole as string] || details.targetRole}`);
      if (details.newStatus !== undefined) parts.push(`狀態：${details.newStatus ? "啟用" : "停用"}`);
      if (details.changes && typeof details.changes === "object") {
        const changeKeys = Object.keys(details.changes as object);
        if (changeKeys.length > 0) {
          const changeLabels: Record<string, string> = {
            name: "姓名",
            email: "信箱",
            role: "角色",
            department: "部門",
            phone: "電話",
            isActive: "狀態",
            avatar: "頭像",
          };
          const changedFields = changeKeys.map(k => changeLabels[k] || k).join("、");
          parts.push(`修改欄位：${changedFields}`);
        }
      }
      break;

    case "admin_task":
      if (details.taskNo) parts.push(`任務編號：${details.taskNo}`);
      if (details.title) parts.push(`標題：${details.title}`);
      if (details.action) {
        const actionMap: Record<string, string> = {
          approve: "審批通過",
          reject: "退回",
          pending_documents: "待補件",
          request_revision: "要求修改",
        };
        parts.push(`審批動作：${actionMap[details.action as string] || details.action}`);
      }
      if (details.newStatus) {
        const statusMap: Record<string, string> = {
          PENDING: "待處理",
          PROCESSING: "處理中",
          PENDING_DOCUMENTS: "待補件",
          PENDING_REVIEW: "待複審",
          REVISION_REQUESTED: "要求修改",
          APPROVED: "已批准",
          REJECTED: "已退回",
          COMPLETED: "已完成",
        };
        parts.push(`新狀態：${statusMap[details.newStatus as string] || details.newStatus}`);
      }
      if (details.oldStatus && details.newStatus) {
        const statusMap: Record<string, string> = {
          PENDING: "待處理",
          PROCESSING: "處理中",
          PENDING_DOCUMENTS: "待補件",
          PENDING_REVIEW: "待複審",
          REVISION_REQUESTED: "要求修改",
          APPROVED: "已批准",
          REJECTED: "已退回",
          COMPLETED: "已完成",
        };
        parts.push(`狀態變更：${statusMap[details.oldStatus as string] || details.oldStatus} → ${statusMap[details.newStatus as string] || details.newStatus}`);
      }
      if (details.processorId) parts.push("已分配處理人");
      if (details.approverId) parts.push("已分配審批人");
      if (details.comment) parts.push(`備註：${details.comment}`);
      if (details.filename) parts.push(`檔案：${details.filename}`);
      if (details.attachmentId) parts.push(`附件 ID：${details.attachmentId}`);
      if (details.changes && Array.isArray(details.changes)) {
        const fieldLabels: Record<string, string> = {
          title: "標題",
          notes: "備註",
          deadline: "期限",
          payload: "表單內容",
          status: "狀態",
        };
        const changedFields = (details.changes as string[]).map(k => fieldLabels[k] || k).join("、");
        parts.push(`修改欄位：${changedFields}`);
      }
      break;

    case "task_type":
      if (details.code) parts.push(`代碼：${details.code}`);
      if (details.label) parts.push(`名稱：${details.label}`);
      if (details.count !== undefined) parts.push(`數量：${details.count}`);
      break;

    case "page":
      if (details.pageName) parts.push(`頁面：${details.pageName}`);
      if (details.changedFields && Array.isArray(details.changedFields)) {
        parts.push(`修改區塊：${(details.changedFields as string[]).join("、")}`);
      }
      break;

    case "navigation":
      if (details.label) parts.push(`名稱：${details.label}`);
      if (details.url) parts.push(`連結：${details.url}`);
      if (details.changes && Array.isArray(details.changes)) {
        const fieldLabels: Record<string, string> = {
          label: "名稱",
          url: "連結",
          order: "排序",
          isActive: "狀態",
          parentId: "父項目",
          icon: "圖示",
          target: "開啟方式",
        };
        const changedFields = (details.changes as string[]).map(k => fieldLabels[k] || k).join("、");
        parts.push(`修改欄位：${changedFields}`);
      }
      if (details.reorderedIds) parts.push(`重新排序了 ${(details.reorderedIds as unknown[]).length} 個項目`);
      break;

    case "manpower_request":
      if (details.requestNo) parts.push(`需求編號：${details.requestNo}`);
      if (details.contactPerson) parts.push(`聯絡人：${details.contactPerson}`);
      if (details.changes && typeof details.changes === "object") {
        const changeKeys = Object.keys(details.changes as object);
        if (changeKeys.length > 0) {
          const fieldLabels: Record<string, string> = {
            status: "狀態",
            notes: "備註",
            processedBy: "處理人",
          };
          const changedFields = changeKeys.map(k => fieldLabels[k] || k).join("、");
          parts.push(`修改欄位：${changedFields}`);
        }
      }
      break;

    case "workflow":
      if (details.nodesUpdated !== undefined) parts.push(`更新了 ${details.nodesUpdated} 個節點位置`);
      if (details.flowsCreated !== undefined) parts.push(`建立了 ${details.flowsCreated} 條流程連線`);
      if (details.flowsDeleted !== undefined && (details.flowsDeleted as number) > 0) {
        parts.push(`刪除了 ${details.flowsDeleted} 條流程連線`);
      }
      break;

    case "image":
    case "admin_task_attachment":
      if (details.originalName || details.filename) parts.push(`檔案：${details.originalName || details.filename}`);
      if (details.originalSize) {
        const sizeKB = ((details.originalSize as number) / 1024).toFixed(1);
        parts.push(`大小：${sizeKB} KB`);
      }
      if (details.mimeType) {
        const typeMap: Record<string, string> = {
          "image/jpeg": "JPEG 圖片",
          "image/png": "PNG 圖片",
          "image/gif": "GIF 圖片",
          "image/webp": "WebP 圖片",
          "application/pdf": "PDF 文件",
        };
        parts.push(`類型：${typeMap[details.mimeType as string] || details.mimeType}`);
      }
      if (details.taskId) parts.push(`關聯任務 ID：${details.taskId}`);
      break;

    default:
      // 通用處理
      if (details.label) parts.push(`名稱：${details.label}`);
      if (details.title) parts.push(`標題：${details.title}`);
      if (details.name) parts.push(`名稱：${details.name}`);
      break;
  }

  return parts.length > 0 ? parts.join(" | ") : "";
};

export default function ActivityLogsPage() {
  const { status } = useSession();
  const { can } = usePermission();
  const permissionLoading = status === "loading";
  const hasAccess = !permissionLoading && can("system:logs");

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

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

  // 載入用戶列表
  const fetchUsers = useCallback(async () => {
    try {
      const query = `
        query {
          users(page: 1, pageSize: 1000) {
            items {
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
      if (json.data?.users?.items) {
        setUsers(json.data.users.items);
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
        query($page: Int, $pageSize: Int, $userId: String, $action: String, $entity: String, $startDate: String, $endDate: String) {
          activityLogs(
            page: $page
            pageSize: $pageSize
            userId: $userId
            action: $action
            entity: $entity
            startDate: $startDate
            endDate: $endDate
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
  }, [page, pageSize, filterUserId, filterAction, filterEntity, filterStartDate, filterEndDate]);

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
  }, [page, filterUserId, filterAction, filterEntity, filterStartDate, filterEndDate]);

  // 重置篩選
  const handleResetFilter = () => {
    setFilterUserId("");
    setFilterAction("");
    setFilterEntity("");
    setFilterStartDate("");
    setFilterEndDate("");
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 標題 */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">活動日誌</h1>
          <p className="text-gray-600 mt-1">查看全站用戶操作行為記錄</p>
        </div>

        {/* 統計卡片 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">今日活動</div>
              <div className="text-2xl font-bold text-blue-600">{stats.totalToday}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">本週活動</div>
              <div className="text-2xl font-bold text-green-600">{stats.totalThisWeek}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">本月活動</div>
              <div className="text-2xl font-bold text-purple-600">{stats.totalThisMonth}</div>
            </div>
          </div>
        )}

        {/* 統計圖表 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 操作類型統計 */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-medium text-gray-900 mb-3">操作類型分布</h3>
              <div className="space-y-2">
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
              <div className="space-y-2">
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
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        IP 位址
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
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
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {log.ipAddress || "-"}
                        </td>
                      </tr>
                    ))}
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
