import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/graphql/prismaClient";

// 驗證 reCAPTCHA token
async function verifyRecaptcha(token: string): Promise<{ success: boolean; score?: number }> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;

  if (!secretKey) {
    // 如果沒有設定 secret key，跳過驗證
    return { success: true };
  }

  try {
    const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    });

    const data = await response.json();
    return { success: data.success, score: data.score };
  } catch {
    return { success: false };
  }
}

// POST - 建立新的聯絡表單提交
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { questionType, name, email, phone, message, recaptchaToken } = body;

    // 驗證 reCAPTCHA（如果有設定的話）
    if (process.env.RECAPTCHA_SECRET_KEY) {
      if (!recaptchaToken) {
        return NextResponse.json(
          { error: "驗證失敗，請重新整理頁面後再試" },
          { status: 400 }
        );
      }

      const recaptchaResult = await verifyRecaptcha(recaptchaToken);

      if (!recaptchaResult.success) {
        return NextResponse.json(
          { error: "驗證失敗，請重新整理頁面後再試" },
          { status: 400 }
        );
      }

      // reCAPTCHA v3 分數檢查（0.0 - 1.0，分數越高越可能是真人）
      // 建議閾值：0.5，可根據需求調整
      if (recaptchaResult.score !== undefined && recaptchaResult.score < 0.5) {
        return NextResponse.json(
          { error: "系統偵測到異常行為，請稍後再試" },
          { status: 400 }
        );
      }
    }

    // 驗證必填欄位
    if (!name || !email || !phone || !message) {
      return NextResponse.json(
        { error: "請填寫所有必填欄位" },
        { status: 400 }
      );
    }

    // 取得問題類型的顯示名稱
    let questionLabel = questionType;
    try {
      const contactPageRes = await prisma.contentBlock.findUnique({
        where: { key: "contactPage" },
      });
      if (contactPageRes?.payload) {
        const payload = contactPageRes.payload as { questionTypes?: Array<{ id: string; label: string }> };
        const typeInfo = payload.questionTypes?.find((t) => t.id === questionType);
        if (typeInfo) {
          questionLabel = typeInfo.label;
        }
      }
    } catch {
      // 如果無法取得標籤，使用 ID 作為標籤
    }

    // 取得 IP 和 User Agent
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // 建立提交記錄
    const submission = await prisma.contactSubmission.create({
      data: {
        questionType: questionType || "general",
        questionLabel,
        name,
        email,
        phone,
        message,
        ipAddress,
        userAgent,
      },
    });

    return NextResponse.json({ success: true, id: submission.id });
  } catch (error) {
    console.error("聯絡表單提交失敗:", error);
    return NextResponse.json(
      { error: "提交失敗，請稍後再試" },
      { status: 500 }
    );
  }
}

// GET - 取得聯絡表單提交列表（需要認證）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const questionType = searchParams.get("questionType");
    const search = searchParams.get("search");

    const where: {
      status?: string;
      questionType?: string;
      OR?: Array<{ name?: { contains: string; mode: "insensitive" }; email?: { contains: string; mode: "insensitive" }; phone?: { contains: string } }>;
    } = {};

    if (status) {
      where.status = status;
    }

    if (questionType) {
      where.questionType = questionType;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
      ];
    }

    const [submissions, total] = await Promise.all([
      prisma.contactSubmission.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.contactSubmission.count({ where }),
    ]);

    return NextResponse.json({
      submissions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("取得聯絡表單列表失敗:", error);
    return NextResponse.json(
      { error: "取得資料失敗" },
      { status: 500 }
    );
  }
}
