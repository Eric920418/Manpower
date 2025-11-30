/**
 * 環境變數驗證
 * 使用 Zod 確保所有必要的環境變數都已正確設置
 */

import { z } from 'zod';

const envSchema = z.object({
  // 資料庫
  DATABASE_URL: z.string().min(1, '資料庫連接字串不能為空'),

  // NextAuth
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET 長度必須至少 32 字元'),
  NEXTAUTH_URL: z.string().url('NEXTAUTH_URL 必須是有效的 URL'),

  // 可選：CORS 設定（生產環境）
  ALLOWED_ORIGINS: z.string().optional(),

  // 可選：上傳目錄
  UPLOAD_DIR: z.string().optional(),

  // Node 環境
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * 驗證並返回環境變數
 * 如果驗證失敗，會拋出錯誤並顯示詳細訊息
 */
export function validateEnv(): Env {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ 環境變數驗證失敗：');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      throw new Error('環境變數配置錯誤，請檢查 .env 檔案');
    }
    throw error;
  }
}

/**
 * 已驗證的環境變數
 * 在應用啟動時驗證一次，後續直接使用
 */
export const env = validateEnv();
