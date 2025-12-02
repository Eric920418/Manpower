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
}

interface AdminWithAssignments {
  id: string;
  name: string | null;
  email: string;
  assignedTaskTypes: TaskType[];
}

export default function AdminAssignmentsPage() {
  const { status } = useSession();
  const { isSuperAdmin, getRole } = usePermission();
  const router = useRouter();
  const userRole = getRole();

  const [admins, setAdmins] = useState<AdminWithAssignments[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 編輯模態框
  const [showModal, setShowModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminWithAssignments | null>(null);
  const [selectedTaskTypeIds, setSelectedTaskTypeIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  // 獲取資料
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 獲取所有管理員及其分配
      const adminsQuery = `
        query {
          adminsWithAssignments {
            id
            name
            email
            assignedTaskTypes {
              id
              code
              label
              description
              order
              isActive
            }
          }
        }
      `;

      // 獲取所有任務類型
      const taskTypesQuery = `
        query {
          taskTypes {
            id
            code
            label
            description
            order
            isActive
          }
        }
      `;

      const [adminsRes, taskTypesRes] = await Promise.all([
        fetch("/api/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ query: adminsQuery }),
        }),
        fetch("/api/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ query: taskTypesQuery }),
        }),
      ]);

      const [adminsData, taskTypesData] = await Promise.all([
        adminsRes.json(),
        taskTypesRes.json(),
      ]);

      if (adminsData.errors) {
        throw new Error(adminsData.errors[0].message);
      }
      if (taskTypesData.errors) {
        throw new Error(taskTypesData.errors[0].message);
      }

      setAdmins(adminsData.data.adminsWithAssignments);
      setTaskTypes(taskTypesData.data.taskTypes);
    } catch (err) {
      console.error("載入資料失敗：", err);
      setError(err instanceof Error ? err.message : "未知錯誤");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated" && userRole === "SUPER_ADMIN") {
      fetchData();
    }
  }, [status, userRole, fetchData]);

  // 開啟編輯模態框
  const handleEdit = (admin: AdminWithAssignments) => {
    setEditingAdmin(admin);
    setSelectedTaskTypeIds(admin.assignedTaskTypes.map((t) => t.id));
    setShowModal(true);
  };

  // 切換任務類型選擇
  const toggleTaskType = (taskTypeId: number) => {
    setSelectedTaskTypeIds((prev) =>
      prev.includes(taskTypeId)
        ? prev.filter((id) => id !== taskTypeId)
        : [...prev, taskTypeId]
    );
  };

  // 保存分配
  const handleSave = async () => {
    if (!editingAdmin) return;

    setSaving(true);
    try {
      const mutation = `
        mutation UpdateAdminTaskTypes($adminId: String!, $taskTypeIds: [Int!]!) {
          updateAdminTaskTypes(adminId: $adminId, taskTypeIds: $taskTypeIds) {
            id
            label
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
            adminId: editingAdmin.id,
            taskTypeIds: selectedTaskTypeIds,
          },
        }),
      });

      const data = await res.json();

      if (data.errors) {
        throw new Error(data.errors[0].message);
      }

      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error("保存失敗：", err);
      alert(`保存失敗：${err instanceof Error ? err.message : "未知錯誤"}`);
    } finally {
      setSaving(false);
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
  if (!isSuperAdmin()) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md">
            <span className="text-6xl mb-4 block">🔒</span>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">權限不足</h1>
            <p className="text-gray-600 mb-6">
              只有超級管理員可以管理任務類型分配
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
      <div className="max-w-6xl mx-auto">
        {/* 頁面標題 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            管理員任務類型分配
          </h1>
          <p className="text-gray-600">
            分配各管理員可以處理的任務類型
          </p>
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

        {/* 管理員列表 */}
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">載入中...</p>
          </div>
        ) : admins.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-16 text-center">
            <span className="text-6xl mb-4 block">👤</span>
            <p className="text-xl text-gray-900 font-semibold mb-2">
              尚無管理員
            </p>
            <p className="text-gray-600">
              請先在用戶管理頁面創建 ADMIN 角色的用戶
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    管理員
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    已分配任務類型
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {admin.name || "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">
                        {admin.email}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {admin.assignedTaskTypes.length === 0 ? (
                          <span className="text-sm text-gray-400">未分配</span>
                        ) : (
                          admin.assignedTaskTypes.map((type) => (
                            <span
                              key={type.id}
                              className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                            >
                              {type.label}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleEdit(admin)}
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                      >
                        編輯分配
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 編輯模態框 */}
        {showModal && editingAdmin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
              <div className="border-b px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    編輯任務類型分配
                  </h2>
                  <p className="text-sm text-gray-600">
                    {editingAdmin.name || editingAdmin.email}
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  ✕
                </button>
              </div>

              <div className="p-6">
                <p className="text-sm text-gray-600 mb-4">
                  選擇此管理員可以處理的任務類型：
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {taskTypes.map((type) => (
                    <label
                      key={type.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedTaskTypeIds.includes(type.id)
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTaskTypeIds.includes(type.id)}
                        onChange={() => toggleTaskType(type.id)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <div>
                        <p className="font-medium text-gray-900">{type.label}</p>
                        {type.description && (
                          <p className="text-sm text-gray-500">
                            {type.description}
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>

                <div className="flex gap-3 mt-6">
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
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
