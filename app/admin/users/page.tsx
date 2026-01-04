"use client";

import { useState } from "react";
import { useQuery, useMutation, gql, useApolloClient } from "@apollo/client";
import AdminLayout from "@/components/Admin/AdminLayout";
import { usePermission } from "@/hooks/usePermission";
import { PermissionEnum } from "@/lib/permissions";
import { Role } from "@prisma/client";
import { RoleNames } from "@/lib/permissions";
import { exportToExcel, formatDateForExcel, formatBooleanForExcel } from "@/lib/exportExcel";

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
        franchiseId
        franchiseName
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

const GET_FRANCHISE_OPTIONS = gql`
  query GetFranchiseOptions {
    franchiseOptions {
      id
      name
      code
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
  franchiseId: number | null;
  franchiseName: string | null;
  createdAt: string;
  position: string | null;
  bio: string | null;
  specialties: string[] | null;
  lineId: string | null;
  isPublic: boolean;
  avatar: string | null;
}

interface FranchiseOption {
  id: number;
  name: string;
  code: string;
}

export default function UsersPage() {
  const { can, canManage } = usePermission();
  const client = useApolloClient();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [exporting, setExporting] = useState(false);
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
    franchiseId: null as number | null,
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

  // 查詢加盟店選項
  const { data: franchiseData } = useQuery(GET_FRANCHISE_OPTIONS);
  const franchiseOptions: FranchiseOption[] = franchiseData?.franchiseOptions || [];

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
      franchiseId: null,
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
      franchiseId: user.franchiseId,
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
        franchiseId: formData.franchiseId,
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

  // 導出 Excel - 獲取全部資料
  const handleExportExcel = async () => {
    if (total === 0) {
      alert("沒有資料可以導出");
      return;
    }

    setExporting(true);
    try {
      // 獲取所有資料（不分頁）
      const { data: allData } = await client.query({
        query: GET_USERS,
        variables: {
          page: 1,
          pageSize: 99999, // 獲取全部
          filter: {
            search: search || undefined,
            role: roleFilter || undefined,
            isActive: statusFilter === "" ? undefined : statusFilter,
          },
        },
        fetchPolicy: "network-only",
      });

      const allUsers = allData?.users?.users || [];

      if (allUsers.length === 0) {
        alert("沒有資料可以導出");
        return;
      }

      exportToExcel({
        filename: "用戶列表",
        sheetName: "用戶",
        columns: [
          { key: "name", header: "姓名", width: 15 },
          { key: "email", header: "Email", width: 25 },
          { key: "role", header: "角色", width: 12, format: (value) => RoleNames[value as Role] || value },
          { key: "franchiseName", header: "加盟店", width: 15 },
          { key: "phone", header: "電話", width: 15 },
          { key: "department", header: "部門", width: 12 },
          { key: "isActive", header: "狀態", width: 8, format: (value) => value ? "啟用" : "停用" },
          { key: "lastLoginAt", header: "最後登入", width: 18, format: (value) => formatDateForExcel(value) },
          { key: "createdAt", header: "建立時間", width: 18, format: (value) => formatDateForExcel(value) },
        ],
        data: allUsers,
      });
    } catch (error) {
      console.error("導出失敗:", error);
      alert("導出失敗，請稍後再試");
    } finally {
      setExporting(false);
    }
  };

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
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 md:mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">用戶管理</h1>
            <p className="text-sm md:text-base text-gray-500 mt-1">管理系統用戶帳號與權限</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              onClick={handleExportExcel}
              disabled={total === 0 || exporting}
              className="w-full sm:w-auto px-4 py-3 md:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 transition min-h-[48px] md:min-h-0 text-base md:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? "導出中..." : "導出 Excel"}
            </button>
            {can(PermissionEnum.USER_CREATE) && (
              <button
                onClick={handleCreateUser}
                className="w-full sm:w-auto px-4 py-3 md:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition min-h-[48px] md:min-h-0 text-base md:text-sm font-medium"
              >
                ➕ 新增用戶
              </button>
            )}
          </div>
        </div>

        {/* 搜尋與篩選 */}
        <div className="bg-white rounded-lg shadow-sm p-3 md:p-4 mb-4 md:mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4">
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
                className="w-full px-3 py-2.5 md:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base md:text-sm"
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
                className="w-full px-3 py-2.5 md:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base md:text-sm"
              >
                <option value="">全部角色</option>
                {/* 只有管理員以上才能看到管理員選項 */}
                {canManage(Role.ADMIN) && (
                  <>
                    <option value={Role.SUPER_ADMIN}>超級管理員</option>
                    <option value={Role.ADMIN}>管理員</option>
                  </>
                )}
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
                value={
                  statusFilter === "" ? "" : statusFilter ? "true" : "false"
                }
                onChange={(e) => {
                  setStatusFilter(
                    e.target.value === "" ? "" : e.target.value === "true"
                  );
                  setPage(1);
                }}
                className="w-full px-3 py-2.5 md:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base md:text-sm"
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
              {/* 手機版卡片視圖 */}
              <div className="md:hidden divide-y divide-gray-200">
                {users.map((user: User) => (
                  <div key={user.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-base font-medium text-gray-900 truncate">
                          {user.name || "-"}
                        </div>
                        <div className="text-sm text-gray-500 truncate">
                          {user.email}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                            user.role === Role.SUPER_ADMIN
                              ? "bg-purple-100 text-purple-800"
                              : user.role === Role.ADMIN
                              ? "bg-orange-100 text-orange-800"
                              : user.role === Role.OWNER
                              ? "bg-blue-100 text-blue-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {RoleNames[user.role]}
                        </span>
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                            user.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {user.isActive ? "啟用" : "停用"}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                      <div>
                        <span className="text-gray-500">電話：</span>
                        <span className="text-gray-900">{user.phone || "-"}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">加盟店：</span>
                        <span className="text-gray-900">{user.franchiseName || "-"}</span>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                      {can(PermissionEnum.USER_UPDATE) && (
                        <>
                          <button
                            onClick={() => handleEditUser(user)}
                            className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg min-h-[44px] active:bg-blue-100"
                          >
                            編輯
                          </button>
                          <button
                            onClick={() => handleToggleStatus(user)}
                            className="px-4 py-2 text-sm font-medium text-yellow-600 hover:bg-yellow-50 rounded-lg min-h-[44px] active:bg-yellow-100"
                          >
                            {user.isActive ? "停用" : "啟用"}
                          </button>
                        </>
                      )}
                      {can(PermissionEnum.USER_DELETE) &&
                        user.role !== Role.SUPER_ADMIN && (
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowDeleteConfirm(true);
                            }}
                            className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg min-h-[44px] active:bg-red-100"
                          >
                            刪除
                          </button>
                        )}
                    </div>
                  </div>
                ))}
              </div>

              {/* 桌面版表格 */}
              <div className="hidden md:block overflow-x-auto">
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
                        加盟店
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
                                : user.role === Role.ADMIN
                                ? "bg-orange-100 text-orange-800"
                                : user.role === Role.OWNER
                                ? "bg-blue-100 text-blue-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {RoleNames[user.role]}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.franchiseName || "-"}
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
                            ? new Date(user.lastLoginAt).toLocaleString("zh-TW")
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
                            {can(PermissionEnum.USER_DELETE) &&
                              user.role !== Role.SUPER_ADMIN && (
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
              <div className="px-4 md:px-6 py-4 border-t flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="text-sm text-gray-500 order-2 md:order-1">
                  顯示 {(page - 1) * pageSize + 1} 到{" "}
                  {Math.min(page * pageSize, total)} 筆，共 {total} 筆
                </div>
                <div className="flex gap-2 order-1 md:order-2 w-full md:w-auto justify-center">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="flex-1 md:flex-none px-4 py-2.5 md:py-1.5 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] md:min-h-0 text-sm font-medium"
                  >
                    上一頁
                  </button>
                  <span className="px-4 py-2.5 md:py-1.5 text-sm flex items-center whitespace-nowrap">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page >= totalPages}
                    className="flex-1 md:flex-none px-4 py-2.5 md:py-1.5 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] md:min-h-0 text-sm font-medium"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 md:p-4">
          <div
            className={`bg-white rounded-lg w-full max-h-[95vh] md:max-h-[90vh] flex flex-col ${
              formMode === "edit" &&
              (formData.role === Role.STAFF || formData.role === Role.OWNER)
                ? "max-w-5xl"
                : "max-w-lg"
            }`}
          >
            <div className="p-4 flex-shrink-0 border-b">
              <h3 className="text-lg font-bold text-gray-900">
                {formMode === "create" ? "新增用戶" : "編輯用戶"}
              </h3>
            </div>
            <form
              onSubmit={handleSubmitForm}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto p-2">
                <div
                  className={`grid gap-6 ${
                    formMode === "edit" &&
                    (formData.role === Role.STAFF ||
                      formData.role === Role.OWNER)
                      ? "lg:grid-cols-2"
                      : "grid-cols-1"
                  }`}
                >
                  {/* 左側：基本資訊 */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-900  flex items-center gap-2">
                      <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs">
                        1
                      </span>
                      基本資訊
                    </h4>

                    {/* Email & 姓名 - 並排 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          className="w-full px-3 py-2.5 md:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base md:text-sm"
                          placeholder="user@example.com"
                        />
                      </div>
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
                          className="w-full px-3 py-2.5 md:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base md:text-sm"
                          placeholder="張三"
                        />
                      </div>
                    </div>

                    {/* 密碼 & 角色 - 並排 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            setFormData({
                              ...formData,
                              password: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2.5 md:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base md:text-sm"
                          placeholder={
                            formMode === "create" ? "設定密碼" : "留空則不修改"
                          }
                        />
                      </div>
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
                          className="w-full px-3 py-2.5 md:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base md:text-sm"
                        >
                          {canManage(Role.STAFF) && (
                            <option value={Role.STAFF}>業務人員</option>
                          )}
                          {canManage(Role.OWNER) && (
                            <option value={Role.OWNER}>業主</option>
                          )}
                          {canManage(Role.ADMIN) && (
                            <option value={Role.ADMIN}>管理員</option>
                          )}
                        </select>
                      </div>
                    </div>

                    {/* 電話 & 加盟店 - 並排 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          className="w-full px-3 py-2.5 md:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base md:text-sm"
                          placeholder="0912-345-678"
                        />
                      </div>
                      {/* 加盟店選擇（僅 OWNER 和 STAFF 顯示） */}
                      {(formData.role === Role.OWNER || formData.role === Role.STAFF) && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            所屬加盟店
                          </label>
                          <select
                            value={formData.franchiseId ?? ""}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                franchiseId: e.target.value ? parseInt(e.target.value) : null,
                              })
                            }
                            className="w-full px-3 py-2.5 md:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base md:text-sm"
                          >
                            <option value="">-- 未指定 --</option>
                            {franchiseOptions.map((franchise) => (
                              <option key={franchise.id} value={franchise.id}>
                                [{franchise.code}] {franchise.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* 狀態 */}
                    <div className="pt-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.isActive}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              isActive: e.target.checked,
                            })
                          }
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          啟用此用戶
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* 右側：業務人員展示欄位（只在編輯模式且角色為 STAFF 或 OWNER 時顯示） */}
                  {formMode === "edit" &&
                    (formData.role === Role.STAFF ||
                      formData.role === Role.OWNER) && (
                      <div className="space-y-4 lg:border-l lg:pl-6">
                        <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                          <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs">
                            2
                          </span>
                          公開展示資訊
                        </h4>

                        {/* 職稱 & Line ID - 並排 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              職稱
                            </label>
                            <input
                              type="text"
                              value={formData.position}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  position: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2.5 md:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base md:text-sm"
                              placeholder="例：業務經理"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Line ID
                            </label>
                            <input
                              type="text"
                              value={formData.lineId}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  lineId: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2.5 md:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base md:text-sm"
                              placeholder="例：@youshi_wang"
                            />
                          </div>
                        </div>

                        {/* 專長領域 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            專長領域
                            <span className="text-gray-500 text-xs ml-1">
                              （以逗號分隔）
                            </span>
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
                            className="w-full px-3 py-2.5 md:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base md:text-sm"
                            placeholder="例：製造業, 營建業, 大型企業專案"
                          />
                        </div>

                        {/* 自我介紹 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            自我介紹
                          </label>
                          <textarea
                            value={formData.bio}
                            onChange={(e) =>
                              setFormData({ ...formData, bio: e.target.value })
                            }
                            rows={3}
                            className="w-full px-3 py-2.5 md:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base md:text-sm"
                            placeholder="簡短介紹自己的專業背景和服務理念..."
                          />
                        </div>

                        {/* 是否公開顯示 */}
                        <div className="pt-2 p-3 bg-gray-50 rounded-lg">
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={formData.isPublic}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  isPublic: e.target.checked,
                                })
                              }
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-gray-700">
                              在公開頁面顯示此業務人員
                            </span>
                          </label>
                          <p className="text-xs text-gray-500 mt-1 ml-6">
                            取消勾選後，此業務人員將不會顯示在 /staff 頁面
                          </p>
                        </div>
                      </div>
                    )}
                </div>
              </div>

              <div className="flex justify-end gap-3 p-4 flex-shrink-0 bg-white border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowUserForm(false);
                    resetForm();
                  }}
                  disabled={creating || updating}
                  className="flex-1 md:flex-none px-4 py-3 md:py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 bg-white min-h-[48px] md:min-h-0 text-base md:text-sm font-medium"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={creating || updating}
                  className="flex-1 md:flex-none px-4 py-3 md:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 min-h-[48px] md:min-h-0 text-base md:text-sm font-medium"
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
