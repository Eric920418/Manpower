import { NextResponse } from "next/server";
import fs from "fs/promises";
import { createReadStream } from "fs";
import path from "path";
import crypto from "crypto";

// Next.js App Router 設定
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 從環境變數取得上傳目錄
const UPLOAD_DIR =
  process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

// 根據副檔名決定 Content-Type
const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // 檢查檔名是否合法（安全性檢查）
    if (!filename || filename.includes("..") || filename.includes("/")) {
      return NextResponse.json({ error: "無效的檔名" }, { status: 400 });
    }

    const filePath = path.join(UPLOAD_DIR, "images", filename);

    // 取得檔案資訊
    let stat;
    try {
      stat = await fs.stat(filePath);
    } catch {
      return NextResponse.json({ error: "找不到圖片" }, { status: 404 });
    }

    // 生成 ETag（基於檔案大小和修改時間）
    const etag = crypto
      .createHash("md5")
      .update(`${stat.size}-${stat.mtime.getTime()}`)
      .digest("hex");

    // 檢查 If-None-Match 標頭（快取驗證）
    const ifNoneMatch = request.headers.get("if-none-match");
    if (ifNoneMatch === `"${etag}"`) {
      return new NextResponse(null, { status: 304 });
    }

    // 檢查 If-Modified-Since 標頭
    const ifModifiedSince = request.headers.get("if-modified-since");
    if (ifModifiedSince) {
      const modifiedSinceDate = new Date(ifModifiedSince);
      if (stat.mtime <= modifiedSinceDate) {
        return new NextResponse(null, { status: 304 });
      }
    }

    const ext = path.extname(filename).toLowerCase();
    const contentType = CONTENT_TYPES[ext] || "application/octet-stream";
    const fileSize = stat.size;

    // 處理 Range 請求（支援斷點續傳和大檔案串流）
    const rangeHeader = request.headers.get("range");

    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
      if (match) {
        const start = match[1] ? parseInt(match[1], 10) : 0;
        const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;

        // 驗證範圍
        if (start >= fileSize || end >= fileSize || start > end) {
          return new NextResponse(null, {
            status: 416,
            headers: {
              "Content-Range": `bytes */${fileSize}`,
            },
          });
        }

        const chunkSize = end - start + 1;

        // 使用串流讀取指定範圍
        const stream = createReadStream(filePath, { start, end });
        const readableStream = new ReadableStream({
          start(controller) {
            stream.on("data", (chunk) => controller.enqueue(chunk));
            stream.on("end", () => controller.close());
            stream.on("error", (err) => controller.error(err));
          },
        });

        return new NextResponse(readableStream, {
          status: 206,
          headers: {
            "Content-Type": contentType,
            "Content-Length": chunkSize.toString(),
            "Content-Range": `bytes ${start}-${end}/${fileSize}`,
            "Accept-Ranges": "bytes",
            "Cache-Control": "public, max-age=31536000, immutable",
            "ETag": `"${etag}"`,
            "Last-Modified": stat.mtime.toUTCString(),
          },
        });
      }
    }

    // 完整檔案響應（使用串流而非一次性讀取）
    const stream = createReadStream(filePath);
    const readableStream = new ReadableStream({
      start(controller) {
        stream.on("data", (chunk) => controller.enqueue(chunk));
        stream.on("end", () => controller.close());
        stream.on("error", (err) => controller.error(err));
      },
    });

    return new NextResponse(readableStream, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": fileSize.toString(),
        "Content-Disposition": `inline; filename="${encodeURIComponent(filename)}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
        "ETag": `"${etag}"`,
        "Last-Modified": stat.mtime.toUTCString(),
        "Accept-Ranges": "bytes",
        "Vary": "Accept-Encoding",
      },
    });
  } catch (error) {
    console.error("讀取圖片錯誤：", error);
    return new NextResponse(null, { status: 500 });
  }
}
