"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { gql, useQuery } from "@apollo/client";
import AdminLayout from "@/components/Admin/AdminLayout";
import { RoleNames } from "@/lib/permissions";
import Link from "next/link";

const DASHBOARD_QUERY = gql`
  query DashboardData {
    dashboardData {
      stats {
        totalUsers
        activeUsers
        staffCount
        ownerCount
        totalManpowerRequests
        pendingManpowerRequests
        processingManpowerRequests
        completedManpowerRequests
        totalAdminTasks
        pendingAdminTasks
        processingAdminTasks
        completedAdminTasks
        overdueAdminTasks
        monthlyNewRequests
        monthlyCompletedRequests
        monthlyNewTasks
        monthlyCompletedTasks
      }
      recentActivities {
        id
        userName
        action
        entity
        entityId
        createdAt
      }
      recentManpowerRequests {
        id
        requestNo
        companyName
        contactPerson
        status
        createdAt
      }
      recentAdminTasks {
        id
        taskNo
        title
        status
        taskTypeName
        applicantName
        createdAt
      }
    }
  }
`;

// 狀態標籤映射
const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "待處理", color: "bg-yellow-100 text-yellow-800" },
  processing: { label: "處理中", color: "bg-blue-100 text-blue-800" },
  completed: { label: "已完成", color: "bg-green-100 text-green-800" },
  rejected: { label: "已拒絕", color: "bg-red-100 text-red-800" },
  cancelled: { label: "已取消", color: "bg-gray-100 text-gray-800" },
  PENDING: { label: "待處理", color: "bg-yellow-100 text-yellow-800" },
  PROCESSING: { label: "處理中", color: "bg-blue-100 text-blue-800" },
  APPROVED: { label: "已批准", color: "bg-green-100 text-green-800" },
  REJECTED: { label: "已退回", color: "bg-red-100 text-red-800" },
  COMPLETED: { label: "已完成", color: "bg-emerald-100 text-emerald-800" },
};

// 動作標籤映射
const actionLabels: Record<string, string> = {
  login: "登入系統",
  logout: "登出系統",
  create: "新增",
  update: "更新",
  delete: "刪除",
  toggle_status: "切換狀態",
  reset_password: "重置密碼",
  approve: "審批通過",
  reject: "審批退回",
  update_status: "更新狀態",
  assign_processor: "分配處理人",
  assign_approver: "分配審批人",
};

// 實體標籤映射
const entityLabels: Record<string, string> = {
  user: "用戶",
  admin_task: "行政任務",
  page: "頁面",
  navigation: "導航",
  manpower_request: "人力需求",
};

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "剛剛";
  if (diffMins < 60) return `${diffMins} 分鐘前`;
  if (diffHours < 24) return `${diffHours} 小時前`;
  if (diffDays < 7) return `${diffDays} 天前`;
  return date.toLocaleDateString("zh-TW");
}

function DashboardContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const { data, loading, error } = useQuery(DASHBOARD_QUERY, {
    skip: status !== "authenticated",
    fetchPolicy: "cache-and-network",
  });

  useEffect(() => {
    const error = searchParams.get("error");
    const reason = searchParams.get("reason");

    if (error === "forbidden") {
      setShowError(true);
      const messages: Record<string, string> = {
        system_only: "此頁面僅限超級管理員訪問",
        no_user_permission: "您沒有權限訪問用戶管理",
        no_content_permission: "您沒有權限訪問內容管理",
        no_settings_permission: "您沒有權限訪問系統設定",
        no_form_permission: "您沒有權限訪問表單管理",
        no_contract_permission: "您沒有權限訪問合約管理",
      };
      setErrorMessage(messages[reason || ""] || "您沒有權限訪問該頁面");

      setTimeout(() => {
        setShowError(false);
        router.replace("/admin/dashboard");
      }, 3000);
    }
  }, [searchParams, router]);

  if (status === "loading") {
    return null;
  }

  if (!session) {
    return null;
  }

  const stats = data?.dashboardData?.stats;
  const recentActivities = data?.dashboardData?.recentActivities || [];
  const recentManpowerRequests = data?.dashboardData?.recentManpowerRequests || [];
  const recentAdminTasks = data?.dashboardData?.recentAdminTasks || [];

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";
  const isOwner = session.user.role === "OWNER";

  return (
    <AdminLayout>
      {/* 權限錯誤提示 */}
      {showError && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg animate-fade-in">
          <div className="flex items-center">
            <span className="text-2xl mr-3">&#128683;</span>
            <div>
              <h3 className="font-semibold text-red-800">訪問被拒絕</h3>
              <p className="text-sm text-red-700">{errorMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* GraphQL 錯誤提示 */}
      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
          <div className="flex items-center">
            <span className="text-2xl mr-3">&#9888;</span>
            <div>
              <h3 className="font-semibold text-red-800">載入數據失敗</h3>
              <p className="text-sm text-red-700">{error.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* 歡迎區域 */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl shadow-lg p-8 text-white mb-8">
        <h2 className="text-3xl font-bold mb-2">
          歡迎回來，{session.user.name || "用戶"}！
        </h2>
        <p className="text-blue-100">
          您目前的身份是{" "}
          <span className="font-semibold">
            {RoleNames[session.user.role]}
          </span>
          {session.user.department && ` · ${session.user.department}`}
        </p>
        {stats && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-blue-100 text-sm">本月新需求</p>
              <p className="text-2xl font-bold">{stats.monthlyNewRequests}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-blue-100 text-sm">本月已完成</p>
              <p className="text-2xl font-bold">{stats.monthlyCompletedRequests}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-blue-100 text-sm">本月新任務</p>
              <p className="text-2xl font-bold">{stats.monthlyNewTasks}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-blue-100 text-sm">任務完成數</p>
              <p className="text-2xl font-bold">{stats.monthlyCompletedTasks}</p>
            </div>
          </div>
        )}
      </div>

      {/* 統計卡片 */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow p-6 animate-pulse">
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* 主要統計 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* 用戶統計 - 僅管理員可見 */}
            {(isSuperAdmin || isOwner) && (
              <Link href="/admin/users" className="block">
                <div className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-blue-100 rounded-lg p-3">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-gray-500">系統用戶</p>
                      <p className="text-2xl font-bold text-gray-900">{stats?.totalUsers || 0}</p>
                      <p className="text-xs text-gray-400">
                        活躍 {stats?.activeUsers || 0} · 業務 {stats?.staffCount || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            )}

            {/* 人力需求 - 待處理 */}
            <Link href="/admin/manpower-requests?status=pending" className="block">
              <div className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-yellow-400">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-yellow-100 rounded-lg p-3">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">待處理需求</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats?.pendingManpowerRequests || 0}</p>
                    <p className="text-xs text-gray-400">共 {stats?.totalManpowerRequests || 0} 筆需求</p>
                  </div>
                </div>
              </div>
            </Link>

            {/* 人力需求 - 處理中 */}
            <Link href="/admin/manpower-requests?status=processing" className="block">
              <div className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-blue-400">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-blue-100 rounded-lg p-3">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">處理中需求</p>
                    <p className="text-2xl font-bold text-blue-600">{stats?.processingManpowerRequests || 0}</p>
                    <p className="text-xs text-gray-400">已完成 {stats?.completedManpowerRequests || 0} 筆</p>
                  </div>
                </div>
              </div>
            </Link>

            {/* 行政任務 - 僅管理員可見完整統計 */}
            {isSuperAdmin ? (
              <Link href="/admin/admin-tasks" className="block">
                <div className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-purple-400">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 bg-purple-100 rounded-lg p-3">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-gray-500">行政任務</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {stats?.pendingAdminTasks || 0}
                        <span className="text-sm font-normal text-gray-400 ml-1">待處理</span>
                      </p>
                      <p className="text-xs text-gray-400">
                        {stats?.overdueAdminTasks > 0 && (
                          <span className="text-red-500 font-medium">逾期 {stats.overdueAdminTasks} · </span>
                        )}
                        共 {stats?.totalAdminTasks || 0} 筆
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="bg-white rounded-xl shadow p-6 border-l-4 border-green-400">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-green-100 rounded-lg p-3">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-500">已完成需求</p>
                    <p className="text-2xl font-bold text-green-600">{stats?.completedManpowerRequests || 0}</p>
                    <p className="text-xs text-gray-400">總計 {stats?.totalManpowerRequests || 0} 筆</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* 兩欄佈局：最近需求 + 最近任務 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* 最近人力需求 */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">最近人力需求</h3>
            <Link href="/admin/manpower-requests" className="text-sm text-blue-600 hover:text-blue-800">
              查看全部 &rarr;
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-gray-100 rounded-lg"></div>
                </div>
              ))}
            </div>
          ) : recentManpowerRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p>暫無人力需求記錄</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentManpowerRequests.map((req: any) => (
                <Link
                  key={req.id}
                  href={`/admin/manpower-requests/${req.id}`}
                  className="block p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {req.companyName || req.contactPerson}
                      </p>
                      <p className="text-sm text-gray-500">
                        {req.requestNo} · {formatTimeAgo(req.createdAt)}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${statusLabels[req.status]?.color || "bg-gray-100"}`}>
                      {statusLabels[req.status]?.label || req.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* 最近行政任務 - 僅管理員可見 */}
        {isSuperAdmin ? (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">最近行政任務</h3>
              <Link href="/admin/admin-tasks" className="text-sm text-blue-600 hover:text-blue-800">
                查看全部 &rarr;
              </Link>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-gray-100 rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : recentAdminTasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p>暫無行政任務記錄</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentAdminTasks.map((task: any) => (
                  <Link
                    key={task.id}
                    href={`/admin/admin-tasks/${task.id}`}
                    className="block p-3 rounded-lg border border-gray-100 hover:border-purple-200 hover:bg-purple-50/50 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{task.title}</p>
                        <p className="text-sm text-gray-500">
                          {task.taskTypeName} · {task.applicantName} · {formatTimeAgo(task.createdAt)}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${statusLabels[task.status]?.color || "bg-gray-100"}`}>
                        {statusLabels[task.status]?.label || task.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* 業務人員看到的是業績統計 */
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">需求狀態分佈</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">待處理</span>
                  <span className="font-medium">{stats?.pendingManpowerRequests || 0} 筆</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded-full transition-all"
                    style={{
                      width: `${stats?.totalManpowerRequests ? (stats.pendingManpowerRequests / stats.totalManpowerRequests * 100) : 0}%`
                    }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">處理中</span>
                  <span className="font-medium">{stats?.processingManpowerRequests || 0} 筆</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-400 rounded-full transition-all"
                    style={{
                      width: `${stats?.totalManpowerRequests ? (stats.processingManpowerRequests / stats.totalManpowerRequests * 100) : 0}%`
                    }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">已完成</span>
                  <span className="font-medium">{stats?.completedManpowerRequests || 0} 筆</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-400 rounded-full transition-all"
                    style={{
                      width: `${stats?.totalManpowerRequests ? (stats.completedManpowerRequests / stats.totalManpowerRequests * 100) : 0}%`
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 最近活動記錄 - 僅管理員可見完整記錄 */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">最近活動記錄</h3>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : recentActivities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>暫無活動記錄</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentActivities.map((activity: any) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  activity.action === "create" ? "bg-green-100" :
                  activity.action === "update" ? "bg-blue-100" :
                  activity.action === "delete" ? "bg-red-100" :
                  activity.action === "login" ? "bg-purple-100" :
                  "bg-gray-100"
                }`}>
                  {activity.action === "create" && (
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  )}
                  {activity.action === "update" && (
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  )}
                  {activity.action === "delete" && (
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                  {activity.action === "login" && (
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                  )}
                  {!["create", "update", "delete", "login"].includes(activity.action) && (
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{activity.userName}</span>
                    {" "}
                    <span className="text-gray-600">
                      {actionLabels[activity.action] || activity.action}
                      {entityLabels[activity.entity] && `了${entityLabels[activity.entity]}`}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500">{formatTimeAgo(activity.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 快速操作 */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">快速操作</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(isSuperAdmin || isOwner) && (
            <Link href="/admin/users/new">
              <button className="w-full flex items-center p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition group">
                <div className="flex-shrink-0 bg-blue-100 rounded-lg p-3 group-hover:bg-blue-200">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <div className="ml-4 text-left">
                  <p className="font-medium text-gray-900">新增用戶</p>
                  <p className="text-sm text-gray-500">建立新的系統用戶</p>
                </div>
              </button>
            </Link>
          )}

          <Link href="/admin/manpower-requests">
            <button className="w-full flex items-center p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition group">
              <div className="flex-shrink-0 bg-green-100 rounded-lg p-3 group-hover:bg-green-200">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-4 text-left">
                <p className="font-medium text-gray-900">人力需求管理</p>
                <p className="text-sm text-gray-500">查看與處理需求記錄</p>
              </div>
            </button>
          </Link>

          {isSuperAdmin && (
            <Link href="/admin/admin-tasks">
              <button className="w-full flex items-center p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition group">
                <div className="flex-shrink-0 bg-purple-100 rounded-lg p-3 group-hover:bg-purple-200">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <div className="ml-4 text-left">
                  <p className="font-medium text-gray-900">行政任務</p>
                  <p className="text-sm text-gray-500">管理行政事務簽核</p>
                </div>
              </button>
            </Link>
          )}

          {!isSuperAdmin && !isOwner && (
            <Link href="/admin/profile">
              <button className="w-full flex items-center p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition group">
                <div className="flex-shrink-0 bg-indigo-100 rounded-lg p-3 group-hover:bg-indigo-200">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="ml-4 text-left">
                  <p className="font-medium text-gray-900">個人資料</p>
                  <p className="text-sm text-gray-500">管理您的個人資訊</p>
                </div>
              </button>
            </Link>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </AdminLayout>
    }>
      <DashboardContent />
    </Suspense>
  );
}
