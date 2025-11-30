import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { Role } from '@prisma/client';
import { hasPermission, PermissionEnum } from '@/lib/permissions';

/**
 * Next.js Middleware - 路由級別的權限保護
 *
 * 保護規則：
 * 1. /admin/* - 所有後台路由都需要登入
 * 2. /admin/system/* - 僅超級管理員可訪問
 * 3. /admin/users/* - 超級管理員和業主可訪問
 * 4. /admin/settings/* - 僅超級管理員可訪問
 * 5. /admin/login - 已登入用戶自動跳轉到 dashboard
 */

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // 獲取 NextAuth token
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET
  });

  // 開發環境才記錄
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔍 ${pathname} | ${token ? '✅ 已登入' : '❌ 未登入'}`);
  }

  // 處理登入頁面的訪問邏輯
  if (pathname === '/admin/login') {
    if (token) {
      return NextResponse.redirect(new URL('/admin/dashboard', req.url));
    }
    return NextResponse.next();
  }

  // 其他 /admin/* 路由需要登入
  if (!token) {
    return NextResponse.redirect(new URL('/admin/login', req.url));
  }

  const userRole = token.role as Role;

    // 超級管理員擁有所有權限，直接通過
    if (userRole === Role.SUPER_ADMIN) {
      return NextResponse.next();
    }

    // 系統核心設定 - 僅超級管理員
    if (pathname.startsWith('/admin/system')) {
      return NextResponse.redirect(
        new URL('/admin/dashboard?error=forbidden&reason=system_only', req.url)
      );
    }

    // 用戶管理 - 超級管理員和業主
    if (pathname.startsWith('/admin/users')) {
      if (!hasPermission(userRole, PermissionEnum.USER_READ)) {
        return NextResponse.redirect(
          new URL('/admin/dashboard?error=forbidden&reason=no_user_permission', req.url)
        );
      }
    }

    // 內容管理 - 超級管理員和業主
    if (pathname.startsWith('/admin/content') || pathname.startsWith('/admin/pages')) {
      if (!hasPermission(userRole, PermissionEnum.CONTENT_READ)) {
        return NextResponse.redirect(
          new URL('/admin/dashboard?error=forbidden&reason=no_content_permission', req.url)
        );
      }
    }

    // 系統設定 - 僅超級管理員
    if (pathname.startsWith('/admin/settings')) {
      if (!hasPermission(userRole, PermissionEnum.SYSTEM_CONFIG)) {
        return NextResponse.redirect(
          new URL('/admin/dashboard?error=forbidden&reason=no_settings_permission', req.url)
        );
      }
    }

    // 表單管理 - 所有角色都可以查看
    if (pathname.startsWith('/admin/forms')) {
      if (!hasPermission(userRole, PermissionEnum.FORM_READ)) {
        return NextResponse.redirect(
          new URL('/admin/dashboard?error=forbidden&reason=no_form_permission', req.url)
        );
      }
    }

    // 行政事務管理 - 需要 admin_task:read 權限
    if (pathname.startsWith('/admin/admin-tasks')) {
      if (!hasPermission(userRole, PermissionEnum.ADMIN_TASK_READ)) {
        return NextResponse.redirect(
          new URL('/admin/dashboard?error=forbidden&reason=no_admin_task_permission', req.url)
        );
      }
    }

  // 通過所有檢查，允許訪問
  return NextResponse.next();
}

export const config = {
  matcher: [
    // 保護所有 /admin 路徑
    '/admin/:path*',
  ],
};
