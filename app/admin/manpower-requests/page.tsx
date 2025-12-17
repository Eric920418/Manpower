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

  // 新增表單相關狀態
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    companyName: "",
    contactPerson: "",
    contactPhone: "",
    contactEmail: "",
    lineId: "",
    positionTitle: "",
    jobDescription: "",
    quantity: 1,
    salaryRange: "",
    expectedStartDate: "",
    workLocation: "",
    additionalRequirements: "",
  });

  // 移工選擇相關狀態
  interface WorkerOption {
    id: string;
    name: string;
    title: string;
    photo: string;
    country: string;
  }
  const [workers, setWorkers] = useState<WorkerOption[]>([]);
  const [selectedWorkers, setSelectedWorkers] = useState<WorkerOption[]>([]);
  const [workersLoading, setWorkersLoading] = useState(false);
  const [workerSearch, setWorkerSearch] = useState("");

  // 申請資格選項
  const qualificationOptions = [
    { id: "barthelIndex", label: "巴氏量表" },
    { id: "longTermCare6Months", label: "曾使用長照六個月" },
    { id: "disabilityCard", label: "身心障礙手冊" },
    { id: "dementiaAssessment", label: "失智評估量表" },
    { id: "over80NoAssessment", label: "80歲以上長者免評" },
    { id: "domesticHelper", label: "申請幫傭資格" },
    { id: "previousForeignWorker", label: "一年內曾聘僱外籍移工" },
    { id: "cancerNoAssessment", label: "癌症免評患者" },
    { id: "needAssistance", label: "需業務人員協助了解申請資格" },
  ];
  const [selectedQualifications, setSelectedQualifications] = useState<string[]>([]);

  // 檢查 form:create 權限
  const canCreateForm = useMemo(() => {
    if (!userRole) return false;
    return can('form:create');
  }, [userRole, can]);

  // 獲取移工列表
  const fetchWorkers = useCallback(async () => {
    setWorkersLoading(true);
    try {
      const query = `
        query workersPage {
          workersPage {
            workers
          }
        }
      `;

      const response = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const result = await response.json();

      if (result.errors) {
        throw new Error(result.errors[0]?.message || "GraphQL 查詢錯誤");
      }

      const workersData = result.data?.workersPage?.[0]?.workers || [];
      const workerOptions: WorkerOption[] = workersData.map((w: any) => ({
        id: w.id,
        name: w.name,
        title: w.category || "專業人才",
        photo: w.photo || "/placeholder-avatar.png",
        country: w.country || "",
      }));

      setWorkers(workerOptions);
    } catch (error) {
      console.error("獲取移工列表失敗:", error);
    } finally {
      setWorkersLoading(false);
    }
  }, []);

  // 當開啟新增 modal 時載入移工列表
  useEffect(() => {
    if (showCreateModal && workers.length === 0) {
      fetchWorkers();
    }
  }, [showCreateModal, workers.length, fetchWorkers]);

  // 篩選移工列表
  const filteredWorkers = useMemo(() => {
    if (!workerSearch.trim()) return workers;
    const search = workerSearch.toLowerCase();
    return workers.filter(
      (w) =>
        w.name.toLowerCase().includes(search) ||
        w.title.toLowerCase().includes(search) ||
        w.country.toLowerCase().includes(search)
    );
  }, [workers, workerSearch]);

  // 選擇/取消選擇移工
  const toggleWorkerSelection = (worker: WorkerOption) => {
    setSelectedWorkers((prev) => {
      const isSelected = prev.some((w) => w.id === worker.id);
      if (isSelected) {
        return prev.filter((w) => w.id !== worker.id);
      } else {
        if (prev.length >= 15) {
          alert("最多只能選擇 15 位移工");
          return prev;
        }
        return [...prev, worker];
      }
    });
  };

  // 移除已選擇的移工
  const removeSelectedWorker = (workerId: string) => {
    setSelectedWorkers((prev) => prev.filter((w) => w.id !== workerId));
  };

  // 切換申請資格
  const toggleQualification = (qualificationId: string) => {
    setSelectedQualifications((prev) => {
      if (prev.includes(qualificationId)) {
        return prev.filter((id) => id !== qualificationId);
      } else {
        return [...prev, qualificationId];
      }
    });
  };

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

  const handleCreateRequest = async () => {
    // 驗證必填欄位
    if (!createForm.contactPerson.trim()) {
      alert("請填寫聯絡人姓名");
      return;
    }
    if (!createForm.contactPhone.trim()) {
      alert("請填寫聯絡電話");
      return;
    }

    setCreating(true);
    try {
      const mutation = `
        mutation CreateManpowerRequest($input: CreateManpowerRequestInput!) {
          createManpowerRequest(input: $input) {
            id
            requestNo
            companyName
            contactPerson
            contactPhone
            status
            createdAt
          }
        }
      `;

      const variables = {
        input: {
          companyName: createForm.companyName || null,
          contactPerson: createForm.contactPerson,
          contactPhone: createForm.contactPhone,
          contactEmail: createForm.contactEmail || null,
          lineId: createForm.lineId || null,
          positionTitle: createForm.positionTitle || null,
          jobDescription: createForm.jobDescription || null,
          quantity: createForm.quantity || 1,
          salaryRange: createForm.salaryRange || null,
          expectedStartDate: createForm.expectedStartDate || null,
          workLocation: createForm.workLocation || null,
          additionalRequirements: createForm.additionalRequirements || null,
          selectedResumeIds: selectedWorkers.map((w) => ({
            id: w.id,
            name: w.name,
            title: w.title,
            photo: w.photo,
          })),
          qualifications: selectedQualifications.length > 0 ? selectedQualifications : null,
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

      alert(`新增成功！需求單號：${data.data.createManpowerRequest.requestNo}`);
      setShowCreateModal(false);
      // 重置表單
      setCreateForm({
        companyName: "",
        contactPerson: "",
        contactPhone: "",
        contactEmail: "",
        lineId: "",
        positionTitle: "",
        jobDescription: "",
        quantity: 1,
        salaryRange: "",
        expectedStartDate: "",
        workLocation: "",
        additionalRequirements: "",
      });
      setSelectedWorkers([]);
      setSelectedQualifications([]);
      setWorkerSearch("");
      fetchData();
    } catch (error) {
      console.error("新增失敗：", error);
      alert(`新增失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
    } finally {
      setCreating(false);
    }
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
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              人力需求管理
            </h1>
            <p className="text-text-secondary">
              查看和處理所有提交的人力需求表單
            </p>
          </div>
          {canCreateForm && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-brand-primary text-text-on-brand rounded-lg hover:bg-brand-accent transition-colors font-bold"
            >
              <span className="material-symbols-outlined">add</span>
              新增需求
            </button>
          )}
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

        {/* 新增需求模態框 */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* 模態框標題 */}
              <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-text-primary">
                    新增人力需求
                  </h2>
                  <p className="text-sm text-text-secondary">
                    手動建立新的人力需求單
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <span className="material-symbols-outlined text-text-secondary">
                    close
                  </span>
                </button>
              </div>

              {/* 表單內容 */}
              <div className="p-6 space-y-6">
                {/* 聯絡資訊 */}
                <div>
                  <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-brand-primary">
                      contact_phone
                    </span>
                    聯絡資訊
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-text-primary mb-2">
                        公司名稱
                      </label>
                      <input
                        type="text"
                        value={createForm.companyName}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, companyName: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                        placeholder="請輸入公司名稱"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-text-primary mb-2">
                        聯絡人 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={createForm.contactPerson}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, contactPerson: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                        placeholder="請輸入聯絡人姓名"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-text-primary mb-2">
                        聯絡電話 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={createForm.contactPhone}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, contactPhone: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                        placeholder="請輸入聯絡電話"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-text-primary mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={createForm.contactEmail}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, contactEmail: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                        placeholder="請輸入 Email"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-text-primary mb-2">
                        Line ID
                      </label>
                      <input
                        type="text"
                        value={createForm.lineId}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, lineId: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                        placeholder="請輸入 Line ID"
                      />
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-text-primary mb-2">
                        職位名稱
                      </label>
                      <input
                        type="text"
                        value={createForm.positionTitle}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, positionTitle: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                        placeholder="請輸入職位名稱"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-text-primary mb-2">
                        需要人數
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={createForm.quantity}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, quantity: parseInt(e.target.value) || 1 })
                        }
                        className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-text-primary mb-2">
                        薪資範圍
                      </label>
                      <input
                        type="text"
                        value={createForm.salaryRange}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, salaryRange: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                        placeholder="例如：30000-40000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-text-primary mb-2">
                        預計到職日期
                      </label>
                      <input
                        type="date"
                        value={createForm.expectedStartDate}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, expectedStartDate: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-text-primary mb-2">
                        工作地點
                      </label>
                      <input
                        type="text"
                        value={createForm.workLocation}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, workLocation: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                        placeholder="請輸入工作地點"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-text-primary mb-2">
                        工作內容描述
                      </label>
                      <textarea
                        value={createForm.jobDescription}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, jobDescription: e.target.value })
                        }
                        rows={3}
                        className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/50 resize-none"
                        placeholder="請描述工作內容..."
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-text-primary mb-2">
                        其他要求
                      </label>
                      <textarea
                        value={createForm.additionalRequirements}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, additionalRequirements: e.target.value })
                        }
                        rows={3}
                        className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/50 resize-none"
                        placeholder="請輸入其他要求..."
                      />
                    </div>
                  </div>
                </div>

                {/* 選擇移工 */}
                <div>
                  <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-brand-primary">
                      group
                    </span>
                    選擇移工
                    {selectedWorkers.length > 0 && (
                      <span className="text-sm font-normal text-text-secondary">
                        (已選 {selectedWorkers.length}/15)
                      </span>
                    )}
                  </h3>

                  {/* 已選擇的移工 */}
                  {selectedWorkers.length > 0 && (
                    <div className="mb-4 p-3 bg-brand-primary/5 border border-brand-primary/20 rounded-lg">
                      <p className="text-sm text-text-secondary mb-2">已選擇：</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedWorkers.map((worker) => (
                          <div
                            key={worker.id}
                            className="flex items-center gap-2 px-3 py-1 bg-white border border-brand-primary/30 rounded-full"
                          >
                            <Image
                              src={worker.photo}
                              alt={worker.name}
                              width={24}
                              height={24}
                              className="w-6 h-6 rounded-full object-cover"
                              unoptimized
                            />
                            <span className="text-sm text-text-primary">{worker.name}</span>
                            <button
                              type="button"
                              onClick={() => removeSelectedWorker(worker.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <span className="material-symbols-outlined text-base">close</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 搜尋移工 */}
                  <div className="mb-3">
                    <input
                      type="text"
                      value={workerSearch}
                      onChange={(e) => setWorkerSearch(e.target.value)}
                      placeholder="搜尋移工姓名、職位、國家..."
                      className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                    />
                  </div>

                  {/* 移工列表 */}
                  <div className="border border-border rounded-lg max-h-48 overflow-y-auto">
                    {workersLoading ? (
                      <div className="p-4 text-center text-text-secondary">
                        <span className="material-symbols-outlined animate-spin">progress_activity</span>
                        <span className="ml-2">載入中...</span>
                      </div>
                    ) : filteredWorkers.length === 0 ? (
                      <div className="p-4 text-center text-text-secondary">
                        {workerSearch ? "沒有符合的移工" : "沒有可選擇的移工"}
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {filteredWorkers.map((worker) => {
                          const isSelected = selectedWorkers.some((w) => w.id === worker.id);
                          return (
                            <div
                              key={worker.id}
                              onClick={() => toggleWorkerSelection(worker)}
                              className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                                isSelected
                                  ? "bg-brand-primary/10"
                                  : "hover:bg-gray-50"
                              }`}
                            >
                              <Image
                                src={worker.photo}
                                alt={worker.name}
                                width={40}
                                height={40}
                                className="w-10 h-10 rounded-full object-cover"
                                unoptimized
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-text-primary truncate">
                                  {worker.name}
                                </p>
                                <p className="text-xs text-text-secondary truncate">
                                  {worker.title} · {worker.country}
                                </p>
                              </div>
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                isSelected
                                  ? "bg-brand-primary border-brand-primary"
                                  : "border-gray-300"
                              }`}>
                                {isSelected && (
                                  <span className="material-symbols-outlined text-white text-sm">check</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* 申請資格 */}
                <div>
                  <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-brand-primary">
                      checklist
                    </span>
                    申請資格
                    <span className="text-xs font-normal text-gray-500">(可複選)</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {qualificationOptions.map((option) => (
                      <label
                        key={option.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedQualifications.includes(option.id)
                            ? "bg-brand-primary/10 border-brand-primary"
                            : "bg-gray-50 border-border hover:border-brand-primary/50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedQualifications.includes(option.id)}
                          onChange={() => toggleQualification(option.id)}
                          className="w-5 h-5 rounded border-gray-300 text-brand-primary focus:ring-brand-primary cursor-pointer"
                        />
                        <span className="text-sm text-text-primary">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 提交按鈕 */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-6 py-3 border border-border rounded-lg hover:bg-gray-50 transition-colors font-bold text-text-secondary"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleCreateRequest}
                    disabled={creating}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-brand-primary text-text-on-brand rounded-lg hover:bg-brand-accent transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creating ? (
                      <>
                        <span className="material-symbols-outlined animate-spin">
                          progress_activity
                        </span>
                        建立中...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined">add</span>
                        建立需求
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
