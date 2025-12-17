import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaAdapter } from '@next-auth/prisma-adapter';

const prisma = new PrismaClient();

// 自訂權限結構
interface CustomPermissions {
  granted: string[];
  denied: string[];
}

// 擴展 NextAuth 類型定義
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      role: Role;
      department: string | null;
      customPermissions: CustomPermissions | null;
    };
    accessToken?: string;
  }

  interface User {
    id: string;
    email: string;
    name: string | null;
    role: Role;
    department: string | null;
    customPermissions: CustomPermissions | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: Role;
    department: string | null;
    customPermissions: CustomPermissions | null;
    accessToken?: string;
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Email & Password',
      credentials: {
        email: {
          label: 'Email',
          type: 'email',
          placeholder: 'admin@manpower.com',
        },
        password: {
          label: 'Password',
          type: 'password',
        },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('請輸入 Email 和密碼');
        }

        try {
          // 查詢用戶
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (!user) {
            throw new Error('Email 或密碼錯誤');
          }

          // 檢查帳號是否啟用
          if (!user.isActive) {
            throw new Error('此帳號已被停用，請聯絡管理員');
          }

          // 驗證密碼
          if (!user.password) {
            throw new Error('此帳號未設定密碼，請使用其他登入方式');
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            // 記錄失敗嘗試
            await prisma.activityLog.create({
              data: {
                userId: user.id,
                action: 'login_failed',
                entity: 'user',
                entityId: user.id,
                details: {
                  reason: 'invalid_password',
                  email: credentials.email,
                },
              },
            });

            throw new Error('Email 或密碼錯誤');
          }

          // 更新最後登入時間
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          });

          // 記錄成功登入
          await prisma.activityLog.create({
            data: {
              userId: user.id,
              action: 'login',
              entity: 'user',
              entityId: user.id,
              details: {
                email: user.email,
                role: user.role,
              },
            },
          });

          // 解析 customPermissions
          let customPermissions: CustomPermissions | null = null;
          if (user.customPermissions) {
            const cp = user.customPermissions as any;
            customPermissions = {
              granted: Array.isArray(cp.granted) ? cp.granted : [],
              denied: Array.isArray(cp.denied) ? cp.denied : [],
            };
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            department: user.department,
            customPermissions,
          };
        } catch (error) {
          console.error('登入錯誤:', error);
          throw error;
        }
      },
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 小時
  },

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // 初次登入時將用戶資料加入 token
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.department = user.department;
        token.email = user.email;
        token.name = user.name;
        token.customPermissions = user.customPermissions;
      }

      // 處理 session 更新
      if (trigger === 'update' && session) {
        token.name = session.name;
        token.email = session.email;
      }

      // 每次 token 刷新時都從數據庫獲取最新的角色和權限
      // 這確保權限變更能即時生效（用戶只需刷新頁面）
      if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: {
              role: true,
              customPermissions: true,
              isActive: true,
            },
          });

          if (dbUser) {
            // 更新角色（防止角色被修改後仍使用舊角色）
            token.role = dbUser.role;

            // 更新自定義權限
            if (dbUser.customPermissions) {
              const cp = dbUser.customPermissions as any;
              token.customPermissions = {
                granted: Array.isArray(cp.granted) ? cp.granted : [],
                denied: Array.isArray(cp.denied) ? cp.denied : [],
              };
            } else {
              token.customPermissions = null;
            }

            // 如果用戶被停用，清除 token（強制登出）
            if (!dbUser.isActive) {
              return null as any;
            }
          }
        } catch (error) {
          console.error('Failed to refresh user permissions:', error);
        }
      }

      return token;
    },

    async session({ session, token }) {
      // 將 token 中的用戶資料加入 session
      if (token) {
        session.user = {
          id: token.id,
          email: token.email as string,
          name: token.name as string | null,
          role: token.role,
          department: token.department,
          customPermissions: token.customPermissions,
        };
        // 將完整的 JWT token 添加到 session 供 Apollo Client 使用
        session.accessToken = token.sub || token.id; // 使用 token ID
      }

      return session;
    },

    async signIn() {
      // 可以在這裡加入額外的登入檢查
      // 例如：IP 限制、多因素驗證等
      return true;
    },
  },

  events: {
    async signOut({ token }) {
      // 記錄登出事件
      if (token?.id) {
        await prisma.activityLog.create({
          data: {
            userId: token.id,
            action: 'logout',
            entity: 'user',
            entityId: token.id,
          },
        });
      }
    },
  },

  pages: {
    signIn: '/admin/login',
    error: '/admin/login',
  },

  secret: process.env.NEXTAUTH_SECRET,

  debug: process.env.NODE_ENV === 'development',
};
