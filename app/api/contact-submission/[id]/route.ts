import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/graphql/prismaClient";

// GET - 取得單筆聯絡表單提交
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const submission = await prisma.contactSubmission.findUnique({
      where: { id: parseInt(id) },
    });

    if (!submission) {
      return NextResponse.json(
        { error: "找不到此提交記錄" },
        { status: 404 }
      );
    }

    return NextResponse.json(submission);
  } catch (error) {
    console.error("取得聯絡表單失敗:", error);
    return NextResponse.json(
      { error: "取得資料失敗" },
      { status: 500 }
    );
  }
}

// PATCH - 更新聯絡表單提交（狀態、備註等）
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, notes, repliedBy } = body;

    const updateData: {
      status?: string;
      notes?: string;
      repliedAt?: Date;
      repliedBy?: string;
    } = {};

    if (status) {
      updateData.status = status;
      if (status === "replied") {
        updateData.repliedAt = new Date();
        if (repliedBy) {
          updateData.repliedBy = repliedBy;
        }
      }
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const submission = await prisma.contactSubmission.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    return NextResponse.json(submission);
  } catch (error) {
    console.error("更新聯絡表單失敗:", error);
    return NextResponse.json(
      { error: "更新失敗" },
      { status: 500 }
    );
  }
}

// DELETE - 刪除聯絡表單提交
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.contactSubmission.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("刪除聯絡表單失敗:", error);
    return NextResponse.json(
      { error: "刪除失敗" },
      { status: 500 }
    );
  }
}
