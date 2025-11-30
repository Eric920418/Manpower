"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { usePermission } from "@/hooks/usePermission";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/Admin/AdminLayout";

interface TaskType {
  id: number;
  code: string;
  label: string;
  description: string | null;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function TaskTypesPage() {
  const { status } = useSession();
  const { getRole } = usePermission();
  const router = useRouter();
  const userRole = getRole();
  const isAdmin = userRole === "SUPER_ADMIN";

  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 編輯模態框
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<TaskType | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    label: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);

  // 獲取資料
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = `
        query {
          taskTypes(includeInactive: true) {
            id
            code
            label
            description
            order
            isActive
            createdAt
            updatedAt
          }
        }
      `;

      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) {
        throw new Error(`HTTP 錯誤: ${res.status}`);
      }

      const data = await res.json();

      if (data.errors) {
        throw new Error(data.errors[0].message);
      }

      setTaskTypes(data.data.taskTypes);
    } catch (err) {
      console.error("載入資料失敗：", err);
      setError(err instanceof Error ? err.message : "未知錯誤");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated" && isAdmin) {
      fetchData();
    }
  }, [status, isAdmin, fetchData]);

  // 開啟新增模態框
  const handleAdd = () => {
    setEditingType(null);
    setFormData({ code: "", label: "", description: "" });
    setShowModal(true);
  };

  // 開啟編輯模態框
  const handleEdit = (type: TaskType) => {
    setEditingType(type);
    setFormData({
      code: type.code,
      label: type.label,
      description: type.description || "",
    });
    setShowModal(true);
  };

  // 儲存
  const handleSave = async () => {
    if (!formData.code.trim() || !formData.label.trim()) {
      alert("請填寫代碼和名稱");
      return;
    }

    setSaving(true);
    try {
      let mutation: string;
      let variables: Record<string, unknown>;

      if (editingType) {
        // 更新
        mutation = `
          mutation UpdateTaskType($input: UpdateTaskTypeInput!) {
            updateTaskType(input: $input) {
              id
              code
              label
            }
          }
        `;
        variables = {
          input: {
            id: editingType.id,
            code: formData.code,
            label: formData.label,
            description: formData.description || null,
          },
        };
      } else {
        // 新增
        mutation = `
          mutation CreateTaskType($input: CreateTaskTypeInput!) {
            createTaskType(input: $input) {
              id
              code
              label
            }
          }
        `;
        variables = {
          input: {
            code: formData.code,
            label: formData.label,
            description: formData.description || null,
          },
        };
      }

      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: mutation, variables }),
      });

      const data = await res.json();

      if (data.errors) {
        throw new Error(data.errors[0].message);
      }

      setShowModal(false);
      fetchData();
      alert(editingType ? "更新成功！" : "新增成功！");
    } catch (err) {
      console.error("儲存失敗：", err);
      alert(`儲存失敗：${err instanceof Error ? err.message : "未知錯誤"}`);
    } finally {
      setSaving(false);
    }
  };

  // 切換啟用狀態
  const handleToggleActive = async (type: TaskType) => {
    try {
      const mutation = `
        mutation UpdateTaskType($input: UpdateTaskTypeInput!) {
          updateTaskType(input: $input) {
            id
            isActive
          }
        }
      `;

      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: mutation,
          variables: {
            input: {
              id: type.id,
              isActive: !type.isActive,
            },
          },
        }),
      });

      const data = await res.json();

      if (data.errors) {
        throw new Error(data.errors[0].message);
      }

      fetchData();
    } catch (err) {
      console.error("更新失敗：", err);
      alert(`更新失敗：${err instanceof Error ? err.message : "未知錯誤"}`);
    }
  };

  // 刪除
  const handleDelete = async (type: TaskType) => {
    if (!confirm(`確定要刪除「${type.label}」嗎？\n注意：如果該類型已被使用，將會改為停用。`)) {
      return;
    }

    try {
      const mutation = `
        mutation DeleteTaskType($id: Int!) {
          deleteTaskType(id: $id)
        }
      `;

      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: mutation,
          variables: { id: type.id },
        }),
      });

      const data = await res.json();

      if (data.errors) {
        throw new Error(data.errors[0].message);
      }

      fetchData();
      alert("刪除成功！");
    } catch (err) {
      console.error("刪除失敗：", err);
      alert(`刪除失敗：${err instanceof Error ? err.message : "未知錯誤"}`);
    }
  };

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

  if (!isAdmin) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md">
            <span className="text-6xl mb-4 block">🔒</span>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">權限不足</h1>
            <p className="text-gray-600 mb-6">您沒有權限訪問此頁面</p>
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
      <div className="max-w-4xl mx-auto">
        {/* 頁面標題 */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              申請類型管理
            </h1>
            <p className="text-gray-600">管理行政任務的申請類型</p>
          </div>
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <span>+</span>
            新增類型
          </button>
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

        {/* 列表 */}
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">載入中...</p>
          </div>
        ) : taskTypes.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-16 text-center">
            <span className="text-6xl mb-4 block">📋</span>
            <p className="text-xl text-gray-900 font-semibold mb-2">
              尚無申請類型
            </p>
            <p className="text-gray-600">點擊右上角「新增類型」開始創建</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    代碼
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    名稱
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    描述
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    狀態
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {taskTypes.map((type) => (
                  <tr key={type.id} className={`hover:bg-gray-50 ${!type.isActive ? "opacity-50" : ""}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono text-gray-900">
                        {type.code}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {type.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {type.description || "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded-full font-medium ${
                          type.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {type.isActive ? "啟用" : "停用"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(type)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          編輯
                        </button>
                        <button
                          onClick={() => handleToggleActive(type)}
                          className="text-yellow-600 hover:text-yellow-800 text-sm font-medium"
                        >
                          {type.isActive ? "停用" : "啟用"}
                        </button>
                        <button
                          onClick={() => handleDelete(type)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          刪除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 編輯模態框 */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="border-b px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingType ? "編輯類型" : "新增類型"}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    類型代碼 *
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "") })
                    }
                    placeholder="例如：CREATE_FILE"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">只能使用大寫字母、數字和底線</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    顯示名稱 *
                  </label>
                  <input
                    type="text"
                    value={formData.label}
                    onChange={(e) =>
                      setFormData({ ...formData, label: e.target.value })
                    }
                    placeholder="例如：建檔"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    描述
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                    placeholder="選填"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-4">
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
                    {saving ? "儲存中..." : "確認儲存"}
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
