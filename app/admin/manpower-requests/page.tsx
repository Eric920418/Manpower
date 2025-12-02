"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { usePermission } from "@/hooks/usePermission";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/Admin/AdminLayout";
import Image from "next/image";
import { hasPermission } from "@/lib/permissions";
import type { Role } from "@prisma/client";

interface ManpowerRequest {
  id: number;
  requestNo: string;
  selectedResumeIds: string[];
  companyName: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  positionTitle: string | null;
  jobDescription: string | null;
  quantity: number;
  salaryRange: string | null;
  expectedStartDate: string | null;
  workLocation: string | null;
  additionalRequirements: string | null;
  status: string;
  notes: string | null;
  processedBy: string | null;
  processedAt: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ManpowerRequestStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  rejected: number;
  cancelled: number;
}

export default function ManpowerRequestsPage() {
  const { data: session, status } = useSession();
  const { can, getRole } = usePermission();
  const router = useRouter();

  // 使用穩定的權限檢查，避免無限循環
  const userRole = getRole();
  const canReadForms = useMemo(() => {
    if (!userRole) return false;
    return hasPermission(userRole as Role, 'form:read');
  }, [userRole]);

  const [requests, setRequests] = useState<ManpowerRequest[]>([]);
  const [stats, setStats] = useState<ManpowerRequestStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [selectedRequest, setSelectedRequest] =
    useState<ManpowerRequest | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [updateStatus, setUpdateStatus] = useState("");
  const [updateNotes, setUpdateNotes] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 獲取統計資料
      const statsQuery = `
        query {
          manpowerRequestStats {
            total
            pending
            processing
            completed
            rejected
            cancelled
          }
        }
      `;

      // 獲取需求列表
      const requestsQuery = filter !== "all"
        ? `query {
            manpowerRequests(filter: { status: "${filter}" }) {
              id
              requestNo
              selectedResumeIds
              companyName
              contactPerson
              contactPhone
              contactEmail
              positionTitle
              jobDescription
              quantity
              salaryRange
              expectedStartDate
              workLocation
              additionalRequirements
              status
              notes
              processedBy
              processedAt
              ipAddress
              userAgent
              createdAt
              updatedAt
            }
          }`
        : `query {
            manpowerRequests {
              id
              requestNo
              selectedResumeIds
              companyName
              contactPerson
              contactPhone
              contactEmail
              positionTitle
              jobDescription
              quantity
              salaryRange
              expectedStartDate
              workLocation
              additionalRequirements
              status
              notes
              processedBy
              processedAt
              ipAddress
              userAgent
              createdAt
              updatedAt
            }
          }`;

      const [statsRes, requestsRes] = await Promise.all([
        fetch("/api/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: statsQuery }),
        }),
        fetch("/api/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: requestsQuery }),
        }),
      ]);

      const [statsData, requestsData] = await Promise.all([
        statsRes.json(),
        requestsRes.json(),
      ]);

      if (statsData.errors) {
        throw new Error(statsData.errors[0].message);
      }
      if (requestsData.errors) {
        throw new Error(requestsData.errors[0].message);
      }

      setStats(statsData.data.manpowerRequestStats);
      setRequests(requestsData.data.manpowerRequests);
    } catch (error) {
      console.error("載入資料失敗：", error);
      alert(`載入失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    // 只在已登入且有權限時才載入資料
    if (status === "authenticated" && canReadForms) {
      fetchData();
    }
  }, [status, canReadForms, fetchData]);

  const handleViewDetails = (request: ManpowerRequest) => {
    setSelectedRequest(request);
    setUpdateStatus(request.status);
    setUpdateNotes(request.notes || "");
    setShowModal(true);
  };

  const handleUpdateRequest = async () => {
    if (!selectedRequest) return;

    setUpdating(true);
    try {
      const mutation = `
        mutation UpdateManpowerRequest($input: UpdateManpowerRequestInput!) {
          updateManpowerRequest(input: $input) {
            id
            status
            notes
            processedBy
            processedAt
          }
        }
      `;

      const variables = {
        input: {
          id: selectedRequest.id,
          status: updateStatus,
          notes: updateNotes || null,
          processedBy: session?.user?.id || null,
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

      alert("✅ 更新成功！");
      setShowModal(false);
      fetchData();
    } catch (error) {
      console.error("更新失敗：", error);
      alert(`❌ 更新失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      pending: { label: "待處理", className: "bg-yellow-100 text-yellow-800" },
      processing: { label: "處理中", className: "bg-blue-100 text-blue-800" },
      completed: { label: "已完成", className: "bg-green-100 text-green-800" },
      rejected: { label: "已拒絕", className: "bg-red-100 text-red-800" },
      cancelled: { label: "已取消", className: "bg-gray-100 text-gray-800" },
    };

    const badge = badges[status] || badges.pending;

    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.className}`}
      >
        {badge.label}
      </span>
    );
  };

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

  // 載入中
  if (status === "loading") {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
            <p className="text-text-secondary">載入中...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // 權限不足
  if (!can("form:read")) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md">
            <span className="material-symbols-outlined text-6xl text-red-500 mb-4">
              block
            </span>
            <h1 className="text-2xl font-bold text-text-primary mb-2">
              權限不足
            </h1>
            <p className="text-text-secondary mb-6">
              您沒有權限訪問人力需求管理頁面
            </p>
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="px-6 py-2 bg-brand-primary text-text-on-brand rounded-lg hover:bg-brand-accent transition-colors"
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            人力需求管理
          </h1>
          <p className="text-text-secondary">
            查看和處理所有提交的人力需求表單
          </p>
        </div>

        {/* 統計卡片 */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-blue-500">
              <p className="text-sm text-text-secondary mb-1">總計</p>
              <p className="text-2xl font-bold text-text-primary">
                {stats.total}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-yellow-500">
              <p className="text-sm text-text-secondary mb-1">待處理</p>
              <p className="text-2xl font-bold text-yellow-600">
                {stats.pending}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-blue-600">
              <p className="text-sm text-text-secondary mb-1">處理中</p>
              <p className="text-2xl font-bold text-blue-600">
                {stats.processing}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-green-500">
              <p className="text-sm text-text-secondary mb-1">已完成</p>
              <p className="text-2xl font-bold text-green-600">
                {stats.completed}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-red-500">
              <p className="text-sm text-text-secondary mb-1">已拒絕</p>
              <p className="text-2xl font-bold text-red-600">
                {stats.rejected}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-md p-4 border-l-4 border-gray-500">
              <p className="text-sm text-text-secondary mb-1">已取消</p>
              <p className="text-2xl font-bold text-gray-600">
                {stats.cancelled}
              </p>
            </div>
          </div>
        )}

        {/* 篩選器 */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === "all"
                  ? "bg-brand-primary text-text-on-brand"
                  : "bg-gray-100 text-text-secondary hover:bg-gray-200"
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setFilter("pending")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === "pending"
                  ? "bg-yellow-500 text-white"
                  : "bg-gray-100 text-text-secondary hover:bg-gray-200"
              }`}
            >
              待處理
            </button>
            <button
              onClick={() => setFilter("processing")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === "processing"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-text-secondary hover:bg-gray-200"
              }`}
            >
              處理中
            </button>
            <button
              onClick={() => setFilter("completed")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === "completed"
                  ? "bg-green-500 text-white"
                  : "bg-gray-100 text-text-secondary hover:bg-gray-200"
              }`}
            >
              已完成
            </button>
            <button
              onClick={() => setFilter("rejected")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === "rejected"
                  ? "bg-red-500 text-white"
                  : "bg-gray-100 text-text-secondary hover:bg-gray-200"
              }`}
            >
              已拒絕
            </button>
          </div>
        </div>

        {/* 需求列表 */}
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mx-auto mb-4"></div>
            <p className="text-text-secondary">載入中...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-16 text-center">
            <span className="material-symbols-outlined text-6xl text-text-secondary mb-4">
              inbox
            </span>
            <p className="text-xl text-text-primary font-semibold mb-2">
              尚無人力需求
            </p>
            <p className="text-text-secondary">
              {filter === "all"
                ? "目前沒有任何人力需求提交"
                : `目前沒有「${getStatusBadge(filter).props.children}」狀態的需求`}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-border">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      公司名稱
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      電話號碼
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      人數
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      狀態
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      提交時間
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {requests.map((request) => (
                    <tr
                      key={request.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-text-primary">
                          {request.companyName}
                        </div>
                        <div className="text-xs text-text-secondary">
                          {request.contactPerson}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-text-primary">
                          {request.contactPhone}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-text-primary">
                          {request.quantity} 位
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(request.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-text-secondary">
                          {formatDate(request.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleViewDetails(request)}
                          className="text-brand-primary hover:text-brand-accent font-medium text-sm flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-base">
                            visibility
                          </span>
                          查看
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 詳情模態框 */}
        {showModal && selectedRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              {/* 模態框標題 */}
              <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-text-primary">
                    人力需求詳情
                  </h2>
                  <p className="text-sm text-text-secondary font-mono">
                    {selectedRequest.requestNo}
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-text-secondary">
                    close
                  </span>
                </button>
              </div>

              {/* 模態框內容 */}
              <div className="p-6 space-y-6">
                {/* 公司資訊 */}
                <div>
                  <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-brand-primary">
                      business
                    </span>
                    公司資訊
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <p className="text-xs text-text-secondary mb-1">
                        公司名稱
                      </p>
                      <p className="text-sm font-semibold text-text-primary">
                        {selectedRequest.companyName}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary mb-1">
                        聯絡人
                      </p>
                      <p className="text-sm font-semibold text-text-primary">
                        {selectedRequest.contactPerson}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary mb-1">
                        聯絡電話
                      </p>
                      <p className="text-sm font-semibold text-text-primary">
                        {selectedRequest.contactPhone}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary mb-1">Email</p>
                      <p className="text-sm font-semibold text-text-primary">
                        {selectedRequest.contactEmail}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 職位需求 */}
                <div>
                  <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-brand-primary">
                      work
                    </span>
                    職位需求
                  </h3>
                  <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-text-secondary mb-1">
                          職位名稱
                        </p>
                        <p className="text-sm font-semibold text-text-primary">
                          {selectedRequest.positionTitle}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-text-secondary mb-1">
                          需要人數
                        </p>
                        <p className="text-sm font-semibold text-text-primary">
                          {selectedRequest.quantity} 位
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-text-secondary mb-1">
                          薪資範圍
                        </p>
                        <p className="text-sm font-semibold text-text-primary">
                          {selectedRequest.salaryRange || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-text-secondary mb-1">
                          預計到職日期
                        </p>
                        <p className="text-sm font-semibold text-text-primary">
                          {selectedRequest.expectedStartDate
                            ? new Date(
                                selectedRequest.expectedStartDate
                              ).toLocaleDateString("zh-TW")
                            : "-"}
                        </p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-xs text-text-secondary mb-1">
                          工作地點
                        </p>
                        <p className="text-sm font-semibold text-text-primary">
                          {selectedRequest.workLocation || "-"}
                        </p>
                      </div>
                    </div>
                    {selectedRequest.jobDescription && (
                      <div>
                        <p className="text-xs text-text-secondary mb-1">
                          工作內容描述
                        </p>
                        <p className="text-sm text-text-primary whitespace-pre-wrap">
                          {selectedRequest.jobDescription}
                        </p>
                      </div>
                    )}
                    {selectedRequest.additionalRequirements && (
                      <div>
                        <p className="text-xs text-text-secondary mb-1">
                          其他要求
                        </p>
                        <p className="text-sm text-text-primary whitespace-pre-wrap">
                          {selectedRequest.additionalRequirements}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 選中的人員 */}
                <div>
                  <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-brand-primary">
                      group
                    </span>
                    選中的求職者（
                    {Array.isArray(selectedRequest.selectedResumeIds)
                      ? selectedRequest.selectedResumeIds.length
                      : 0}{" "}
                    位）
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    {Array.isArray(selectedRequest.selectedResumeIds) &&
                    selectedRequest.selectedResumeIds.length > 0 ? (
                      // 檢查是否為完整的工作者資料（有 name 屬性）或只是 ID
                      typeof selectedRequest.selectedResumeIds[0] === "object" ? (
                        // 顯示完整的工作者卡片
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {selectedRequest.selectedResumeIds.map((resume: any, index: number) => (
                            <div
                              key={index}
                              className="flex items-center gap-3 p-3 bg-white border border-brand-primary/20 rounded-lg"
                            >
                              <Image
                                src={resume.photo}
                                alt={resume.name}
                                width={56}
                                height={56}
                                className="w-14 h-14 rounded-full object-cover ring-2 ring-brand-primary/20"
                                unoptimized
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-text-primary text-sm truncate">
                                  {resume.name}
                                </p>
                                <p className="text-xs text-text-secondary truncate">
                                  {resume.title}
                                </p>
                                <p className="text-xs text-gray-500 font-mono">
                                  ID: {resume.id}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        // 舊格式：只顯示 ID
                        <div className="flex flex-wrap gap-2">
                          {selectedRequest.selectedResumeIds.map((id: any, index: number) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-brand-primary/10 text-brand-secondary text-sm font-mono rounded-full border border-brand-primary/20"
                            >
                              #{id}
                            </span>
                          ))}
                        </div>
                      )
                    ) : (
                      <p className="text-gray-500 text-sm">未選擇任何求職者</p>
                    )}
                  </div>
                </div>

                {/* 狀態管理 - 僅 SUPER_ADMIN 可操作 */}
                {session?.user?.role === "SUPER_ADMIN" && (
                  <div>
                    <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-brand-primary">
                        edit_note
                      </span>
                      處理狀態
                    </h3>
                    <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                      <div>
                        <label className="block text-sm font-semibold text-text-primary mb-2">
                          狀態
                        </label>
                        <select
                          value={updateStatus}
                          onChange={(e) => setUpdateStatus(e.target.value)}
                          className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                        >
                          <option value="pending">待處理</option>
                          <option value="processing">處理中</option>
                          <option value="completed">已完成</option>
                          <option value="rejected">已拒絕</option>
                          <option value="cancelled">已取消</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-text-primary mb-2">
                          處理細節
                        </label>
                        <textarea
                          value={updateNotes}
                          onChange={(e) => setUpdateNotes(e.target.value)}
                          rows={4}
                          className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/50 resize-none"
                          placeholder="輸入處理細節..."
                        />
                      </div>
                      <button
                        onClick={handleUpdateRequest}
                        disabled={updating}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-brand-primary text-text-on-brand rounded-lg hover:bg-brand-accent transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {updating ? (
                          <>
                            <span className="material-symbols-outlined animate-spin">
                              progress_activity
                            </span>
                            更新中...
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined">
                              save
                            </span>
                            儲存變更
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* 系統資訊 */}
                <div>
                  <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-brand-primary">
                      info
                    </span>
                    系統資訊
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg text-xs">
                    <div>
                      <p className="text-text-secondary mb-1">提交時間</p>
                      <p className="text-text-primary font-mono">
                        {formatDate(selectedRequest.createdAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-text-secondary mb-1">更新時間</p>
                      <p className="text-text-primary font-mono">
                        {formatDate(selectedRequest.updatedAt)}
                      </p>
                    </div>
                    {selectedRequest.processedAt && (
                      <div>
                        <p className="text-text-secondary mb-1">處理時間</p>
                        <p className="text-text-primary font-mono">
                          {formatDate(selectedRequest.processedAt)}
                        </p>
                      </div>
                    )}
                    {selectedRequest.processedBy && (
                      <div>
                        <p className="text-text-secondary mb-1">處理人員</p>
                        <p className="text-text-primary font-mono">
                          {selectedRequest.processedBy}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-text-secondary mb-1">IP 地址</p>
                      <p className="text-text-primary font-mono">
                        {selectedRequest.ipAddress || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
