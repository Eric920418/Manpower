import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getRolePermissions } from '@/lib/permissions';

/**
 * 除錯 API：檢查當前 session 和權限
 * 🔒 僅在開發環境可用
 */
export async function GET() {
  // 🔒 安全檢查：僅在開發環境啟用此端點
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: '此端點僅在開發環境可用' },
      { status: 404 }
    );
  }

  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({
      error: '未登入',
      session: null,
    });
  }

  const userRole = session.user.role;
  const permissions = getRolePermissions(userRole);

  return NextResponse.json({
    session: {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
        department: session.user.department,
      },
    },
    permissions: {
      role: userRole,
      count: permissions.length,
      list: permissions,
    },
  });
}
