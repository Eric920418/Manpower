"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { usePermission } from "@/hooks/usePermission";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/Admin/AdminLayout";
import { useToast } from "@/components/UI/Toast";

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
  description: string | null;
  order: number;
  isActive: boolean;
}

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  department: string | null;
  isActive: boolean;
}

// GraphQL 查詢
const GET_TASK_TYPES_QUERY = `
  query GetTaskTypes {
    taskTypes(includeInactive: false) {
      id
      code
      label
      description
      order
      isActive
    }
  }
`;

const GET_ASSIGNABLE_USERS_QUERY = `
  query GetAssignableUsers {
    assignableUsers {
      id
      name
      email
      role
    }
  }
`;

const GET_ALL_USERS_QUERY = `
  query GetAllUsers {
    users(page: 1, pageSize: 100, filter: { isActive: true }) {
      users {
        id
        name
        email
        role
        department
        isActive
      }
    }
  }
`;

const CREATE_ADMIN_TASK_MUTATION = `
  mutation CreateAdminTask($input: CreateAdminTaskInput!) {
    createAdminTask(input: $input) {
      id
      taskNo
      title
      status
    }
  }
`;

const SET_TASK_ASSIGNMENTS_MUTATION = `
  mutation SetTaskAssignments($input: SetTaskAssignmentsInput!) {
    setTaskAssignments(input: $input) {
      id
      userId
      role
    }
  }
`;

export default function AssignTaskPage() {
  const { data: session, status } = useSession();
  const { getRole, can } = usePermission();
  const router = useRouter();
  const { addToast } = useToast();

  // 權限檢查
  const userRole = getRole();
  const hasAccess = useMemo(() => {
    return can('task_assignment:assign');
  }, [userRole]);

  // 角色階級定義（數字越大階級越高）
  const roleHierarchy: Record<string, number> = {
    SUPER_ADMIN: 4,
    ADMIN: 3,
    OWNER: 2,
    STAFF: 1,
  };

  // 角色顯示名稱
  const roleNames: Record<string, string> = {
    ADMIN: '管理員',
    OWNER: '業主',
    STAFF: '業務人員',
  };

  // 狀態
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 過濾可指派的用戶（排除超級管理員和自己，可指派給同級或較低階級的用戶）
  const assignableUsers = useMemo(() => {
    if (!userRole || !session?.user?.id) return [];
    const currentLevel = roleHierarchy[userRole] || 0;
    return allUsers.filter(user => {
      // 排除自己
      if (user.id === session.user.id) return false;
      // 排除超級管理員
      if (user.role === 'SUPER_ADMIN') return false;
      // 可指派給同級或較低階級的用戶
      const userLevel = roleHierarchy[user.role] || 0;
      return userLevel <= currentLevel;
    });
  }, [allUsers, userRole, session?.user?.id]);

  // 按角色分組用戶
  const groupedUsers = useMemo(() => {
    const groups: Record<string, User[]> = {
      ADMIN: [],
      OWNER: [],
      STAFF: [],
    };
    assignableUsers.forEach(user => {
      if (groups[user.role]) {
        groups[user.role].push(user);
      }
    });
    return groups;
  }, [assignableUsers]);

  // 表單狀態
  const [selectedTaskTypeId, setSelectedTaskTypeId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);

  // 載入資料
  useEffect(() => {
    if (status === "authenticated" && hasAccess) {
      loadData();
    }
  }, [status, hasAccess]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 並行獲取任務類型和用戶
      const [taskTypesRes, usersRes] = await Promise.all([
        fetch("/api/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: GET_TASK_TYPES_QUERY }),
        }),
        fetch("/api/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: GET_ALL_USERS_QUERY }),
        }),
      ]);

      const [taskTypesData, usersData] = await Promise.all([
        taskTypesRes.json(),
        usersRes.json(),
      ]);

      if (taskTypesData.errors) {
        throw new Error(taskTypesData.errors[0].message);
      }
      if (usersData.errors) {
        throw new Error(usersData.errors[0].message);
      }

      setTaskTypes(taskTypesData.data.taskTypes);
      setAllUsers(usersData.data.users.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入資料失敗");
    } finally {
      setLoading(false);
    }
  };

  // 處理員工選擇
  const handleStaffToggle = (staffId: string) => {
    setSelectedStaffIds(prev => {
      if (prev.includes(staffId)) {
        return prev.filter(id => id !== staffId);
      } else {
        return [...prev, staffId];
      }
    });
  };

  // 全選/取消全選
  const handleSelectAll = () => {
    if (selectedStaffIds.length === assignableUsers.length) {
      setSelectedStaffIds([]);
    } else {
      setSelectedStaffIds(assignableUsers.map(u => u.id));
    }
  };

  // 提交表單
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTaskTypeId) {
      addToast({ type: "error", title: "請選擇任務類型" });
      return;
    }
    if (!title.trim()) {
      addToast({ type: "error", title: "請填寫任務標題" });
      return;
    }
    if (selectedStaffIds.length === 0) {
      addToast({ type: "error", title: "請選擇至少一位指派對象" });
      return;
    }

    try {
      setSubmitting(true);

      // 1. 創建任務
      const createRes = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: CREATE_ADMIN_TASK_MUTATION,
          variables: {
            input: {
              taskTypeId: Number(selectedTaskTypeId),
              title: title.trim(),
              deadline: deadline || null,
              notes: notes.trim() || null,
              payload: {},
            },
          },
        }),
      });

      const createData = await createRes.json();
      if (createData.errors) {
        throw new Error(createData.errors[0].message);
      }

      const newTask = createData.data.createAdminTask;

      // 2. 分配給選中的人員（作為負責人）
      const assignRes = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: SET_TASK_ASSIGNMENTS_MUTATION,
          variables: {
            input: {
              taskId: parseInt(newTask.id),
              handlerIds: selectedStaffIds,
              reviewerIds: [],
            },
          },
        }),
      });

      const assignData = await assignRes.json();
      if (assignData.errors) {
        throw new Error(assignData.errors[0].message);
      }

      addToast({ type: "success", title: `任務 ${newTask.taskNo} 已成功指派給 ${selectedStaffIds.length} 位人員` });

      // 重置表單
      setSelectedTaskTypeId(null);
      setTitle("");
      setDeadline("");
      setNotes("");
      setSelectedStaffIds([]);

      // 跳轉到行政事務頁面
      router.push("/admin/admin-tasks");
    } catch (err) {
      addToast({ type: "error", title: err instanceof Error ? err.message : "指派任務失敗" });
    } finally {
      setSubmitting(false);
    }
  };

  // 權限檢查
  if (status === "loading" || loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">載入中...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!hasAccess) {
    return (
      <AdminLayout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-red-700 mb-2">權限不足</h2>
          <p className="text-red-600">您沒有權限訪問此頁面</p>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-red-700 mb-2">發生錯誤</h2>
          <p className="text-red-600">{error}</p>
          <button
            onClick={loadData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            重試
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        {/* 頁面標題 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">任務指派</h1>
          <p className="mt-1 text-sm text-gray-600">
            指派任務給人員處理
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 任務類型選擇 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">任務類型</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {taskTypes.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setSelectedTaskTypeId(type.id)}
                  className={`p-3 rounded-lg border-2 text-left transition ${
                    selectedTaskTypeId === type.id
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 hover:border-gray-300 text-gray-700"
                  }`}
                >
                  <div className="font-medium">{type.label}</div>
                  {type.description && (
                    <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {type.description}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 任務內容 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">任務內容</h2>
            <div className="space-y-4">
              {/* 標題 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  任務標題 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="請輸入任務標題"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* 截止日期 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  截止日期
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* 備註 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  備註說明
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="請輸入任務相關說明（選填）"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* 指派對象 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                指派對象
                {selectedStaffIds.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-blue-600">
                    （已選 {selectedStaffIds.length} 人）
                  </span>
                )}
              </h2>
              {assignableUsers.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {selectedStaffIds.length === assignableUsers.length ? "取消全選" : "全選"}
                </button>
              )}
            </div>

            {assignableUsers.length === 0 ? (
              <p className="text-gray-500 text-center py-4">目前沒有可指派的人員</p>
            ) : (
              <div className="space-y-6">
                {/* 按角色分組顯示 */}
                {(['ADMIN', 'OWNER', 'STAFF'] as const).map(role => {
                  const users = groupedUsers[role];
                  if (users.length === 0) return null;

                  return (
                    <div key={role}>
                      <h3 className={`text-sm font-semibold mb-3 px-2 py-1 rounded inline-block ${
                        role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                        role === 'OWNER' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {roleNames[role]}（{users.length} 人）
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {users.map((user) => (
                          <label
                            key={user.id}
                            className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition ${
                              selectedStaffIds.includes(user.id)
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selectedStaffIds.includes(user.id)}
                              onChange={() => handleStaffToggle(user.id)}
                              className="sr-only"
                            />
                            <div className={`w-5 h-5 rounded border-2 mr-3 flex items-center justify-center ${
                              selectedStaffIds.includes(user.id)
                                ? "border-blue-500 bg-blue-500"
                                : "border-gray-300"
                            }`}>
                              {selectedStaffIds.includes(user.id) && (
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">
                                {user.name || user.email}
                              </div>
                              {user.department && (
                                <div className="text-xs text-gray-500">{user.department}</div>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 提交按鈕 */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.push("/admin/admin-tasks")}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedTaskTypeId || !title.trim() || selectedStaffIds.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "指派中..." : "確認指派"}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
