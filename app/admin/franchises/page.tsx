"use client";

import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/Admin/AdminLayout";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { exportToExcel, formatDateForExcel } from "@/lib/exportExcel";

interface Franchise {
  id: number;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  description: string | null;
  isActive: boolean;
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

interface FranchiseListResponse {
  franchises: Franchise[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function FranchisesAdmin() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingFranchise, setEditingFranchise] = useState<Franchise | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    address: "",
    phone: "",
    email: "",
    description: "",
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchFranchises = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `
            query GetFranchises($page: Int, $pageSize: Int, $filter: FranchiseFilterInput) {
              franchises(page: $page, pageSize: $pageSize, filter: $filter) {
                franchises {
                  id
                  name
                  code
                  address
                  phone
                  email
                  description
                  isActive
                  userCount
                  createdAt
                  updatedAt
                }
                total
                page
                pageSize
                totalPages
              }
            }
          `,
          variables: {
            page,
            pageSize: 10,
            filter: search ? { search } : undefined,
          },
        }),
      });

      const result = await response.json();

      if (result.errors) {
        throw new Error(result.errors[0]?.message || "查詢失敗");
      }

      const data: FranchiseListResponse = result.data.franchises;
      setFranchises(data.franchises);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入失敗");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/admin/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchFranchises();
    }
  }, [session, fetchFranchises]);

  const handleOpenModal = (franchise?: Franchise) => {
    if (franchise) {
      setEditingFranchise(franchise);
      setFormData({
        name: franchise.name,
        code: franchise.code,
        address: franchise.address || "",
        phone: franchise.phone || "",
        email: franchise.email || "",
        description: franchise.description || "",
        isActive: franchise.isActive,
      });
    } else {
      setEditingFranchise(null);
      setFormData({
        name: "",
        code: "",
        address: "",
        phone: "",
        email: "",
        description: "",
        isActive: true,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingFranchise(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.code.trim()) {
      alert("請填寫加盟店名稱和代碼");
      return;
    }

    setSubmitting(true);

    try {
      const mutation = editingFranchise
        ? `
          mutation UpdateFranchise($id: Int!, $input: UpdateFranchiseInput!) {
            updateFranchise(id: $id, input: $input) {
              id
              name
              code
            }
          }
        `
        : `
          mutation CreateFranchise($input: CreateFranchiseInput!) {
            createFranchise(input: $input) {
              id
              name
              code
            }
          }
        `;

      const variables = editingFranchise
        ? { id: editingFranchise.id, input: formData }
        : { input: formData };

      const response = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: mutation, variables }),
      });

      const result = await response.json();

      if (result.errors) {
        throw new Error(result.errors[0]?.message || "操作失敗");
      }

      alert(editingFranchise ? "更新成功" : "新增成功");
      handleCloseModal();
      fetchFranchises();
    } catch (err) {
      alert(err instanceof Error ? err.message : "操作失敗");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (franchise: Franchise) => {
    if (!confirm(`確定要${franchise.isActive ? "停用" : "啟用"}「${franchise.name}」嗎？`)) {
      return;
    }

    try {
      const response = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `
            mutation ToggleFranchiseStatus($id: Int!) {
              toggleFranchiseStatus(id: $id) {
                id
                isActive
              }
            }
          `,
          variables: { id: franchise.id },
        }),
      });

      const result = await response.json();

      if (result.errors) {
        throw new Error(result.errors[0]?.message || "操作失敗");
      }

      fetchFranchises();
    } catch (err) {
      alert(err instanceof Error ? err.message : "操作失敗");
    }
  };

  // 導出 Excel
  const handleExportExcel = () => {
    if (franchises.length === 0) {
      alert("沒有資料可以導出");
      return;
    }

    exportToExcel({
      filename: "加盟店列表",
      sheetName: "加盟店",
      columns: [
        { key: "code", header: "代碼", width: 12 },
        { key: "name", header: "名稱", width: 20 },
        { key: "address", header: "地址", width: 30 },
        { key: "phone", header: "電話", width: 15 },
        { key: "email", header: "Email", width: 25 },
        { key: "userCount", header: "用戶數", width: 10 },
        { key: "isActive", header: "狀態", width: 8, format: (value) => value ? "啟用" : "停用" },
        { key: "createdAt", header: "建立時間", width: 18, format: (value) => formatDateForExcel(value) },
      ],
      data: franchises,
    });
  };

  const handleDelete = async (franchise: Franchise) => {
    if (!confirm(`確定要刪除「${franchise.name}」嗎？此操作無法復原。`)) {
      return;
    }

    try {
      const response = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `
            mutation DeleteFranchise($id: Int!) {
              deleteFranchise(id: $id)
            }
          `,
          variables: { id: franchise.id },
        }),
      });

      const result = await response.json();

      if (result.errors) {
        throw new Error(result.errors[0]?.message || "刪除失敗");
      }

      alert("刪除成功");
      fetchFranchises();
    } catch (err) {
      alert(err instanceof Error ? err.message : "刪除失敗");
    }
  };

  if (status === "loading") {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">加盟店管理</h1>
          <div className="flex gap-3">
            <button
              onClick={handleExportExcel}
              disabled={franchises.length === 0}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              導出 Excel
            </button>
            <button
              onClick={() => handleOpenModal()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <span className="material-symbols-outlined">add</span>
              新增加盟店
            </button>
          </div>
        </div>

        {/* 搜尋 */}
        <div className="mb-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                search
              </span>
              <input
                type="text"
                placeholder="搜尋加盟店名稱、代碼或地址..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* 錯誤訊息 */}
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* 加盟店列表 */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">載入中...</p>
          </div>
        ) : franchises.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">
              store
            </span>
            <p className="text-gray-500">尚無加盟店資料</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">代碼</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">名稱</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">地址</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">電話</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">用戶數</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">狀態</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {franchises.map((franchise) => (
                  <tr key={franchise.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                        {franchise.code}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{franchise.name}</td>
                    <td className="px-4 py-3 text-gray-600 text-sm">
                      {franchise.address || "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-sm">
                      {franchise.phone || "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-sm">
                        {franchise.userCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          franchise.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {franchise.isActive ? "啟用" : "停用"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleOpenModal(franchise)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="編輯"
                        >
                          <span className="material-symbols-outlined text-xl">edit</span>
                        </button>
                        <button
                          onClick={() => handleToggleStatus(franchise)}
                          className={`p-1 rounded ${
                            franchise.isActive
                              ? "text-orange-600 hover:bg-orange-50"
                              : "text-green-600 hover:bg-green-50"
                          }`}
                          title={franchise.isActive ? "停用" : "啟用"}
                        >
                          <span className="material-symbols-outlined text-xl">
                            {franchise.isActive ? "block" : "check_circle"}
                          </span>
                        </button>
                        <button
                          onClick={() => handleDelete(franchise)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="刪除"
                        >
                          <span className="material-symbols-outlined text-xl">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 分頁 */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              上一頁
            </button>
            <span className="px-3 py-1">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              下一頁
            </button>
          </div>
        )}

        {/* 新增/編輯 Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={handleCloseModal}
            />
            <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">
                {editingFranchise ? "編輯加盟店" : "新增加盟店"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      加盟店名稱 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, name: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      加盟店代碼 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          code: e.target.value.toUpperCase(),
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      placeholder="例如：TPE001"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">地址</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, address: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">電話</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, phone: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, email: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">描述</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, isActive: e.target.checked }))
                    }
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <label htmlFor="isActive" className="text-sm">
                    啟用此加盟店
                  </label>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? "處理中..." : editingFranchise ? "更新" : "新增"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
