import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { Role } from '@prisma/client';
import { hasPermission, PermissionEnum } from '@/lib/permissions';

/**
 * Next.js 16 Proxy - 路由級別的權限保護
 * (從 middleware 遷移至 proxy 以符合 Next.js 16 標準)
 *
 * 保護規則：
 * 1. /admin/* - 所有後台路由都需要登入
 * 2. /admin/system/* - 僅超級管理員可訪問
 * 3. /admin/users/* - 超級管理員和業主可訪問
 * 4. /admin/settings/* - 僅超級管理員可訪問
 * 5. /admin/login - 已登入用戶自動跳轉到 dashboard
 */

/**
 * 獲取正確的基礎 URL（處理反向代理）
 */
function getBaseUrl(req: NextRequest): string {
  // 優先使用 X-Forwarded-Host（來自反向代理）
  const forwardedHost = req.headers.get('x-forwarded-host');
  const forwardedProto = req.headers.get('x-forwarded-proto') || 'http';

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  // 次之使用 Host header
  const host = req.headers.get('host');
  if (host) {
    return `${forwardedProto}://${host}`;
  }

  // 最後使用 NEXTAUTH_URL 環境變數
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }

  // 回退到 req.url
  return new URL(req.url).origin;
}

export async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const baseUrl = getBaseUrl(req);

  // ============================================
  // 維護模式檢查（前台路由）
  // ============================================
  if (
    !pathname.startsWith('/admin') &&
    !pathname.startsWith('/api') &&
    !pathname.startsWith('/_next') &&
    pathname !== '/maintenance' &&
    pathname !== '/favicon.ico'
  ) {
    try {
      const res = await fetch(`${baseUrl}/api/maintenance-check`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.enabled) {
          return NextResponse.rewrite(new URL('/maintenance', baseUrl));
        }
      }
    } catch {
      // 檢查失敗時不阻擋正常訪問
    }
    return NextResponse.next();
  }

  // ============================================
  // 以下為 /admin/* 後台路由的權限保護
  // ============================================

  // 非 admin 路由直接通過
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // 獲取 NextAuth token
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET
  });

  // 開發環境才記錄
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔍 ${pathname} | ${token ? '✅ 已登入' : '❌ 未登入'} | baseUrl: ${baseUrl}`);
  }

  // 處理登入頁面的訪問邏輯
  if (pathname === '/admin/login') {
    if (token) {
      return NextResponse.redirect(new URL('/admin/dashboard', baseUrl));
    }
    return NextResponse.next();
  }

  // 其他 /admin/* 路由需要登入
  if (!token) {
    return NextResponse.redirect(new URL('/admin/login', baseUrl));
  }

  const userRole = token.role as Role;

    // 超級管理員擁有所有權限，直接通過
    if (userRole === Role.SUPER_ADMIN) {
      return NextResponse.next();
    }

    // 系統核心設定 - 僅超級管理員
    if (pathname.startsWith('/admin/system')) {
      return NextResponse.redirect(
        new URL('/admin/dashboard?error=forbidden&reason=system_only', baseUrl)
      );
    }

    // 用戶管理 - 超級管理員和業主
    if (pathname.startsWith('/admin/users')) {
      if (!hasPermission(userRole, PermissionEnum.USER_READ)) {
        return NextResponse.redirect(
          new URL('/admin/dashboard?error=forbidden&reason=no_user_permission', baseUrl)
        );
      }
    }

    // 網頁內容管理 - 需要 web_content:read 權限
    if (pathname.startsWith('/admin/content') || pathname.startsWith('/admin/pages') ||
        pathname.startsWith('/admin/home-page') || pathname.startsWith('/admin/application-process') ||
        pathname.startsWith('/admin/workers') || pathname.startsWith('/admin/faq') ||
        pathname.startsWith('/admin/news') || pathname.startsWith('/admin/staff') ||
        pathname.startsWith('/admin/franchise') || pathname.startsWith('/admin/navigation')) {
      if (!hasPermission(userRole, PermissionEnum.WEB_CONTENT_READ)) {
        return NextResponse.redirect(
          new URL('/admin/dashboard?error=forbidden&reason=no_content_permission', baseUrl)
        );
      }
    }

    // 系統設定 - 僅超級管理員
    if (pathname.startsWith('/admin/settings')) {
      if (!hasPermission(userRole, PermissionEnum.SYSTEM_CONFIG)) {
        return NextResponse.redirect(
          new URL('/admin/dashboard?error=forbidden&reason=no_settings_permission', baseUrl)
        );
      }
    }

    // 表單管理 - 所有角色都可以查看
    if (pathname.startsWith('/admin/forms')) {
      if (!hasPermission(userRole, PermissionEnum.FORM_READ)) {
        return NextResponse.redirect(
          new URL('/admin/dashboard?error=forbidden&reason=no_form_permission', baseUrl)
        );
      }
    }

    // 行政事務管理 - 需要 admin_task:read 權限
    if (pathname.startsWith('/admin/admin-tasks')) {
      if (!hasPermission(userRole, PermissionEnum.ADMIN_TASK_READ)) {
        return NextResponse.redirect(
          new URL('/admin/dashboard?error=forbidden&reason=no_admin_task_permission', baseUrl)
        );
      }
    }

  // 通過所有檢查，允許訪問
  return NextResponse.next();
}

export const config = {
  matcher: [
    // 保護所有 /admin 路徑 + 前台維護模式檢查
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
