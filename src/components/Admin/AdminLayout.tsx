"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePermission } from "@/hooks/usePermission";
import { RoleNames, Permission } from "@/lib/permissions";

interface MenuItem {
  label: string;
  href: string;
  permission?: Permission;
}

interface MenuGroup {
  title: string;
  roles: string[];
  permissions?: Permission[];
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    title: "管理員操作",
    roles: ['SUPER_ADMIN', 'ADMIN', 'OWNER', 'STAFF'],
    permissions: ['dashboard:view', 'admin_task:read', 'admin_task:create', 'task_assignment:assign', 'form:read', 'user:read'],
    items: [
      { label: "儀表板", href: "/admin/dashboard", permission: 'dashboard:view' },
      { label: "行政事務", href: "/admin/admin-tasks", permission: 'admin_task:read' },
      { label: "任務指派", href: "/admin/assign-task", permission: 'task_assignment:assign' },
      { label: "人力需求", href: "/admin/manpower-requests", permission: 'form:read' },
      { label: "聯絡表單", href: "/admin/contact-submissions", permission: 'form:read' },
      { label: "用戶管理", href: "/admin/users", permission: 'user:read' },
    ],
  },
  {
    title: "網站內容",
    roles: ['SUPER_ADMIN', 'ADMIN', 'OWNER', 'STAFF'],
    permissions: ['web_content:read', 'web_content:update'],
    items: [
      // 左排：首頁內容、申請流程、履歷表、常見問題、最新消息
      // 右排：創業計畫、主力人力、聯絡我們、懸浮連結
      { label: "首頁內容", href: "/admin/home-page", permission: 'web_content:read' },
      { label: "創業計畫", href: "/admin/franchise", permission: 'web_content:read' },
      { label: "申請流程", href: "/admin/application-process", permission: 'web_content:read' },
      { label: "主力人力", href: "/admin/staff", permission: 'web_content:read' },
      { label: "履歷表", href: "/admin/workers", permission: 'web_content:read' },
      { label: "聯絡我們", href: "/admin/contact-page", permission: 'web_content:read' },
      { label: "常見問題", href: "/admin/faq", permission: 'web_content:read' },
      { label: "懸浮連結", href: "/admin/floating-links", permission: 'web_content:read' },
      { label: "最新消息", href: "/admin/news", permission: 'web_content:read' },
      { label: "隱私權政策", href: "/admin/privacy-policy", permission: 'web_content:read' },
    ],
  },
  {
    title: "系統管理",
    roles: ['SUPER_ADMIN'],
    permissions: ['system:config', 'user:manage_roles', 'system:logs', 'system:analytics', 'task_assignment:read'],
    items: [
      { label: "申請類型管理", href: "/admin/task-types", permission: 'system:config' },
      { label: "案件分配管理", href: "/admin/admin-assignments", permission: 'task_assignment:read' },
      { label: "加盟店管理", href: "/admin/franchises", permission: 'system:config' },
      { label: "用戶權限管理", href: "/admin/user-permissions", permission: 'user:manage_roles' },
      { label: "活動日誌", href: "/admin/activity-logs", permission: 'system:logs' },
      { label: "數據分析", href: "/admin/analytics", permission: 'system:analytics' },
    ],
  },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { getRole, can } = usePermission();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);

  // 處理拖拉開始
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    startYRef.current = clientY - dragOffset;
  };

  // 處理拖拉移動
  useEffect(() => {
    const handleDragMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const newOffset = Math.max(0, Math.min(clientY - startYRef.current, 400));
      setDragOffset(newOffset);
    };

    const handleDragEnd = () => {
      if (!isDragging) return;
      setIsDragging(false);
      // 如果拖拉超過 100px，展開選單；否則收起
      if (dragOffset > 100) {
        setMenuOpen(true);
        setDragOffset(0);
      } else {
        setMenuOpen(false);
        setDragOffset(0);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove);
      window.addEventListener('touchend', handleDragEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, dragOffset]);

  // 點擊選單外關閉
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) && menuOpen) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

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

  const userRole = getRole();

  const getCurrentPageTitle = () => {
    for (const group of menuGroups) {
      for (const item of group.items) {
        if (pathname === item.href) {
          return item.label;
        }
      }
    }
    return "管理後台";
  };

  const currentPageTitle = getCurrentPageTitle();

  const visibleMenuGroups = menuGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!userRole) return false;
        if (!item.permission) return group.roles.includes(userRole);
        return can(item.permission);
      }),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 遮罩層 */}
      <div
        className={`fixed inset-0 bg-black transition-opacity duration-300 z-40 ${
          menuOpen ? 'opacity-50 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMenuOpen(false)}
      />

      {/* 頂部布簾式選單 */}
      <div ref={menuRef} className="fixed top-0 left-0 right-0 z-50">
        {/* 選單內容 */}
        <div
          className="bg-gray-900 text-white overflow-hidden transition-all duration-300 ease-out"
          style={{
            maxHeight: menuOpen ? '80vh' : isDragging ? `${dragOffset}px` : '0px',
          }}
        >
          <div className="max-w-6xl mx-auto px-4 py-4">
            {/* 頂部資訊列 */}
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-700">
              <div>
                <p className="text-sm text-gray-400 mt-1">
                  {session.user.name || session.user.email} · {userRole && RoleNames[userRole]}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-red-400 hover:bg-red-900/30 rounded-lg transition"
              >
                登出
              </button>
            </div>

            {/* 選單分組 - 橫向排列 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
              {visibleMenuGroups.map((group) => (
                <div key={group.title}>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    {group.title}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {group.items.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMenuOpen(false)}
                          className={`px-2 py-2 rounded-lg text-sm transition ${
                            isActive
                              ? "bg-blue-600 text-white"
                              : "text-gray-300 hover:bg-gray-800"
                          }`}
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 拉桿 - 永遠顯示 */}
        <div
          className={`flex justify-center transition-colors duration-300 ${
            menuOpen ? 'bg-gray-900' : 'bg-gray-800'
          }`}
        >
          <button
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
            onClick={() => !isDragging && setMenuOpen(!menuOpen)}
            className="group relative w-full max-w-xs py-2 cursor-grab active:cursor-grabbing"
          >
            {/* 拉桿把手 */}
            <div className="flex flex-col items-center gap-1">
              <div className="w-12 h-1.5 bg-gray-600 rounded-full group-hover:bg-gray-500 transition" />
              <div className="flex items-center gap-2 text-gray-400 text-xs">
                <span className={`transition-transform duration-300 ${menuOpen ? 'rotate-180' : ''}`}>
                  ▼
                </span>
                <span>{menuOpen ? '收起選單' : currentPageTitle}</span>
                <span className={`transition-transform duration-300 ${menuOpen ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* 主要內容區域 */}
      <main className="pt-14">
        <div className="p-4">{children}</div>
      </main>
    </div>
  );
}
