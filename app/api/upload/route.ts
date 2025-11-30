import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/graphql/prismaClient';

// Next.js App Router 設定
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 從環境變數取得上傳目錄
const UPLOAD_DIR =
  process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

// 設定最大檔案大小 (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// 允許的檔案類型
const ALLOWED_MIME_TYPES = [
  // 圖片
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // 文件
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  // 壓縮檔
  'application/zip',
  'application/x-rar-compressed',
];

export async function POST(request: Request) {
  try {
    // 驗證用戶登入
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: '未授權：請先登入' },
        { status: 401 }
      );
    }

    // 設定上傳目錄
    const uploadDir = UPLOAD_DIR;
    await fs.mkdir(uploadDir, { recursive: true });

    // 使用內建的 formData() 方法取得表單資料
    const formData = await request.formData();
    const fileField = formData.get("file");
    const relatedType = formData.get('relatedType') as string; // 'form' 或 'contract'
    const relatedId = formData.get('relatedId') as string;

    // 檢查是否有上傳檔案，且是否為 File 物件
    if (!fileField || !(fileField instanceof File)) {
      return NextResponse.json({ error: "沒有檔案被上傳" }, { status: 400 });
    }

    // 檢查檔案大小
    if (fileField.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `檔案過大，最大允許 ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // 檢查檔案類型
    if (!ALLOWED_MIME_TYPES.includes(fileField.type)) {
      return NextResponse.json(
        { error: '不支援的檔案類型' },
        { status: 400 }
      );
    }

    // 將上傳的檔案轉成 Buffer
    const fileBuffer = Buffer.from(await fileField.arrayBuffer());

    // 生成唯一檔案名
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = path.extname(fileField.name);
    const filename = `${timestamp}-${randomString}${fileExtension}`;
    const filePath = path.join(uploadDir, filename);

    // 寫入檔案到指定目錄
    await fs.writeFile(filePath, fileBuffer);

    // 使用 Transaction 確保資料一致性（附件和日誌同時成功或失敗）
    const attachment = await prisma.$transaction(async (tx) => {
      // 建立資料庫記錄
      const newAttachment = await tx.attachment.create({
        data: {
          filename,
          originalName: fileField.name,
          mimeType: fileField.type,
          size: fileField.size,
          path: filePath,
          url: `/api/files/${filename}`,
          uploadedBy: session.user.id,
          // 如果有關聯的表單或合約，建立關聯
          ...(relatedType === 'form' && relatedId
            ? { formId: parseInt(relatedId) }
            : {}),
          ...(relatedType === 'contract' && relatedId
            ? { contractId: parseInt(relatedId) }
            : {}),
        },
      });

      // 記錄活動日誌
      await tx.activityLog.create({
        data: {
          userId: session.user.id,
          action: 'upload',
          entity: 'attachment',
          entityId: newAttachment.id.toString(),
          details: {
            filename: fileField.name,
            fileSize: fileField.size,
            mimeType: fileField.type,
            relatedType,
            relatedId,
          },
        },
      });

      return newAttachment;
    });

    // 回傳成功訊息以及檔案資訊
    return NextResponse.json({
      success: true,
      file: {
        id: attachment.id,
        filename: attachment.filename,
        originalName: attachment.originalName,
        mimeType: attachment.mimeType,
        size: attachment.size,
        url: attachment.url,
      },
    });
  } catch (error: any) {
    console.error("上傳錯誤：", error);
    return NextResponse.json(
      { error: `檔案上傳失敗: ${error.message}` },
      { status: 500 }
    );
  }
}
