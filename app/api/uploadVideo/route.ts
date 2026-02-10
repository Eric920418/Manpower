import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/graphql/prismaClient';

// Next.js App Router 設定
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 從環境變數取得上傳目錄，如果沒有設定則使用預設值
const UPLOAD_DIR =
  process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

// 影片設定
const VIDEO_CONFIG = {
  maxSize: 500 * 1024 * 1024, // 最大 500MB
  allowedTypes: [
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime', // .mov
    'video/x-msvideo', // .avi
    'video/x-matroska', // .mkv
  ],
  allowedExtensions: ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'],
};

export async function POST(request: Request) {
  try {
    // 🔒 認證檢查：必須登入才能上傳影片
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "未授權：請先登入才能上傳影片" },
        { status: 401 }
      );
    }

    // 確保上傳目錄存在
    const uploadDir = path.join(UPLOAD_DIR, "videos");
    await fs.mkdir(uploadDir, { recursive: true });

    // 使用內建的 formData() 方法取得表單資料
    const formData = await request.formData();
    const fileField = formData.get("video");

    // 檢查是否有上傳檔案，且是否為 File 物件
    if (!fileField || !(fileField instanceof File)) {
      return NextResponse.json({ error: "找不到影片檔案" }, { status: 400 });
    }

    // 檢查檔案類型
    const fileExt = path.extname(fileField.name).toLowerCase();
    if (!VIDEO_CONFIG.allowedTypes.includes(fileField.type) &&
        !VIDEO_CONFIG.allowedExtensions.includes(fileExt)) {
      return NextResponse.json({
        error: "不支援的檔案類型。請上傳 MP4、WebM、OGG、MOV、AVI 或 MKV 格式的影片"
      }, { status: 400 });
    }

    // 檢查檔案大小
    if (fileField.size > VIDEO_CONFIG.maxSize) {
      const maxSizeMB = Math.round(VIDEO_CONFIG.maxSize / (1024 * 1024));
      const fileSizeMB = Math.round(fileField.size / (1024 * 1024) * 100) / 100;
      return NextResponse.json({
        error: `檔案大小不能超過 ${maxSizeMB}MB，目前檔案大小為 ${fileSizeMB}MB`
      }, { status: 400 });
    }

    // 將上傳的檔案轉成 Buffer
    const fileBuffer = Buffer.from(await fileField.arrayBuffer());

    // 生成檔名
    const timestamp = Date.now();
    const baseName = path.basename(fileField.name, fileExt);
    const safeName = baseName.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-_\u4e00-\u9fa5]/g, '');
    const fileName = `${timestamp}-${safeName}${fileExt}`;

    const filePath = path.join(uploadDir, fileName);

    // 寫入檔案
    await fs.writeFile(filePath, fileBuffer);

    // 記錄活動日誌
    if (session?.user?.id) {
      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          action: 'upload',
          entity: 'video',
          entityId: fileName,
          details: {
            originalName: fileField.name,
            fileSize: fileField.size,
            mimeType: fileField.type,
            url: `/api/videos/${fileName}`,
          },
        },
      });
    }

    // 計算檔案大小資訊
    const fileSizeMB = (fileField.size / (1024 * 1024)).toFixed(2);

    // 回傳成功訊息以及檔案的完整路徑
    return NextResponse.json({
      message: "上傳成功",
      fileUrl: `/api/videos/${fileName}`,
      fileName: fileName,
      originalName: fileField.name,
      fileSize: fileField.size,
      fileSizeInfo: `${fileSizeMB} MB`,
    });
  } catch (error) {
    console.error("上傳錯誤：", error);
    return NextResponse.json({ error: "影片上傳失敗" }, { status: 500 });
  }
}
