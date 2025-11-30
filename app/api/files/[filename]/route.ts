import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { prisma } from '@/graphql/prismaClient';

// 從環境變數取得上傳目錄
const UPLOAD_DIR =
  process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // 防止路徑遍歷攻擊
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json(
        { error: '無效的檔案名稱' },
        { status: 400 }
      );
    }

    // 查詢資料庫確認檔案存在
    const attachment = await prisma.attachment.findFirst({
      where: { filename },
    });

    if (!attachment) {
      return NextResponse.json(
        { error: '檔案不存在' },
        { status: 404 }
      );
    }

    // 檢查檔案是否存在於檔案系統
    const filePath = path.join(UPLOAD_DIR, filename);
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: '檔案不存在於檔案系統' },
        { status: 404 }
      );
    }

    // 讀取檔案
    const fileBuffer = await readFile(filePath);

    // 設定適當的 Content-Type header
    const headers = new Headers();
    headers.set('Content-Type', attachment.mimeType);
    headers.set('Content-Disposition', `inline; filename="${encodeURIComponent(attachment.originalName)}"`);
    headers.set('Content-Length', attachment.size.toString());

    return new NextResponse(fileBuffer, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error('檔案訪問錯誤:', error);
    return NextResponse.json(
      { error: `無法讀取檔案: ${error.message}` },
      { status: 500 }
    );
  }
}

// 刪除檔案
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // 防止路徑遍歷攻擊
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json(
        { error: '無效的檔案名稱' },
        { status: 400 }
      );
    }

    // 查詢資料庫確認檔案存在
    const attachment = await prisma.attachment.findFirst({
      where: { filename },
    });

    if (!attachment) {
      return NextResponse.json(
        { error: '檔案不存在' },
        { status: 404 }
      );
    }

    // 從資料庫刪除記錄（會觸發級聯刪除）
    await prisma.attachment.delete({
      where: { id: attachment.id },
    });

    // 從檔案系統刪除檔案
    const filePath = path.join(UPLOAD_DIR, filename);
    if (existsSync(filePath)) {
      const { unlink } = await import('fs/promises');
      await unlink(filePath);
    }

    return NextResponse.json({
      success: true,
      message: '檔案已刪除',
    });
  } catch (error: any) {
    console.error('檔案刪除錯誤:', error);
    return NextResponse.json(
      { error: `無法刪除檔案: ${error.message}` },
      { status: 500 }
    );
  }
}
