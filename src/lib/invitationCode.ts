/**
 * 邀請碼生成和驗證工具
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 生成隨機邀請碼（8位大寫字母+數字）
 */
export function generateInvitationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 排除容易混淆的字符（I/1, O/0）
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * 生成唯一邀請碼（確保不與現有邀請碼衝突）
 */
export async function generateUniqueInvitationCode(): Promise<string> {
  let code = generateInvitationCode();
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const existing = await prisma.user.findUnique({
      where: { invitationCode: code },
    });

    if (!existing) {
      return code;
    }

    code = generateInvitationCode();
    attempts++;
  }

  throw new Error('無法生成唯一邀請碼，請稍後再試');
}

/**
 * 驗證邀請碼是否有效（存在且用戶啟用）
 */
export async function validateInvitationCode(code: string): Promise<{
  valid: boolean;
  userId?: string;
  userName?: string;
  message?: string;
}> {
  if (!code || code.trim() === '') {
    return { valid: true, message: '邀請碼為選填，可以不填' };
  }

  const user = await prisma.user.findUnique({
    where: { invitationCode: code.trim().toUpperCase() },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      role: true,
    },
  });

  if (!user) {
    return {
      valid: false,
      message: '邀請碼不存在，請確認後再試',
    };
  }

  if (!user.isActive) {
    return {
      valid: false,
      message: '此邀請碼對應的用戶已停用',
    };
  }

  return {
    valid: true,
    userId: user.id,
    userName: user.name || user.email,
    message: `邀請碼有效，邀請人：${user.name || user.email}`,
  };
}

/**
 * 為用戶生成並設置邀請碼（僅限非 SUPER_ADMIN）
 */
export async function assignInvitationCodeToUser(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, invitationCode: true },
  });

  if (!user) {
    throw new Error('用戶不存在');
  }

  // SUPER_ADMIN 不需要邀請碼
  if (user.role === 'SUPER_ADMIN') {
    return null;
  }

  // 如果已有邀請碼，直接返回
  if (user.invitationCode) {
    return user.invitationCode;
  }

  // 生成新邀請碼
  const code = await generateUniqueInvitationCode();
  await prisma.user.update({
    where: { id: userId },
    data: { invitationCode: code },
  });

  return code;
}

/**
 * 增加用戶的邀請成功次數
 */
export async function incrementInvitationCount(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      invitationCount: {
        increment: 1,
      },
    },
  });
}
