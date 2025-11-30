import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../graphql/prismaClient";

// 生成需求單號（格式：MPR-YYYYMMDD-XXXXX）
function generateRequestNo(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, "0");

  return `MPR-${year}${month}${day}-${random}`;
}

export async function POST(request: NextRequest) {
  try {
    // 解析請求資料
    const body = await request.json();

    // 驗證必填欄位
    if (!body.contactPerson || !body.contactPerson.trim()) {
      return NextResponse.json(
        { error: true, message: "聯絡人姓名為必填欄位" },
        { status: 400 }
      );
    }

    if (!body.contactPhone || !body.contactPhone.trim()) {
      return NextResponse.json(
        { error: true, message: "聯絡電話為必填欄位" },
        { status: 400 }
      );
    }

    // Email 改為選填，不再驗證必填

    if (!body.selectedResumeIds || !Array.isArray(body.selectedResumeIds)) {
      return NextResponse.json(
        { error: true, message: "請選擇至少一位求職者" },
        { status: 400 }
      );
    }

    // 生成唯一需求單號（檢查是否重複）
    let requestNo = generateRequestNo();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prisma.manpowerRequest.findUnique({
        where: { requestNo },
      });

      if (!existing) {
        break;
      }

      requestNo = generateRequestNo();
      attempts++;
    }

    if (attempts >= 10) {
      return NextResponse.json(
        { error: true, message: "無法生成唯一需求單號，請稍後再試" },
        { status: 500 }
      );
    }

    // 驗證介紹人 ID（如果有提供）
    let invitedByUserId: string | null = null;
    if (body.referrerId && body.referrerId.trim()) {
      // 驗證該業務人員是否存在且為 STAFF 角色
      const staff = await prisma.user.findFirst({
        where: {
          id: body.referrerId,
          role: 'STAFF',
          isActive: true,
        },
      });

      if (!staff) {
        return NextResponse.json(
          {
            error: true,
            message: "所選介紹人無效"
          },
          { status: 400 }
        );
      }

      invitedByUserId = staff.id;
    }

    // 獲取客戶端資訊
    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // 準備資料物件（只包含非 undefined 的欄位）
    const createData: any = {
      requestNo,
      selectedResumeIds: body.selectedResumes || body.selectedResumeIds, // 存儲完整資料或退回到 ID
      contactPerson: body.contactPerson.trim(),
      contactPhone: body.contactPhone.trim(),
      quantity: body.quantity || 1,
      ipAddress,
      userAgent,
      status: "pending",
    };

    // 選填欄位：Email
    if (body.contactEmail?.trim()) {
      createData.contactEmail = body.contactEmail.trim();
    }

    // 選填欄位：Line ID
    if (body.lineId?.trim()) {
      createData.lineId = body.lineId.trim();
    }

    // 選填欄位：申請資格（複選）
    if (body.qualifications && Array.isArray(body.qualifications) && body.qualifications.length > 0) {
      createData.qualifications = body.qualifications;
    }

    // 選填欄位：公司名稱（向後兼容）
    if (body.companyName?.trim()) {
      createData.companyName = body.companyName.trim();
    }

    // 添加介紹人資訊
    if (invitedByUserId) {
      createData.invitedBy = invitedByUserId;
    }

    // 只在欄位存在時才加入（避免傳遞 null 導致 Prisma 錯誤）
    if (body.positionTitle?.trim()) {
      createData.positionTitle = body.positionTitle.trim();
    }
    if (body.jobDescription?.trim()) {
      createData.jobDescription = body.jobDescription.trim();
    }
    if (body.salaryRange?.trim()) {
      createData.salaryRange = body.salaryRange.trim();
    }
    if (body.expectedStartDate) {
      createData.expectedStartDate = new Date(body.expectedStartDate);
    }
    if (body.workLocation?.trim()) {
      createData.workLocation = body.workLocation.trim();
    }
    if (body.additionalRequirements?.trim()) {
      createData.additionalRequirements = body.additionalRequirements.trim();
    }

    // 儲存到資料庫
    const manpowerRequest = await prisma.manpowerRequest.create({
      data: createData,
    });

    // 返回成功結果
    return NextResponse.json({
      success: true,
      message: "需求已成功提交",
      requestNo: manpowerRequest.requestNo,
      id: manpowerRequest.id,
    });
  } catch (error) {
    console.error("❌ 人力需求提交失敗：", error);

    // 返回錯誤訊息
    return NextResponse.json(
      {
        error: true,
        message: error instanceof Error ? error.message : "提交失敗，請稍後再試",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// 獲取需求列表（可選功能，用於管理後台）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const email = searchParams.get("email");

    // 構建查詢條件
    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (email) {
      where.contactEmail = email;
    }

    // 查詢資料
    const requests = await prisma.manpowerRequest.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: 50, // 限制返回數量
    });

    return NextResponse.json({
      success: true,
      data: requests,
      count: requests.length,
    });
  } catch (error) {
    console.error("❌ 獲取需求列表失敗：", error);

    return NextResponse.json(
      {
        error: true,
        message: error instanceof Error ? error.message : "獲取失敗",
      },
      { status: 500 }
    );
  }
}
