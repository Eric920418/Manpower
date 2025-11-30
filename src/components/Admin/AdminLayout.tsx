"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePermission } from "@/hooks/usePermission";
import { Permission } from "@/lib/permissions";
import { RoleNames } from "@/lib/permissions";

interface MenuItem {
  label: string;
  href: string;
  permission?: Permission;
  roles?: string[];
}

const menuItems: MenuItem[] = [
  {
    label: "儀表板",
    href: "/admin/dashboard",
  },
  {
    label: "用戶管理",
    href: "/admin/users",
    permission: 'user:read',
  },
  {
    label: "行政事務",
    href: "/admin/admin-tasks",
    permission: 'admin_task:read',
  },
  {
    label: "申請類型管理",
    href: "/admin/task-types",
    permission: 'admin_task:write',
  },
  {
    label: "首頁內容",
    href: "/admin/home-page",
    permission: 'content:read',
  },
  {
    label: "申請流程",
    href: "/admin/application-process",
    permission: 'content:read',
  },
  {
    label: "移工列表",
    href: "/admin/workers",
    permission: 'content:read',
  },
  {
    label: "常見問題",
    href: "/admin/faq",
    permission: 'content:read',
  },
  {
    label: "最新消息",
    href: "/admin/news",
    permission: 'content:read',
  },
  {
    label: "主力人力",
    href: "/admin/staff",
    permission: 'content:read',
  },
  {
    label: "創業加盟",
    href: "/admin/franchise",
    permission: 'content:read',
  },
  {
    label: "導航選單",
    href: "/admin/navigation",
    permission: 'nav:read',
  },
  {
    label: "人力需求",
    href: "/admin/manpower-requests",
    permission: 'form:read',
  },
  {
    label: "數據分析",
    href: "/admin/analytics",
    permission: 'system:analytics',
  },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { can, isSuperAdmin, getRole } = usePermission();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/admin/login");
    }
  }, [status, router]);

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

  if (!session) {
    return null;
  }

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/admin/login");
  };

  // 過濾選單項目，只顯示用戶有權限的項目
  const visibleMenuItems = menuItems.filter((item) => {
    // 非 SUPER_ADMIN 只能看到人力需求頁面
    if (!isSuperAdmin()) {
      return item.href === "/admin/manpower-requests";
    }

    // SUPER_ADMIN 根據權限顯示
    if (!item.permission) return true; // 沒有權限要求的項目都顯示
    return can(item.permission);
  });

  const userRole = getRole();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 側邊欄 - 桌面版 */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-16"
        } bg-gray-900 text-white transition-all duration-300 hidden lg:block fixed h-full z-30`}
      >
        <div className="flex flex-col h-full">
          {/* Logo 區域 */}
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center justify-between">
              {sidebarOpen && (
                <div>
                  <h1 className="text-xl font-bold">佑羲人力系統</h1>
                  <p className="text-xs text-gray-400">Youshi HR</p>
                </div>
              )}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-gray-800 rounded transition"
              >
                {sidebarOpen ? "◀" : "▶"}
              </button>
            </div>
          </div>

          {/* 用戶資訊 */}
          {sidebarOpen && (
            <div className="p-4 border-b border-gray-800">
              <div>
                <p className="text-sm font-semibold truncate">
                  {session.user.name || session.user.email}
                </p>
                <p className="text-xs text-gray-400">
                  {userRole && RoleNames[userRole]}
                </p>
                {session.user.department && (
                  <p className="text-xs text-gray-500 mt-1">
                    {session.user.department}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 選單項目 */}
          {sidebarOpen && (
            <nav className="flex-1 overflow-y-auto py-4">
              <ul className="space-y-1 px-2">
                {visibleMenuItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`flex items-center px-3 py-2.5 rounded-lg transition ${
                          isActive
                            ? "bg-blue-600 text-white"
                            : "text-gray-300 hover:bg-gray-800"
                        }`}
                      >
                        <span className="text-sm font-medium">
                          {item.label}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}

          {/* 登出按鈕 */}
          {sidebarOpen && (
          <div className="p-4 border-t border-gray-800">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center px-3 py-2.5 rounded-lg text-red-400 hover:bg-red-900/20 transition"
            >
              <span className="text-sm font-medium">登出</span>
            </button>
          </div>
          )}
        </div>
      </aside>

      {/* 移動版側邊欄遮罩 */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* 移動版側邊欄 */}
      <aside
        className={`${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } fixed inset-y-0 left-0 w-64 bg-gray-900 text-white transition-transform duration-300 z-50 lg:hidden`}
      >
        <div className="flex flex-col h-full">
          {/* Logo 區域 */}
          <div className="p-4 border-b border-gray-800 flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold">佑羲人力系統</h1>
              <p className="text-xs text-gray-400">Youshi HR</p>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 hover:bg-gray-800 rounded"
            >
              ✕
            </button>
          </div>

          {/* 用戶資訊 */}
          <div className="p-4 border-b border-gray-800">
            <p className="text-sm font-semibold truncate">
              {session.user.name || session.user.email}
            </p>
            <p className="text-xs text-gray-400">
              {userRole && RoleNames[userRole]}
            </p>
          </div>

          {/* 選單項目 */}
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-2">
              {visibleMenuItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center px-3 py-2.5 rounded-lg transition ${
                        isActive
                          ? "bg-blue-600 text-white"
                          : "text-gray-300 hover:bg-gray-800"
                      }`}
                    >
                      <span className="text-sm font-medium">
                        {item.label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* 登出按鈕 */}
          <div className="p-4 border-t border-gray-800">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center px-3 py-2.5 rounded-lg text-red-400 hover:bg-red-900/20 transition"
            >
              <span className="text-sm font-medium">登出</span>
            </button>
          </div>
        </div>
      </aside>

      {/* 主要內容區域 */}
      <main
        className={`flex-1 transition-all duration-300 ${
          sidebarOpen ? "lg:ml-64" : "lg:ml-20"
        }`}
      >
        {/* 頂部導航欄（移動版） */}
        <header className="bg-white shadow-sm border-b lg:hidden sticky top-0 z-20">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <h1 className="text-lg font-bold">佑羲人力系統</h1>
            <button
              onClick={handleLogout}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
            >
              登出
            </button>
          </div>
        </header>

        {/* 頁面內容 */}
        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
