"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { usePermission } from "@/hooks/usePermission";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/Admin/AdminLayout";

// 類型定義
interface TaskUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

interface TaskType {
  id: number;
  code: string;
  label: string;
}

interface Assignment {
  id: string;
  taskId: number;
  userId: string;
  role: "HANDLER" | "REVIEWER";
  assignedAt: string;
  notes: string | null;
  user: TaskUser;
}

interface AdminTask {
  id: string;
  taskNo: string;
  title: string;
  status: string;
  taskType: TaskType;
  applicant: TaskUser;
  assignments: Assignment[];
  handlers: TaskUser[];
  reviewers: TaskUser[];
  createdAt: string;
}

interface UserSummary {
  user: TaskUser;
  totalTasks: number;
  pendingTasks: number;
  processingTasks: number;
  pendingReviewTasks: number;
}

// 全局分配類型
interface DefaultAssignment {
  id: number;
  taskTypeId: number;
  userId: string;
  role: "HANDLER" | "REVIEWER";
  createdAt: string;
  createdBy: string | null;
}

interface TaskTypeAssignmentSummary {
  taskType: TaskType;
  handlers: TaskUser[];
  reviewers: TaskUser[];
  assignments: DefaultAssignment[];
}

type ViewMode = "tasks" | "admins" | "global";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: "待處理", color: "bg-yellow-100 text-yellow-800" },
  PROCESSING: { label: "處理中", color: "bg-blue-100 text-blue-800" },
  PENDING_DOCUMENTS: { label: "待補件", color: "bg-orange-100 text-orange-800" },
  PENDING_REVIEW: { label: "待複審", color: "bg-purple-100 text-purple-800" },
  REVISION_REQUESTED: { label: "要求修改", color: "bg-pink-100 text-pink-800" },
  APPROVED: { label: "已批准", color: "bg-green-100 text-green-800" },
  REJECTED: { label: "已退回", color: "bg-red-100 text-red-800" },
  COMPLETED: { label: "已完成", color: "bg-gray-100 text-gray-800" },
};


export default function AdminAssignmentsPage() {
  const { status } = useSession();
  const { can } = usePermission();
  const router = useRouter();
  const canViewAssignment = can("task_assignment:read");
  const canAssign = can("task_assignment:assign");

  // 視圖模式
  const [viewMode, setViewMode] = useState<ViewMode>("tasks");

  // 案件視角資料
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // 管理員視角資料
  const [userSummaries, setUserSummaries] = useState<UserSummary[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<TaskUser[]>([]);

  // 全局分配資料
  const [globalSummaries, setGlobalSummaries] = useState<TaskTypeAssignmentSummary[]>([]);

  // 狀態
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 分配模態框
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<AdminTask | null>(null);
  const [selectedHandlers, setSelectedHandlers] = useState<string[]>([]);
  const [selectedReviewers, setSelectedReviewers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // 全局分配模態框
  const [showGlobalModal, setShowGlobalModal] = useState(false);
  const [editingTaskType, setEditingTaskType] = useState<TaskTypeAssignmentSummary | null>(null);
  const [selectedGlobalHandlers, setSelectedGlobalHandlers] = useState<string[]>([]);
  const [selectedGlobalReviewers, setSelectedGlobalReviewers] = useState<string[]>([]);
  const [applyingGlobal, setApplyingGlobal] = useState(false);

  // 獲取案件視角資料
  const fetchTasksData = useCallback(async () => {
    try {
      const tasksQuery = `
        query AdminTasks($status: String, $taskTypeId: Int, $search: String) {
          adminTasks(status: $status, taskTypeId: $taskTypeId, search: $search, pageSize: 100) {
            items {
              id
              taskNo
              title
              status
              taskType { id code label }
              applicant { id name email role }
              assignments { id taskId userId role assignedAt notes user { id name email role } }
              handlers { id name email role }
              reviewers { id name email role }
              createdAt
            }
          }
          taskTypes { id code label }
          assignableUsers { id name email role }
        }
      `;

      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          query: tasksQuery,
          variables: {
            status: statusFilter || undefined,
            taskTypeId: typeFilter ? parseInt(typeFilter) : undefined,
            search: searchQuery || undefined,
          },
        }),
      });

      const data = await res.json();
      if (data.errors) throw new Error(data.errors[0].message);

      setTasks(data.data.adminTasks.items);
      setTaskTypes(data.data.taskTypes);
      setAssignableUsers(data.data.assignableUsers);
    } catch (err) {
      console.error("載入案件失敗：", err);
      setError(err instanceof Error ? err.message : "未知錯誤");
    }
  }, [statusFilter, typeFilter, searchQuery]);

  // 獲取管理員視角資料
  const fetchAdminsData = useCallback(async () => {
    try {
      const summaryQuery = `
        query {
          allUserAssignmentSummaries {
            user { id name email role }
            totalTasks
            pendingTasks
            processingTasks
            pendingReviewTasks
          }
          assignableUsers { id name email role }
        }
      `;

      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ query: summaryQuery }),
      });

      const data = await res.json();
      if (data.errors) throw new Error(data.errors[0].message);

      setUserSummaries(data.data.allUserAssignmentSummaries);
      setAssignableUsers(data.data.assignableUsers);
    } catch (err) {
      console.error("載入管理員摘要失敗：", err);
      setError(err instanceof Error ? err.message : "未知錯誤");
    }
  }, []);

  // 獲取全局分配資料
  const fetchGlobalData = useCallback(async () => {
    try {
      const globalQuery = `
        query {
          allTaskTypeAssignmentSummaries {
            taskType { id code label }
            handlers { id name email role }
            reviewers { id name email role }
            assignments { id taskTypeId userId role createdAt createdBy }
          }
          assignableUsers { id name email role }
        }
      `;

      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ query: globalQuery }),
      });

      const data = await res.json();
      if (data.errors) throw new Error(data.errors[0].message);

      setGlobalSummaries(data.data.allTaskTypeAssignmentSummaries);
      setAssignableUsers(data.data.assignableUsers);
    } catch (err) {
      console.error("載入全局分配失敗：", err);
      setError(err instanceof Error ? err.message : "未知錯誤");
    }
  }, []);

  // 獲取資料
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (viewMode === "tasks") {
        await fetchTasksData();
      } else if (viewMode === "admins") {
        await fetchAdminsData();
      } else {
        await fetchGlobalData();
      }
    } finally {
      setLoading(false);
    }
  }, [viewMode, fetchTasksData, fetchAdminsData, fetchGlobalData]);

  useEffect(() => {
    if (status === "authenticated" && canViewAssignment) {
      fetchData();
    }
  }, [status, canViewAssignment, fetchData]);

  // 開啟分配模態框
  const handleEditAssignment = (task: AdminTask) => {
    setEditingTask(task);
    setSelectedHandlers(task.handlers.map((u) => u.id));
    setSelectedReviewers(task.reviewers.map((u) => u.id));
    setShowModal(true);
  };

  // 切換負責人選擇
  const toggleHandler = (userId: string) => {
    setSelectedHandlers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  // 切換複審人選擇
  const toggleReviewer = (userId: string) => {
    setSelectedReviewers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  // 保存分配
  const handleSave = async () => {
    if (!editingTask) return;

    setSaving(true);
    try {
      const mutation = `
        mutation SetTaskAssignments($input: SetTaskAssignmentsInput!) {
          setTaskAssignments(input: $input) {
            id
            role
            user { id name email }
          }
        }
      `;

      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          query: mutation,
          variables: {
            input: {
              taskId: parseInt(editingTask.id),
              handlerIds: selectedHandlers,
              reviewerIds: selectedReviewers,
            },
          },
        }),
      });

      const data = await res.json();
      if (data.errors) throw new Error(data.errors[0].message);

      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error("保存失敗：", err);
      alert(`保存失敗：${err instanceof Error ? err.message : "未知錯誤"}`);
    } finally {
      setSaving(false);
    }
  };

  // 開啟全局分配模態框
  const handleEditGlobalAssignment = (summary: TaskTypeAssignmentSummary) => {
    setEditingTaskType(summary);
    setSelectedGlobalHandlers(summary.handlers.map((u) => u.id));
    setSelectedGlobalReviewers(summary.reviewers.map((u) => u.id));
    setShowGlobalModal(true);
  };

  // 切換全局負責人選擇
  const toggleGlobalHandler = (userId: string) => {
    setSelectedGlobalHandlers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  // 切換全局複審人選擇
  const toggleGlobalReviewer = (userId: string) => {
    setSelectedGlobalReviewers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  // 保存全局分配
  const handleSaveGlobal = async () => {
    if (!editingTaskType) return;

    setSaving(true);
    try {
      const mutation = `
        mutation SetTaskTypeDefaultAssignments($input: SetTaskTypeDefaultAssignmentsInput!) {
          setTaskTypeDefaultAssignments(input: $input) {
            id
            taskTypeId
            userId
            role
          }
        }
      `;

      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          query: mutation,
          variables: {
            input: {
              taskTypeId: Number(editingTaskType.taskType.id),
              handlerIds: selectedGlobalHandlers,
              reviewerIds: selectedGlobalReviewers,
            },
          },
        }),
      });

      const data = await res.json();
      if (data.errors) throw new Error(data.errors[0].message);

      setShowGlobalModal(false);
      fetchData();
    } catch (err) {
      console.error("保存全局分配失敗：", err);
      alert(`保存失敗：${err instanceof Error ? err.message : "未知錯誤"}`);
    } finally {
      setSaving(false);
    }
  };

  // 套用全局分配到現有案件
  const handleApplyGlobalToExisting = async () => {
    if (!confirm("確定要將全局分配設定套用到所有未完成的案件嗎？\n\n此操作會根據各案件類型的全局分配設定，為尚未分配的案件添加對應的管理員。")) {
      return;
    }

    setApplyingGlobal(true);
    try {
      const mutation = `
        mutation ApplyGlobalAssignmentsToExistingTasks {
          applyGlobalAssignmentsToExistingTasks {
            success
            message
            updatedTaskCount
            newAssignmentCount
          }
        }
      `;

      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ query: mutation }),
      });

      const data = await res.json();
      if (data.errors) throw new Error(data.errors[0].message);

      const result = data.data.applyGlobalAssignmentsToExistingTasks;
      alert(result.message);
      fetchData();
    } catch (err) {
      console.error("套用全局分配失敗：", err);
      alert(`套用失敗：${err instanceof Error ? err.message : "未知錯誤"}`);
    } finally {
      setApplyingGlobal(false);
    }
  };

  // 載入中
  if (status === "loading") {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">載入中...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // 權限不足
  if (!canViewAssignment) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md">
            <span className="text-6xl mb-4 block">🔒</span>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">權限不足</h1>
            <p className="text-gray-600 mb-6">您沒有查看案件分配的權限</p>
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              返回儀表板
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        {/* 頁面標題 */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">案件分配管理</h1>
            <p className="text-gray-600">分配案件給管理員處理</p>
          </div>

          {/* 視圖切換 */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode("tasks")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === "tasks"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              案件視角
            </button>
            <button
              onClick={() => setViewMode("admins")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === "admins"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              管理員視角
            </button>
            <button
              onClick={() => setViewMode("global")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === "global"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              全局分配
            </button>
          </div>
        </div>

        {/* 錯誤顯示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-red-500 text-2xl">⚠️</span>
              <div>
                <p className="text-red-800 font-medium">載入失敗</p>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
              <button
                onClick={fetchData}
                className="ml-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
              >
                重試
              </button>
            </div>
          </div>
        )}

        {/* 案件視角 */}
        {viewMode === "tasks" && (
          <>
            {/* 篩選器 */}
            <div className="bg-white rounded-xl shadow-md p-4 mb-6">
              <div className="flex flex-wrap gap-4">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">所有狀態</option>
                  {Object.entries(STATUS_MAP).map(([key, { label }]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">所有類型</option>
                  {taskTypes.map((type) => (
                    <option key={type.id} value={type.id}>{type.label}</option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="搜尋案件編號或標題..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex-1 min-w-[200px]"
                />

                <button
                  onClick={fetchData}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  搜尋
                </button>
              </div>
            </div>

            {/* 案件列表 */}
            {loading ? (
              <div className="text-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">載入中...</p>
              </div>
            ) : tasks.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md p-16 text-center">
                <span className="text-6xl mb-4 block">📋</span>
                <p className="text-xl text-gray-900 font-semibold mb-2">無符合條件的案件</p>
                <p className="text-gray-600">請調整篩選條件或新增案件</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">標題</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">類型</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">狀態</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">分配人員</th>
                      {canAssign && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">操作</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {tasks.map((task) => (
                      <tr key={task.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-900 line-clamp-1">{task.title}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-gray-600">{task.taskType.label}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_MAP[task.status]?.color || "bg-gray-100"}`}>
                            {STATUS_MAP[task.status]?.label || task.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            {task.handlers.length === 0 && task.reviewers.length === 0 ? (
                              <span className="text-sm text-gray-400">未分配</span>
                            ) : (
                              <>
                                {task.handlers.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {task.handlers.map((u) => (
                                      <span key={u.id} className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                                        {u.name || u.email}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {task.reviewers.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {task.reviewers.map((u) => (
                                      <span key={u.id} className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded">
                                        {u.name || u.email} (複審)
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                        {canAssign && (
                          <td className="px-4 py-3 whitespace-nowrap">
                            <button
                              onClick={() => handleEditAssignment(task)}
                              className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                            >
                              分配
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* 管理員視角 */}
        {viewMode === "admins" && (
          <>
            {loading ? (
              <div className="text-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">載入中...</p>
              </div>
            ) : userSummaries.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md p-16 text-center">
                <span className="text-6xl mb-4 block">👤</span>
                <p className="text-xl text-gray-900 font-semibold mb-2">尚無管理員</p>
                <p className="text-gray-600">請先在用戶管理頁面創建管理員帳號</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {userSummaries.map((summary) => (
                  <div key={summary.user.id} className="bg-white rounded-xl shadow-md p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg">
                        {(summary.user.name || summary.user.email)[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{summary.user.name || "-"}</p>
                        <p className="text-sm text-gray-500">{summary.user.email}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-sm text-gray-600">
                      <div className="text-center p-2 bg-yellow-50 rounded-lg">
                        <p className="text-xl font-bold text-yellow-600">{summary.pendingTasks}</p>
                        <p className="text-xs text-gray-600">待處理</p>
                      </div>
                      <div className="text-center p-2 bg-blue-50 rounded-lg">
                        <p className="text-xl font-bold text-blue-600">{summary.processingTasks}</p>
                        <p className="text-xs text-gray-600">處理中</p>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded-lg">
                        <p className="text-xl font-bold text-gray-600">{summary.totalTasks}</p>
                        <p className="text-xs text-gray-600">總計</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* 全局分配視角 */}
        {viewMode === "global" && (
          <>
            {/* 全局分配說明與操作按鈕 */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-blue-900">全局分配設定</h3>
                  <p className="text-blue-700 text-sm mt-1">
                    設定各案件類型的預設負責人和複審人。此設定只會套用到<strong>新建的案件</strong>。
                  </p>
                </div>
                {canAssign && (
                  <button
                    onClick={handleApplyGlobalToExisting}
                    disabled={applyingGlobal}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-2"
                  >
                    {applyingGlobal ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        套用中...
                      </>
                    ) : (
                      <>
                        <span>🔄</span>
                        套用到現有案件
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="text-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">載入中...</p>
              </div>
            ) : globalSummaries.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md p-16 text-center">
                <span className="text-6xl mb-4 block">📋</span>
                <p className="text-xl text-gray-900 font-semibold mb-2">尚無案件類型</p>
                <p className="text-gray-600">請先在申請類型管理頁面創建案件類型</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">案件類型</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">負責人</th>
                      {canAssign && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">操作</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {globalSummaries.map((summary) => (
                      <tr key={summary.taskType.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className="font-medium text-gray-900">{summary.taskType.label}</span>
                          <span className="text-gray-400 text-xs ml-2">({summary.taskType.code})</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            {summary.handlers.length === 0 && summary.reviewers.length === 0 ? (
                              <span className="text-sm text-gray-400">未設定</span>
                            ) : (
                              <>
                                {summary.handlers.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {summary.handlers.map((u) => (
                                      <span key={u.id} className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                                        {u.name || u.email}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {summary.reviewers.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {summary.reviewers.map((u) => (
                                      <span key={u.id} className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded">
                                        {u.name || u.email} (複審)
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                        {canAssign && (
                          <td className="px-4 py-3 whitespace-nowrap">
                            <button
                              onClick={() => handleEditGlobalAssignment(summary)}
                              className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                            >
                              設定
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* 分配模態框 */}
        {showModal && editingTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="border-b px-6 py-4 flex items-center justify-between flex-shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">編輯案件分配</h2>
                  <p className="text-sm text-gray-600">{editingTask.taskNo} - {editingTask.title}</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                {/* 負責人 */}
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm">👤</span>
                    負責人
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {assignableUsers.map((user) => (
                      <label
                        key={user.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                          selectedHandlers.includes(user.id)
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedHandlers.includes(user.id)}
                          onChange={() => toggleHandler(user.id)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm">{user.name || user.email}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 複審人 */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-sm">✓</span>
                    複審人
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {assignableUsers.map((user) => (
                      <label
                        key={user.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                          selectedReviewers.includes(user.id)
                            ? "border-purple-500 bg-purple-50"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedReviewers.includes(user.id)}
                          onChange={() => toggleReviewer(user.id)}
                          className="w-4 h-4 text-purple-600 rounded"
                        />
                        <span className="text-sm">{user.name || user.email}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t px-6 py-4 flex gap-3 flex-shrink-0">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "保存中..." : "確認保存"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 全局分配模態框 */}
        {showGlobalModal && editingTaskType && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="border-b px-6 py-4 flex items-center justify-between flex-shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">設定全局分配</h2>
                  <p className="text-sm text-gray-600">{editingTaskType.taskType.label} ({editingTaskType.taskType.code})</p>
                </div>
                <button onClick={() => setShowGlobalModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
                  <p className="text-amber-800 text-sm">
                    設定的管理員將在該類型的新案件建立時自動被分配。
                  </p>
                </div>

                {/* 負責人 */}
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-sm">👤</span>
                    負責人
                    <span className="text-xs text-gray-500 font-normal">（處理案件）</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {assignableUsers.map((user) => (
                      <label
                        key={user.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                          selectedGlobalHandlers.includes(user.id)
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedGlobalHandlers.includes(user.id)}
                          onChange={() => toggleGlobalHandler(user.id)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm">{user.name || user.email}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 複審人 */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-sm">✓</span>
                    複審人
                    <span className="text-xs text-gray-500 font-normal">（審核案件）</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {assignableUsers.map((user) => (
                      <label
                        key={user.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                          selectedGlobalReviewers.includes(user.id)
                            ? "border-purple-500 bg-purple-50"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedGlobalReviewers.includes(user.id)}
                          onChange={() => toggleGlobalReviewer(user.id)}
                          className="w-4 h-4 text-purple-600 rounded"
                        />
                        <span className="text-sm">{user.name || user.email}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t px-6 py-4 flex gap-3 flex-shrink-0">
                <button
                  onClick={() => setShowGlobalModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveGlobal}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "保存中..." : "確認保存"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
