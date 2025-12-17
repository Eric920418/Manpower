"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, gql } from "@apollo/client";
import AdminLayout from "@/components/Admin/AdminLayout";
import { usePermission } from "@/hooks/usePermission";
import { Role } from "@prisma/client";
import { RoleNames, RolePermissions } from "@/lib/permissions";

// GraphQL 查詢
const GET_USERS_FOR_PERMISSIONS = gql`
  query GetUsersForPermissions {
    users(page: 1, pageSize: 100) {
      users {
        id
        email
        name
        role
        isActive
        customPermissions {
          granted
          denied
        }
      }
    }
  }
`;

const GET_AVAILABLE_PERMISSIONS = gql`
  query GetAvailablePermissions {
    availablePermissions {
      key
      label
      permissions {
        key
        label
        description
        category
      }
    }
  }
`;

const GET_USER_EFFECTIVE_PERMISSIONS = gql`
  query GetUserEffectivePermissions($userId: ID!) {
    userEffectivePermissions(userId: $userId)
  }
`;

const UPDATE_USER_PERMISSIONS = gql`
  mutation UpdateUserPermissions($userId: ID!, $input: UpdateUserPermissionsInput!) {
    updateUserPermissions(userId: $userId, input: $input) {
      id
      customPermissions {
        granted
        denied
      }
    }
  }
`;

interface PermissionDef {
  key: string;
  label: string;
  description: string;
  category: string;
}

interface PermissionCategory {
  key: string;
  label: string;
  permissions: PermissionDef[];
}

interface CustomPermissions {
  granted: string[];
  denied: string[];
}

interface User {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  isActive: boolean;
  customPermissions: CustomPermissions | null;
}

type PermissionState = "default" | "granted" | "denied";

export default function UserPermissionsPage() {
  const { isSuperAdmin } = usePermission();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [localPermissions, setLocalPermissions] = useState<{
    granted: string[];
    denied: string[];
  }>({ granted: [], denied: [] });
  const [hasChanges, setHasChanges] = useState(false);
  const [searchUser, setSearchUser] = useState("");

  // 查詢用戶列表
  const { data: usersData, loading: loadingUsers, refetch } = useQuery(GET_USERS_FOR_PERMISSIONS, {
    fetchPolicy: "network-only",
  });

  // 查詢可用權限
  const { data: permissionsData, loading: loadingPermissions } = useQuery(GET_AVAILABLE_PERMISSIONS);

  // 查詢選中用戶的有效權限
  const { data: effectiveData, loading: loadingEffective } = useQuery(GET_USER_EFFECTIVE_PERMISSIONS, {
    variables: { userId: selectedUserId },
    skip: !selectedUserId,
    fetchPolicy: "network-only",
  });

  // 更新權限
  const [updatePermissions, { loading: updating }] = useMutation(UPDATE_USER_PERMISSIONS, {
    onCompleted: () => {
      setHasChanges(false);
      refetch();
      alert("權限更新成功！\n\n後端權限已即時生效。\n如果該用戶正在使用系統，需要刷新頁面才能看到前端介面的變化。");
    },
    onError: (error) => {
      alert(`權限更新失敗: ${error.message}`);
    },
  });

  // 過濾掉 SUPER_ADMIN 用戶
  const users: User[] = (usersData?.users?.users || []).filter(
    (u: User) => u.role !== "SUPER_ADMIN"
  );

  // 搜尋用戶
  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(searchUser.toLowerCase()) ||
      u.email.toLowerCase().includes(searchUser.toLowerCase())
  );

  const selectedUser = users.find((u) => u.id === selectedUserId);
  const categories: PermissionCategory[] = permissionsData?.availablePermissions || [];
  const effectivePermissions: string[] = effectiveData?.userEffectivePermissions || [];

  // 當選擇用戶變更時，載入其權限設定
  useEffect(() => {
    if (selectedUser) {
      setLocalPermissions({
        granted: selectedUser.customPermissions?.granted || [],
        denied: selectedUser.customPermissions?.denied || [],
      });
      setHasChanges(false);
    }
  }, [selectedUser]);

  // 取得權限的狀態
  const getPermissionState = (permissionKey: string): PermissionState => {
    if (localPermissions.granted.includes(permissionKey)) return "granted";
    if (localPermissions.denied.includes(permissionKey)) return "denied";
    return "default";
  };

  // 檢查角色默認是否有此權限
  const hasRolePermission = (permissionKey: string): boolean => {
    if (!selectedUser) return false;
    const rolePerms = RolePermissions[selectedUser.role] as string[];
    return rolePerms?.includes(permissionKey) ?? false;
  };

  // 設置權限狀態
  const setPermissionState = (permissionKey: string, state: PermissionState) => {
    setLocalPermissions((prev) => {
      const newGranted = prev.granted.filter((p) => p !== permissionKey);
      const newDenied = prev.denied.filter((p) => p !== permissionKey);

      if (state === "granted") {
        newGranted.push(permissionKey);
      } else if (state === "denied") {
        newDenied.push(permissionKey);
      }

      return { granted: newGranted, denied: newDenied };
    });
    setHasChanges(true);
  };

  // 保存權限
  const handleSave = () => {
    if (!selectedUserId) return;
    updatePermissions({
      variables: {
        userId: selectedUserId,
        input: {
          granted: localPermissions.granted,
          denied: localPermissions.denied,
        },
      },
    });
  };

  // 重置變更
  const handleReset = () => {
    if (selectedUser) {
      setLocalPermissions({
        granted: selectedUser.customPermissions?.granted || [],
        denied: selectedUser.customPermissions?.denied || [],
      });
      setHasChanges(false);
    }
  };

  // 權限檢查
  if (!isSuperAdmin()) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">沒有權限</h2>
          <p className="text-gray-600">只有超級管理員可以管理用戶權限</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="h-full flex flex-col">
        {/* 頁面標題 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">用戶權限管理</h1>
          <p className="text-gray-500 mt-1">
            細粒度控制每個用戶的權限，可以額外授予或禁止特定權限
          </p>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">
          {/* 左側 - 用戶列表 */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b">
              <input
                type="text"
                placeholder="搜尋用戶..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              {loadingUsers ? (
                <div className="p-4 text-center text-gray-500">載入中...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-gray-500">沒有找到用戶</div>
              ) : (
                <div className="divide-y">
                  {filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => setSelectedUserId(user.id)}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition ${
                        selectedUserId === user.id ? "bg-blue-50 border-l-4 border-blue-500" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-gray-900">
                          {user.name || user.email}
                        </div>
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            user.role === Role.ADMIN
                              ? "bg-orange-100 text-orange-800"
                              : user.role === Role.OWNER
                              ? "bg-blue-100 text-blue-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {RoleNames[user.role]}
                        </span>
                      </div>
                      {(user.customPermissions?.granted?.length || 0) > 0 ||
                      (user.customPermissions?.denied?.length || 0) > 0 ? (
                        <div className="mt-1 flex gap-2 text-xs">
                          {(user.customPermissions?.granted?.length || 0) > 0 && (
                            <span className="text-green-600">
                              +{user.customPermissions?.granted?.length} 授予
                            </span>
                          )}
                          {(user.customPermissions?.denied?.length || 0) > 0 && (
                            <span className="text-red-600">
                              -{user.customPermissions?.denied?.length} 禁止
                            </span>
                          )}
                        </div>
                      ) : null}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 右側 - 權限設定 */}
          <div className="lg:col-span-3 bg-white rounded-lg shadow-sm overflow-hidden flex flex-col">
            {!selectedUser ? (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <div className="text-6xl mb-4">👈</div>
                  <p>請從左側選擇一個用戶來管理權限</p>
                </div>
              </div>
            ) : loadingPermissions || loadingEffective ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                {/* 用戶信息頭部 */}
                <div className="p-4 border-b bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        {selectedUser.name || selectedUser.email}
                      </h2>
                      <p className="text-sm text-gray-500">
                        角色：{RoleNames[selectedUser.role]} · 有效權限：{effectivePermissions.length} 項
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {hasChanges && (
                        <button
                          onClick={handleReset}
                          disabled={updating}
                          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                        >
                          重置
                        </button>
                      )}
                      <button
                        onClick={handleSave}
                        disabled={!hasChanges || updating}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {updating ? "儲存中..." : "儲存變更"}
                      </button>
                    </div>
                  </div>

                  {/* 圖例說明 */}
                  <div className="mt-3 flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded bg-gray-200"></span>
                      <span className="text-gray-600">使用角色默認</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded bg-green-500"></span>
                      <span className="text-gray-600">額外授予</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded bg-red-500"></span>
                      <span className="text-gray-600">明確禁止</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-800">角色權限</span>
                      <span className="text-gray-600">此角色默認擁有此權限</span>
                    </div>
                  </div>
                </div>

                {/* 權限列表 */}
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-6">
                    {categories.map((category) => (
                      <div key={category.key} className="border rounded-lg overflow-hidden">
                        <div className="bg-gray-100 px-4 py-2 font-medium text-gray-900">
                          {category.label}
                        </div>
                        <div className="divide-y">
                          {category.permissions.map((perm) => {
                            const state = getPermissionState(perm.key);
                            const hasRole = hasRolePermission(perm.key);
                            const isEffective = effectivePermissions.includes(perm.key);

                            return (
                              <div
                                key={perm.key}
                                className="px-4 py-3 flex items-center justify-between hover:bg-gray-50"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900">{perm.label}</span>
                                    {hasRole && (
                                      <span className="px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-800">
                                        角色權限
                                      </span>
                                    )}
                                    {isEffective && (
                                      <span className="text-green-500 text-sm">✓ 有效</span>
                                    )}
                                    {!isEffective && (
                                      <span className="text-red-500 text-sm">✗ 無效</span>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-500 mt-0.5">{perm.description}</p>
                                  <p className="text-xs text-gray-400 mt-0.5 font-mono">{perm.key}</p>
                                </div>
                                <div className="flex items-center gap-1 ml-4">
                                  <button
                                    onClick={() => setPermissionState(perm.key, "denied")}
                                    className={`px-3 py-1.5 rounded-l-lg border transition ${
                                      state === "denied"
                                        ? "bg-red-500 text-white border-red-500"
                                        : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                                    }`}
                                    title="禁止此權限"
                                  >
                                    禁止
                                  </button>
                                  <button
                                    onClick={() => setPermissionState(perm.key, "default")}
                                    className={`px-3 py-1.5 border-t border-b transition ${
                                      state === "default"
                                        ? "bg-gray-500 text-white border-gray-500"
                                        : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                                    }`}
                                    title="使用角色默認權限"
                                  >
                                    默認
                                  </button>
                                  <button
                                    onClick={() => setPermissionState(perm.key, "granted")}
                                    className={`px-3 py-1.5 rounded-r-lg border transition ${
                                      state === "granted"
                                        ? "bg-green-500 text-white border-green-500"
                                        : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                                    }`}
                                    title="額外授予此權限"
                                  >
                                    授予
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
