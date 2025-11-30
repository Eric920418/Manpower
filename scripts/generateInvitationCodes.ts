/**
 * 為現有用戶生成邀請碼的遷移腳本
 */

import { PrismaClient } from '@prisma/client';
import { assignInvitationCodeToUser } from '../src/lib/invitationCode';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 開始為現有用戶生成邀請碼...\n');

  // 查找所有沒有邀請碼的非 SUPER_ADMIN 用戶
  const users = await prisma.user.findMany({
    where: {
      invitationCode: null,
      role: {
        not: 'SUPER_ADMIN',
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  console.log(`📊 找到 ${users.length} 個需要生成邀請碼的用戶\n`);

  if (users.length === 0) {
    console.log('✅ 所有用戶都已有邀請碼！');
    return;
  }

  let successCount = 0;
  let failCount = 0;

  for (const user of users) {
    try {
      const code = await assignInvitationCodeToUser(user.id);
      console.log(
        `✅ ${user.name || user.email} (${user.role}) -> 邀請碼: ${code}`
      );
      successCount++;
    } catch (error) {
      console.error(
        `❌ 為 ${user.email} 生成邀請碼失敗:`,
        error instanceof Error ? error.message : error
      );
      failCount++;
    }
  }

  console.log(`\n📈 完成！成功: ${successCount}, 失敗: ${failCount}`);
}

main()
  .catch((error) => {
    console.error('❌ 執行失敗:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
