"use client";

import { useState } from "react";
import { useQuery, useMutation, gql } from "@apollo/client";
import AdminLayout from "@/components/Admin/AdminLayout";
import { usePermission } from "@/hooks/usePermission";
import { PermissionEnum } from "@/lib/permissions";
import { Role } from "@prisma/client";
import { RoleNames } from "@/lib/permissions";

// GraphQL 查詢
const GET_USERS = gql`
  query GetUsers($page: Int, $pageSize: Int, $filter: UserFilterInput) {
    users(page: $page, pageSize: $pageSize, filter: $filter) {
      users {
        id
        email
        name
        role
        department
        phone
        isActive
        lastLoginAt
        invitationCode
        invitationCount
        createdAt
        position
        bio
        specialties
        lineId
        isPublic
        avatar
      }
      total
      page
      pageSize
      totalPages
    }
  }
`;

const DELETE_USER = gql`
  mutation DeleteUser($id: ID!) {
    deleteUser(id: $id)
  }
`;

const TOGGLE_USER_STATUS = gql`
  mutation ToggleUserStatus($id: ID!) {
    toggleUserStatus(id: $id) {
      id
      isActive
    }
  }
`;

const CREATE_USER = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      email
      name
      role
      department
      phone
      isActive
    }
  }
`;

const UPDATE_USER = gql`
  mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
    updateUser(id: $id, input: $input) {
      id
      email
      name
      role
      department
      phone
      isActive
    }
  }
`;

interface User {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  department: string | null;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  invitationCode: string | null;
  invitationCount: number;
  createdAt: string;
  position: string | null;
  bio: string | null;
  specialties: string[] | null;
  lineId: string | null;
  isPublic: boolean;
  avatar: string | null;
}

export default function UsersPage() {
  const { can } = usePermission();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "">("");
  const [statusFilter, setStatusFilter] = useState<boolean | "">("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserForm, setShowUserForm] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    password: "",
    role: Role.STAFF as Role,
    department: "",
    phone: "",
    isActive: true,
    position: "",
    bio: "",
    specialties: [] as string[],
    lineId: "",
    isPublic: true,
  });

  // 查詢用戶列表
  const { data, loading, error, refetch } = useQuery(GET_USERS, {
    variables: {
      page,
      pageSize,
      filter: {
        search: search || undefined,
        role: roleFilter || undefined,
        isActive: statusFilter === "" ? undefined : statusFilter,
      },
    },
    fetchPolicy: "network-only",
  });

  // 刪除用戶
  const [deleteUser, { loading: deleting }] = useMutation(DELETE_USER, {
    onCompleted: () => {
      setShowDeleteConfirm(false);
      setSelectedUser(null);
      refetch();
    },
    onError: (error) => {
      alert(`刪除失敗: ${error.message}`);
    },
  });

  // 切換用戶狀態
  const [toggleStatus] = useMutation(TOGGLE_USER_STATUS, {
    onCompleted: () => {
      refetch();
    },
    onError: (error) => {
      alert(`操作失敗: ${error.message}`);
    },
  });

  // 創建用戶
  const [createUser, { loading: creating }] = useMutation(CREATE_USER, {
    onCompleted: () => {
      setShowUserForm(false);
      resetForm();
      refetch();
      alert("用戶創建成功！");
    },
    onError: (error) => {
      alert(`創建失敗: ${error.message}`);
    },
  });

  // 更新用戶
  const [updateUser, { loading: updating }] = useMutation(UPDATE_USER, {
    onCompleted: () => {
      setShowUserForm(false);
      resetForm();
      refetch();
      alert("用戶更新成功！");
    },
    onError: (error) => {
      alert(`更新失敗: ${error.message}`);
    },
  });

  const handleDelete = () => {
    if (selectedUser) {
      deleteUser({ variables: { id: selectedUser.id } });
    }
  };

  const handleToggleStatus = (user: User) => {
    if (
      confirm(
        `確定要${user.isActive ? "停用" : "啟用"}用戶「${
          user.name || user.email
        }」嗎？`
      )
    ) {
      toggleStatus({ variables: { id: user.id } });
    }
  };

  const resetForm = () => {
    setFormData({
      email: "",
      name: "",
      password: "",
      role: Role.STAFF,
      department: "",
      phone: "",
      isActive: true,
      position: "",
      bio: "",
      specialties: [],
      lineId: "",
      isPublic: true,
    });
    setSelectedUser(null);
  };

  const handleCreateUser = () => {
    setFormMode("create");
    resetForm();
    setShowUserForm(true);
  };

  const handleEditUser = (user: User) => {
    setFormMode("edit");
    setSelectedUser(user);
    setFormData({
      email: user.email,
      name: user.name || "",
      password: "", // 密碼留空，編輯時選擇性更新
      role: user.role,
      department: user.department || "",
      phone: user.phone || "",
      isActive: user.isActive,
      position: user.position || "",
      bio: user.bio || "",
      specialties: user.specialties || [],
      lineId: user.lineId || "",
      isPublic: user.isPublic ?? true,
    });
    setShowUserForm(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();

    // 驗證必填欄位
    if (!formData.email || !formData.name) {
      alert("請填寫 Email 和姓名");
      return;
    }

    // 創建模式必須有密碼
    if (formMode === "create" && !formData.password) {
      alert("請設定密碼");
      return;
    }

    if (formMode === "create") {
      createUser({
        variables: {
          input: {
            email: formData.email,
            name: formData.name,
            password: formData.password,
            role: formData.role,
            department: formData.department || undefined,
            phone: formData.phone || undefined,
            isActive: formData.isActive,
          },
        },
      });
    } else {
      const updateInput: any = {
        email: formData.email,
        name: formData.name,
        role: formData.role,
        department: formData.department || undefined,
        phone: formData.phone || undefined,
        isActive: formData.isActive,
        position: formData.position || undefined,
        bio: formData.bio || undefined,
        specialties: formData.specialties.length > 0 ? formData.specialties : undefined,
        lineId: formData.lineId || undefined,
        isPublic: formData.isPublic,
      };

      // 只有在有填寫密碼時才更新
      if (formData.password) {
        updateInput.password = formData.password;
      }

      updateUser({
        variables: {
          id: selectedUser!.id,
          input: updateInput,
        },
      });
    }
  };

  const users = data?.users?.users || [];
  const total = data?.users?.total || 0;
  const totalPages = data?.users?.totalPages || 1;

  if (!can(PermissionEnum.USER_READ)) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">沒有權限</h2>
          <p className="text-gray-600">您沒有權限訪問用戶管理</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div>
        {/* 頁面標題 */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">用戶管理</h1>
            <p className="text-gray-500 mt-1">管理系統用戶帳號與權限</p>
          </div>
          {can(PermissionEnum.USER_CREATE) && (
            <button
              onClick={handleCreateUser}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              ➕ 新增用戶
            </button>
          )}
        </div>

        {/* 搜尋與篩選 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* 搜尋 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                搜尋
              </label>
              <input
                type="text"
                placeholder="搜尋 Email 或姓名..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 角色篩選 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                角色
              </label>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value as Role | "");
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">全部角色</option>
                <option value={Role.SUPER_ADMIN}>超級管理員</option>
                <option value={Role.OWNER}>業主</option>
                <option value={Role.STAFF}>業務人員</option>
              </select>
            </div>

            {/* 狀態篩選 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                狀態
              </label>
              <select
                value={statusFilter === "" ? "" : statusFilter ? "true" : "false"}
                onChange={(e) => {
                  setStatusFilter(
                    e.target.value === "" ? "" : e.target.value === "true"
                  );
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">全部狀態</option>
                <option value="true">啟用</option>
                <option value="false">停用</option>
              </select>
            </div>
          </div>
        </div>

        {/* 用戶列表 */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">載入中...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">❌</div>
              <p className="text-red-600">{error.message}</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-gray-600">沒有找到用戶</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        用戶
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        角色
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        邀請碼
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        電話
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        狀態
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        最後登入
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user: User) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {user.name || "-"}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              user.role === Role.SUPER_ADMIN
                                ? "bg-purple-100 text-purple-800"
                                : user.role === Role.OWNER
                                ? "bg-blue-100 text-blue-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {RoleNames[user.role]}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.invitationCode ? (
                            <div>
                              <div className="text-sm font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block">
                                {user.invitationCode}
                              </div>
                              {user.invitationCount > 0 && (
                                <div className="text-xs text-gray-500 mt-1">
                                  已邀請 {user.invitationCount} 人
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.phone || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              user.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {user.isActive ? "✓ 啟用" : "✗ 停用"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.lastLoginAt
                            ? new Date(user.lastLoginAt).toLocaleString(
                                "zh-TW"
                              )
                            : "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            {can(PermissionEnum.USER_UPDATE) && (
                              <>
                                <button
                                  onClick={() => handleEditUser(user)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  編輯
                                </button>
                                <button
                                  onClick={() => handleToggleStatus(user)}
                                  className="text-yellow-600 hover:text-yellow-900"
                                >
                                  {user.isActive ? "停用" : "啟用"}
                                </button>
                              </>
                            )}
                            {can(PermissionEnum.USER_DELETE) && (
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowDeleteConfirm(true);
                                }}
                                className="text-red-600 hover:text-red-900"
                              >
                                刪除
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 分頁 */}
              <div className="px-6 py-4 border-t flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  顯示 {(page - 1) * pageSize + 1} 到{" "}
                  {Math.min(page * pageSize, total)} 筆，共 {total} 筆
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    上一頁
                  </button>
                  <span className="px-3 py-1">
                    第 {page} / {totalPages} 頁
                  </span>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page >= totalPages}
                    className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    下一頁
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 刪除確認對話框 */}
      {showDeleteConfirm && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              確認刪除用戶
            </h3>
            <p className="text-gray-600 mb-6">
              確定要刪除用戶「{selectedUser.name || selectedUser.email}」嗎？
              <br />
              <span className="text-red-600 font-semibold">
                此操作無法復原！
              </span>
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedUser(null);
                }}
                disabled={deleting}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "刪除中..." : "確認刪除"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新增/編輯用戶表單 */}
      {showUserForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 my-8">
            <h3 className="text-lg font-bold text-gray-900 mb-6">
              {formMode === "create" ? "新增用戶" : "編輯用戶"}
            </h3>
            <form onSubmit={handleSubmitForm}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="user@example.com"
                  />
                </div>

                {/* 姓名 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    姓名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="張三"
                  />
                </div>

                {/* 密碼 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    密碼{" "}
                    {formMode === "create" ? (
                      <span className="text-red-500">*</span>
                    ) : (
                      <span className="text-gray-500 text-xs">
                        （留空則不修改）
                      </span>
                    )}
                  </label>
                  <input
                    type="password"
                    required={formMode === "create"}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={
                      formMode === "create" ? "設定密碼" : "留空則不修改"
                    }
                  />
                </div>

                {/* 角色 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    角色 <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        role: e.target.value as Role,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={Role.STAFF}>業務人員</option>
                    <option value={Role.OWNER}>業主</option>
                    <option value={Role.SUPER_ADMIN}>超級管理員</option>
                  </select>
                </div>

                {/* 電話 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    電話
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0912-345-678"
                  />
                </div>

                {/* 狀態 */}
                <div className="md:col-span-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) =>
                        setFormData({ ...formData, isActive: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      啟用此用戶
                    </span>
                  </label>
                </div>

                {/* 業務人員展示欄位區塊（只在編輯模式且角色為 STAFF 或 OWNER 時顯示） */}
                {formMode === "edit" && (formData.role === Role.STAFF || formData.role === Role.OWNER) && (
                  <>
                    <div className="md:col-span-2 border-t pt-4 mt-2">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">
                        📋 業務人員公開展示資訊
                      </h4>
                    </div>

                    {/* 職稱 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        職稱
                      </label>
                      <input
                        type="text"
                        value={formData.position}
                        onChange={(e) =>
                          setFormData({ ...formData, position: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="例：業務經理、資深業務專員"
                      />
                    </div>

                    {/* Line ID */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Line ID
                      </label>
                      <input
                        type="text"
                        value={formData.lineId}
                        onChange={(e) =>
                          setFormData({ ...formData, lineId: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="例：@youshi_wang"
                      />
                    </div>

                    {/* 自我介紹 */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        自我介紹
                      </label>
                      <textarea
                        value={formData.bio}
                        onChange={(e) =>
                          setFormData({ ...formData, bio: e.target.value })
                        }
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="簡短介紹自己的專業背景和服務理念..."
                      />
                    </div>

                    {/* 專長領域 */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        專長領域
                        <span className="text-gray-500 text-xs ml-1">（以逗號分隔）</span>
                      </label>
                      <input
                        type="text"
                        value={formData.specialties.join(", ")}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            specialties: e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter((s) => s),
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="例：製造業, 營建業, 大型企業專案"
                      />
                    </div>

                    {/* 是否公開顯示 */}
                    <div className="md:col-span-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.isPublic}
                          onChange={(e) =>
                            setFormData({ ...formData, isPublic: e.target.checked })
                          }
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          在公開頁面顯示此業務人員
                        </span>
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        取消勾選後，此業務人員將不會顯示在 /staff 頁面
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowUserForm(false);
                    resetForm();
                  }}
                  disabled={creating || updating}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={creating || updating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating || updating
                    ? formMode === "create"
                      ? "創建中..."
                      : "更新中..."
                    : formMode === "create"
                    ? "創建用戶"
                    : "更新用戶"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
