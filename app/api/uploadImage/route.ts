import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/graphql/prismaClient';

// Next.js App Router 設定
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 從環境變數取得上傳目錄，如果沒有設定則使用預設值
const UPLOAD_DIR =
  process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

// 圖片壓縮設定
const IMAGE_CONFIG = {
  maxWidth: 1920,      // 最大寬度
  maxHeight: 1080,     // 最大高度
  quality: 85,         // JPEG/WebP 品質 (1-100)
  pngCompressionLevel: 9, // PNG 壓縮等級 (0-9)
};

/**
 * 使用 sharp 壓縮圖片
 * - 自動調整尺寸（保持比例）
 * - 轉換格式並壓縮
 * - GIF 保持原格式（避免動畫丟失）
 */
async function compressImage(
  buffer: Buffer,
  mimeType: string,
  originalName: string
): Promise<{ buffer: Buffer; fileName: string; savedBytes: number }> {
  const originalSize = buffer.length;
  let image = sharp(buffer);
  const metadata = await image.metadata();

  // 如果圖片尺寸超過限制，進行縮放
  if (
    (metadata.width && metadata.width > IMAGE_CONFIG.maxWidth) ||
    (metadata.height && metadata.height > IMAGE_CONFIG.maxHeight)
  ) {
    image = image.resize(IMAGE_CONFIG.maxWidth, IMAGE_CONFIG.maxHeight, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  }

  let outputBuffer: Buffer;
  let outputExt: string;

  // 根據原始格式選擇輸出格式
  if (mimeType === 'image/gif') {
    // GIF 保持原格式（避免動畫丟失），但進行基本優化
    outputBuffer = await image.gif().toBuffer();
    outputExt = 'gif';
  } else if (mimeType === 'image/png') {
    // PNG 使用高壓縮等級
    outputBuffer = await image
      .png({
        compressionLevel: IMAGE_CONFIG.pngCompressionLevel,
        adaptiveFiltering: true,
      })
      .toBuffer();
    outputExt = 'png';
  } else {
    // JPEG/WebP 統一轉為 WebP（更好的壓縮率）
    outputBuffer = await image
      .webp({
        quality: IMAGE_CONFIG.quality,
        effort: 4, // 壓縮努力程度 (0-6)
      })
      .toBuffer();
    outputExt = 'webp';
  }

  // 生成新檔名
  const timestamp = Date.now();
  const baseName = path.basename(originalName, path.extname(originalName));
  const safeName = baseName.replace(/\s+/g, '-');
  const fileName = `${timestamp}-${safeName}.${outputExt}`;

  const savedBytes = originalSize - outputBuffer.length;

  return {
    buffer: outputBuffer,
    fileName,
    savedBytes,
  };
}

export async function POST(request: Request) {
  try {
    // 🔒 認證檢查：必須登入才能上傳圖片
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "未授權：請先登入才能上傳圖片" },
        { status: 401 }
      );
    }

    // 確保上傳目錄存在
    const uploadDir = path.join(UPLOAD_DIR, "images");
    await fs.mkdir(uploadDir, { recursive: true });

    // 使用內建的 formData() 方法取得表單資料
    const formData = await request.formData();
    const fileField = formData.get("image");

    // 檢查是否有上傳檔案，且是否為 File 物件
    if (!fileField || !(fileField instanceof File)) {
      return NextResponse.json({ error: "找不到圖片檔案" }, { status: 400 });
    }

    // 檢查檔案類型（只接受圖片檔案）
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(fileField.type)) {
      return NextResponse.json({
        error: "不支援的檔案類型。請上傳 JPG、PNG、GIF 或 WebP 格式的圖片"
      }, { status: 400 });
    }

    // 檢查檔案大小（限制 10MB，壓縮後會更小）
    const maxSize = 10 * 1024 * 1024; // 10MB（因為會壓縮，可以放寬限制）
    if (fileField.size > maxSize) {
      return NextResponse.json({
        error: `檔案大小不能超過 ${Math.round(maxSize / (1024 * 1024))}MB，目前檔案大小為 ${Math.round(fileField.size / (1024 * 1024) * 100) / 100}MB`
      }, { status: 400 });
    }

    // 將上傳的檔案轉成 Buffer
    const fileBuffer = Buffer.from(await fileField.arrayBuffer());

    // 壓縮圖片
    const { buffer: compressedBuffer, fileName, savedBytes } = await compressImage(
      fileBuffer,
      fileField.type,
      fileField.name
    );

    const filePath = path.join(uploadDir, fileName);

    // 寫入壓縮後的檔案
    await fs.writeFile(filePath, compressedBuffer);

    // 記錄活動日誌
    if (session?.user?.id) {
      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          action: 'upload',
          entity: 'image',
          entityId: fileName,
          details: {
            originalName: fileField.name,
            originalSize: fileField.size,
            compressedSize: compressedBuffer.length,
            savedBytes,
            mimeType: fileField.type,
            url: `/api/images/${fileName}`,
          },
        },
      });
    }

    // 計算壓縮資訊
    const compressionRatio = ((savedBytes / fileField.size) * 100).toFixed(1);
    const originalSizeKB = (fileField.size / 1024).toFixed(1);
    const compressedSizeKB = (compressedBuffer.length / 1024).toFixed(1);

    // 回傳成功訊息以及檔案的完整路徑
    return NextResponse.json({
      message: "上傳成功",
      fileUrl: `/api/images/${fileName}`,
      originalSize: fileField.size,
      compressedSize: compressedBuffer.length,
      savedBytes,
      compressionInfo: `原始 ${originalSizeKB}KB → 壓縮後 ${compressedSizeKB}KB（節省 ${compressionRatio}%）`,
    });
  } catch (error) {
    console.error("上傳錯誤：", error);
    return NextResponse.json({ error: "檔案上傳失敗" }, { status: 500 });
  }
}
