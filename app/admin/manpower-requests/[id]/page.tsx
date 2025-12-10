"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import AdminLayout from "@/components/Admin/AdminLayout";
import Image from "next/image";

interface ManpowerRequest {
  id: number;
  requestNo: string;
  selectedResumeIds: any[];
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

export default function ManpowerRequestDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [request, setRequest] = useState<ManpowerRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState("");
  const [updateNotes, setUpdateNotes] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);
    try {
      const query = `
        query GetManpowerRequest($id: Int!) {
          manpowerRequest(id: $id) {
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
        }
      `;

      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          variables: { id: parseInt(id) }
        }),
      });

      const data = await res.json();

      if (data.errors) {
        throw new Error(data.errors[0].message);
      }

      if (!data.data.manpowerRequest) {
        throw new Error("找不到此人力需求");
      }

      setRequest(data.data.manpowerRequest);
      setUpdateStatus(data.data.manpowerRequest.status);
      setUpdateNotes(data.data.manpowerRequest.notes || "");
    } catch (err) {
      console.error("載入資料失敗：", err);
      setError(err instanceof Error ? err.message : "載入失敗");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchData();
    }
  }, [status, fetchData]);

  const handleUpdateRequest = async () => {
    if (!request) return;

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
          id: request.id,
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

      alert("更新成功！");
      fetchData();
    } catch (err) {
      console.error("更新失敗：", err);
      alert(`更新失敗：${err instanceof Error ? err.message : "未知錯誤"}`);
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
        className={`px-3 py-1 rounded-full text-sm font-semibold ${badge.className}`}
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

  if (status === "loading" || loading) {
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

  if (error) {
    return (
      <AdminLayout>
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
            <span className="material-symbols-outlined text-5xl text-red-500 mb-4">
              error
            </span>
            <h2 className="text-xl font-bold text-red-800 mb-2">載入失敗</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => router.push("/admin/manpower-requests")}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              返回列表
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!request) {
    return (
      <AdminLayout>
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
            <span className="material-symbols-outlined text-5xl text-gray-400 mb-4">
              search_off
            </span>
            <h2 className="text-xl font-bold text-gray-700 mb-2">找不到資料</h2>
            <p className="text-gray-500 mb-4">此人力需求不存在或已被刪除</p>
            <button
              onClick={() => router.push("/admin/manpower-requests")}
              className="px-6 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-accent transition-colors"
            >
              返回列表
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        {/* 頁面標題 */}
        <div className="mb-6">
          <button
            onClick={() => router.push("/admin/manpower-requests")}
            className="flex items-center gap-1 text-text-secondary hover:text-brand-primary transition-colors mb-4"
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
            返回列表
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-text-primary mb-1">
                人力需求詳情
              </h1>
              <p className="text-sm text-text-secondary font-mono">
                {request.requestNo}
              </p>
            </div>
            {getStatusBadge(request.status)}
          </div>
        </div>

        <div className="space-y-6">
          {/* 公司資訊 */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-brand-primary">
                business
              </span>
              公司資訊
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-text-secondary mb-1">公司名稱</p>
                <p className="text-sm font-semibold text-text-primary">
                  {request.companyName}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-secondary mb-1">聯絡人</p>
                <p className="text-sm font-semibold text-text-primary">
                  {request.contactPerson}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-secondary mb-1">聯絡電話</p>
                <p className="text-sm font-semibold text-text-primary">
                  {request.contactPhone}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-secondary mb-1">Email</p>
                <p className="text-sm font-semibold text-text-primary">
                  {request.contactEmail}
                </p>
              </div>
            </div>
          </div>

          {/* 職位需求 */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-brand-primary">
                work
              </span>
              職位需求
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-text-secondary mb-1">職位名稱</p>
                  <p className="text-sm font-semibold text-text-primary">
                    {request.positionTitle || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary mb-1">需要人數</p>
                  <p className="text-sm font-semibold text-text-primary">
                    {request.quantity} 位
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary mb-1">薪資範圍</p>
                  <p className="text-sm font-semibold text-text-primary">
                    {request.salaryRange || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-secondary mb-1">預計到職日期</p>
                  <p className="text-sm font-semibold text-text-primary">
                    {request.expectedStartDate
                      ? new Date(request.expectedStartDate).toLocaleDateString("zh-TW")
                      : "-"}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs text-text-secondary mb-1">工作地點</p>
                  <p className="text-sm font-semibold text-text-primary">
                    {request.workLocation || "-"}
                  </p>
                </div>
              </div>
              {request.jobDescription && (
                <div>
                  <p className="text-xs text-text-secondary mb-1">工作內容描述</p>
                  <p className="text-sm text-text-primary whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                    {request.jobDescription}
                  </p>
                </div>
              )}
              {request.additionalRequirements && (
                <div>
                  <p className="text-xs text-text-secondary mb-1">其他要求</p>
                  <p className="text-sm text-text-primary whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                    {request.additionalRequirements}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 選中的人員 */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-brand-primary">
                group
              </span>
              選中的求職者（
              {Array.isArray(request.selectedResumeIds)
                ? request.selectedResumeIds.length
                : 0}{" "}
              位）
            </h3>
            <div>
              {Array.isArray(request.selectedResumeIds) &&
              request.selectedResumeIds.length > 0 ? (
                typeof request.selectedResumeIds[0] === "object" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {request.selectedResumeIds.map((resume: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-gray-50 border border-brand-primary/20 rounded-lg"
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
                  <div className="flex flex-wrap gap-2">
                    {request.selectedResumeIds.map((id: any, index: number) => (
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
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-brand-primary">
                  edit_note
                </span>
                處理狀態
              </h3>
              <div className="space-y-4">
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
                      <span className="material-symbols-outlined">save</span>
                      儲存變更
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* 系統資訊 */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-brand-primary">
                info
              </span>
              系統資訊
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-text-secondary mb-1">提交時間</p>
                <p className="text-text-primary font-mono">
                  {formatDate(request.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-text-secondary mb-1">更新時間</p>
                <p className="text-text-primary font-mono">
                  {formatDate(request.updatedAt)}
                </p>
              </div>
              {request.processedAt && (
                <div>
                  <p className="text-text-secondary mb-1">處理時間</p>
                  <p className="text-text-primary font-mono">
                    {formatDate(request.processedAt)}
                  </p>
                </div>
              )}
              {request.processedBy && (
                <div>
                  <p className="text-text-secondary mb-1">處理人員</p>
                  <p className="text-text-primary font-mono">
                    {request.processedBy}
                  </p>
                </div>
              )}
              <div>
                <p className="text-text-secondary mb-1">IP 地址</p>
                <p className="text-text-primary font-mono">
                  {request.ipAddress || "-"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
