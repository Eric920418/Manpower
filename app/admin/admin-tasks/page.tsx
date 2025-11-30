"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
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

interface AdminTaskAttachment {
  id: number;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string | null;
  createdAt: string;
}

interface ApprovalRecord {
  id: number;
  action: string;
  comment: string | null;
  approver: TaskUser;
  createdAt: string;
}

interface AdminTask {
  id: number;
  taskNo: string;
  taskType: string;
  title: string;
  applicant: TaskUser;
  processor: TaskUser | null;
  approver: TaskUser | null;
  applicationDate: string;
  deadline: string | null;
  receivedAt: string | null;
  completedAt: string | null;
  status: string;
  approvalRoute: string;
  approvalMark: string | null;
  payload: Record<string, unknown>;
  notes: string | null;
  attachments: AdminTaskAttachment[];
  approvalRecords: ApprovalRecord[];
  createdAt: string;
  updatedAt: string;
}

interface AdminTaskStats {
  total: number;
  pending: number;
  processing: number;
  approved: number;
  rejected: number;
  completed: number;
  overdue: number;
}

interface PageInfo {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 任務類型映射
const taskTypeLabels: Record<string, string> = {
  CREATE_FILE: "建檔",
  TERMINATION: "廢聘",
  LONG_TERM_CARE: "長照求才",
  RETURN_SUPPLEMENT: "退補件",
  RECRUITMENT_LETTER: "申請招募函",
  HEALTH_CHECK: "體檢(報告/核備)",
  ENTRY_ONESTOP: "一站式入境",
  TAKEOVER_NOTIFY: "承接通報(雙方合意)",
  CERTIFICATION: "印辦認證",
  OTHER: "其他",
};

// 狀態映射
const statusLabels: Record<string, { label: string; className: string }> = {
  PENDING: { label: "待處理", className: "bg-yellow-100 text-yellow-800" },
  PROCESSING: { label: "處理中", className: "bg-blue-100 text-blue-800" },
  APPROVED: { label: "已批准", className: "bg-green-100 text-green-800" },
  REJECTED: { label: "已退回", className: "bg-red-100 text-red-800" },
  COMPLETED: { label: "已完成", className: "bg-gray-100 text-gray-800" },
};

export default function AdminTasksPage() {
  const { status } = useSession();
  const { getRole } = usePermission();
  const router = useRouter();

  // 使用 useMemo 緩存角色檢查結果，避免每次渲染都重新計算
  const userRole = getRole();
  const isAdmin = useMemo(() => userRole === 'SUPER_ADMIN', [userRole]);

  // 狀態
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [stats, setStats] = useState<AdminTaskStats | null>(null);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  // 模態框狀態
  const [selectedTask, setSelectedTask] = useState<AdminTask | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // 創建表單狀態
  const [createForm, setCreateForm] = useState({
    taskType: "CREATE_FILE",
    title: "",
    deadline: "",
    notes: "",
    payload: {} as Record<string, unknown>,
  });
  const [creating, setCreating] = useState(false);

  // 審批狀態
  const [approvalAction, setApprovalAction] = useState("");
  const [approvalComment, setApprovalComment] = useState("");
  const [approving, setApproving] = useState(false);

  // 獲取資料
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 獲取統計
      const statsQuery = `
        query {
          adminTaskStats {
            total
            pending
            processing
            approved
            rejected
            completed
            overdue
          }
        }
      `;

      // 獲取任務列表
      const tasksQuery = `
        query AdminTasks($page: Int, $pageSize: Int, $status: AdminTaskStatus, $taskType: AdminTaskType) {
          adminTasks(page: $page, pageSize: $pageSize, status: $status, taskType: $taskType) {
            items {
              id
              taskNo
              taskType
              title
              applicant {
                id
                name
                email
                role
              }
              processor {
                id
                name
                email
                role
              }
              approver {
                id
                name
                email
                role
              }
              applicationDate
              deadline
              receivedAt
              completedAt
              status
              approvalRoute
              approvalMark
              payload
              notes
              attachments {
                id
                filename
                originalName
                mimeType
                size
                url
                createdAt
              }
              approvalRecords {
                id
                action
                comment
                approver {
                  id
                  name
                  email
                  role
                }
                createdAt
              }
              createdAt
              updatedAt
            }
            pageInfo {
              total
              page
              pageSize
              totalPages
            }
          }
        }
      `;

      const variables: Record<string, unknown> = {
        page: currentPage,
        pageSize: 20,
      };
      if (statusFilter !== "all") variables.status = statusFilter;
      if (typeFilter !== "all") variables.taskType = typeFilter;

      const [statsRes, tasksRes] = await Promise.all([
        fetch("/api/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: statsQuery }),
        }),
        fetch("/api/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: tasksQuery, variables }),
        }),
      ]);

      if (!statsRes.ok || !tasksRes.ok) {
        throw new Error(`HTTP 錯誤: ${statsRes.status || tasksRes.status}`);
      }

      const [statsData, tasksData] = await Promise.all([
        statsRes.json(),
        tasksRes.json(),
      ]);

      if (statsData.errors) {
        console.error("GraphQL Stats Error:", statsData.errors);
        throw new Error(statsData.errors[0].message);
      }
      if (tasksData.errors) {
        console.error("GraphQL Tasks Error:", tasksData.errors);
        throw new Error(tasksData.errors[0].message);
      }

      setStats(statsData.data.adminTaskStats);
      setTasks(tasksData.data.adminTasks.items);
      setPageInfo(tasksData.data.adminTasks.pageInfo);
    } catch (err) {
      console.error("載入資料失敗：", err);
      const errorMessage = err instanceof Error ? err.message : "未知錯誤";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, currentPage]);

  // 使用穩定的依賴項避免無限循環
  useEffect(() => {
    if (status === "authenticated" && isAdmin) {
      fetchData();
    }
  }, [status, isAdmin, fetchData]);

  // 創建任務
  const handleCreateTask = async () => {
    if (!createForm.title.trim()) {
      alert("請輸入任務標題");
      return;
    }

    setCreating(true);
    try {
      const mutation = `
        mutation CreateAdminTask($input: CreateAdminTaskInput!) {
          createAdminTask(input: $input) {
            id
            taskNo
          }
        }
      `;

      const variables = {
        input: {
          taskType: createForm.taskType,
          title: createForm.title,
          deadline: createForm.deadline || null,
          payload: createForm.payload,
          notes: createForm.notes || null,
        },
      };

      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: mutation, variables }),
      });

      const data = await res.json();

      if (data.errors) {
        throw new Error(data.errors[0].message);
      }

      alert(`任務創建成功！編號：${data.data.createAdminTask.taskNo}`);
      setShowCreateModal(false);
      setCreateForm({
        taskType: "CREATE_FILE",
        title: "",
        deadline: "",
        notes: "",
        payload: {},
      });
      fetchData();
    } catch (error) {
      console.error("創建失敗：", error);
      alert(`創建失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
    } finally {
      setCreating(false);
    }
  };

  // 審批操作
  const handleApproval = async () => {
    if (!selectedTask || !approvalAction) {
      alert("請選擇審批操作");
      return;
    }

    setApproving(true);
    try {
      const mutation = `
        mutation ApproveTask($input: ApprovalInput!) {
          approveTask(input: $input) {
            id
            status
            approvalMark
          }
        }
      `;

      const variables = {
        input: {
          taskId: selectedTask.id,
          action: approvalAction,
          comment: approvalComment || null,
        },
      };

      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: mutation, variables }),
      });

      const data = await res.json();

      if (data.errors) {
        throw new Error(data.errors[0].message);
      }

      alert("審批操作成功！");
      setShowDetailModal(false);
      setApprovalAction("");
      setApprovalComment("");
      fetchData();
    } catch (error) {
      console.error("審批失敗：", error);
      alert(`審批失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
    } finally {
      setApproving(false);
    }
  };

  // 格式化日期
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 獲取狀態標籤
  const getStatusBadge = (status: string) => {
    const badge = statusLabels[status] || statusLabels.PENDING;
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.className}`}
      >
        {badge.label}
      </span>
    );
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
  if (!isAdmin) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md">
            <span className="text-6xl mb-4 block">🔒</span>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">權限不足</h1>
            <p className="text-gray-600 mb-6">
              您沒有權限訪問行政事務管理頁面
            </p>
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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              行政事務管理
            </h1>
            <p className="text-gray-600">管理所有行政申請單與審批流程</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <span>+</span>
            新增申請
          </button>
        </div>

        {/* 統計卡片 */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-blue-500">
              <p className="text-sm text-gray-600 mb-1">總計</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-yellow-500">
              <p className="text-sm text-gray-600 mb-1">待處理</p>
              <p className="text-2xl font-bold text-yellow-600">
                {stats.pending}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-blue-600">
              <p className="text-sm text-gray-600 mb-1">處理中</p>
              <p className="text-2xl font-bold text-blue-600">
                {stats.processing}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-green-500">
              <p className="text-sm text-gray-600 mb-1">已批准</p>
              <p className="text-2xl font-bold text-green-600">
                {stats.approved}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-red-500">
              <p className="text-sm text-gray-600 mb-1">已退回</p>
              <p className="text-2xl font-bold text-red-600">
                {stats.rejected}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-gray-500">
              <p className="text-sm text-gray-600 mb-1">已完成</p>
              <p className="text-2xl font-bold text-gray-600">
                {stats.completed}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-orange-500">
              <p className="text-sm text-gray-600 mb-1">逾期</p>
              <p className="text-2xl font-bold text-orange-600">
                {stats.overdue}
              </p>
            </div>
          </div>
        )}

        {/* 篩選器 */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            {/* 狀態篩選 */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">狀態：</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">全部</option>
                <option value="PENDING">待處理</option>
                <option value="PROCESSING">處理中</option>
                <option value="APPROVED">已批准</option>
                <option value="REJECTED">已退回</option>
                <option value="COMPLETED">已完成</option>
              </select>
            </div>

            {/* 類型篩選 */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">類型：</span>
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">全部</option>
                {Object.entries(taskTypeLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
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

        {/* 任務列表 */}
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">載入中...</p>
          </div>
        ) : error ? null : tasks.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-16 text-center">
            <span className="text-6xl mb-4 block">📋</span>
            <p className="text-xl text-gray-900 font-semibold mb-2">
              尚無行政任務
            </p>
            <p className="text-gray-600">點擊右上角「新增申請」開始創建任務</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      編號
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      類型
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      標題
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      申請人
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      狀態
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      申請時間
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono text-gray-900">
                          {task.taskNo}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                          {taskTypeLabels[task.taskType] || task.taskType}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                          {task.title}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {task.applicant?.name || task.applicant?.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(task.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {formatDate(task.applicationDate)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setSelectedTask(task);
                            setShowDetailModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                        >
                          查看詳情
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 分頁 */}
            {pageInfo && pageInfo.totalPages > 1 && (
              <div className="px-6 py-4 border-t flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  共 {pageInfo.total} 筆，第 {pageInfo.page} /{" "}
                  {pageInfo.totalPages} 頁
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    上一頁
                  </button>
                  <button
                    onClick={() =>
                      setCurrentPage((p) =>
                        Math.min(pageInfo.totalPages, p + 1)
                      )
                    }
                    disabled={currentPage === pageInfo.totalPages}
                    className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    下一頁
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 創建任務模態框 */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  新增行政申請
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* 任務類型 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    申請類型 *
                  </label>
                  <select
                    value={createForm.taskType}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, taskType: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(taskTypeLabels).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 標題 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    任務標題 *
                  </label>
                  <input
                    type="text"
                    value={createForm.title}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, title: e.target.value })
                    }
                    placeholder="請輸入任務標題"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* 完成限期 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    完成限期
                  </label>
                  <input
                    type="datetime-local"
                    value={createForm.deadline}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, deadline: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* 備註 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    備註
                  </label>
                  <textarea
                    value={createForm.notes}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, notes: e.target.value })
                    }
                    rows={4}
                    placeholder="請輸入備註..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                {/* 提交按鈕 */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleCreateTask}
                    disabled={creating}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {creating ? "創建中..." : "確認創建"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 詳情模態框 */}
        {showDetailModal && selectedTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    任務詳情
                  </h2>
                  <p className="text-sm text-gray-600 font-mono">
                    {selectedTask.taskNo}
                  </p>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* 基本資訊 */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    基本資訊
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">類型</p>
                      <p className="text-sm font-medium text-gray-900">
                        {taskTypeLabels[selectedTask.taskType]}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">標題</p>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedTask.title}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">狀態</p>
                      {getStatusBadge(selectedTask.status)}
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">申請人</p>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedTask.applicant?.name ||
                          selectedTask.applicant?.email}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">申請時間</p>
                      <p className="text-sm text-gray-900">
                        {formatDate(selectedTask.applicationDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">完成限期</p>
                      <p className="text-sm text-gray-900">
                        {formatDate(selectedTask.deadline)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 審批路線 */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    審批資訊
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">審批路線：</span>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-medium">
                          {selectedTask.approvalRoute === "V_ROUTE"
                            ? "V 路線"
                            : "- 路線"}
                        </span>
                      </div>
                      {selectedTask.approvalMark && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">
                            審批標記：
                          </span>
                          <span
                            className={`px-2 py-1 text-xs rounded font-bold ${
                              selectedTask.approvalMark === "V"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {selectedTask.approvalMark}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 備註 */}
                {selectedTask.notes && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      備註
                    </h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {selectedTask.notes}
                      </p>
                    </div>
                  </div>
                )}

                {/* 審批記錄 */}
                {selectedTask.approvalRecords.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      審批記錄
                    </h3>
                    <div className="space-y-3">
                      {selectedTask.approvalRecords.map((record) => (
                        <div
                          key={record.id}
                          className="bg-gray-50 p-4 rounded-lg"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <span
                                className={`px-2 py-1 text-xs rounded font-medium ${
                                  record.action === "approve"
                                    ? "bg-green-100 text-green-800"
                                    : record.action === "reject"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-yellow-100 text-yellow-800"
                                }`}
                              >
                                {record.action === "approve"
                                  ? "批准"
                                  : record.action === "reject"
                                  ? "退回"
                                  : "要求修改"}
                              </span>
                              <span className="ml-2 text-sm text-gray-600">
                                {record.approver?.name ||
                                  record.approver?.email}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {formatDate(record.createdAt)}
                            </span>
                          </div>
                          {record.comment && (
                            <p className="mt-2 text-sm text-gray-700">
                              {record.comment}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 審批操作（僅待處理/處理中狀態顯示） */}
                {(selectedTask.status === "PENDING" ||
                  selectedTask.status === "PROCESSING") && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      審批操作
                    </h3>
                    <div className="bg-blue-50 p-4 rounded-lg space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          操作
                        </label>
                        <div className="flex gap-3">
                          <button
                            onClick={() => setApprovalAction("approve")}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              approvalAction === "approve"
                                ? "bg-green-600 text-white"
                                : "bg-white border border-green-600 text-green-600 hover:bg-green-50"
                            }`}
                          >
                            批准
                          </button>
                          <button
                            onClick={() => setApprovalAction("reject")}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              approvalAction === "reject"
                                ? "bg-red-600 text-white"
                                : "bg-white border border-red-600 text-red-600 hover:bg-red-50"
                            }`}
                          >
                            退回
                          </button>
                          <button
                            onClick={() =>
                              setApprovalAction("request_revision")
                            }
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              approvalAction === "request_revision"
                                ? "bg-yellow-600 text-white"
                                : "bg-white border border-yellow-600 text-yellow-600 hover:bg-yellow-50"
                            }`}
                          >
                            要求修改
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          審批意見
                        </label>
                        <textarea
                          value={approvalComment}
                          onChange={(e) => setApprovalComment(e.target.value)}
                          rows={3}
                          placeholder="請輸入審批意見..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                      </div>
                      <button
                        onClick={handleApproval}
                        disabled={!approvalAction || approving}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {approving ? "處理中..." : "確認審批"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
