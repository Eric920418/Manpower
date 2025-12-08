import { prisma } from "../prismaClient";

// 權限檢查輔助函數
function hasPermission(userRole: string, requiredPermission: string): boolean {
  // 超級管理員擁有所有權限
  if (userRole === "SUPER_ADMIN") {
    return true;
  }

  // 管理員權限（ADMIN 可以讀取和處理表單）
  const adminPermissions = [
    "form:read",
    "form:process",
  ];

  // 業主權限
  const ownerPermissions = [
    "form:read",
    "form:create",
    "form:update",
    "form:delete",
    "form:process",
  ];

  // 業務人員權限
  const staffPermissions = ["form:read", "form:process"];

  const permissions =
    userRole === "ADMIN"
      ? adminPermissions
      : userRole === "OWNER"
      ? ownerPermissions
      : userRole === "STAFF"
      ? staffPermissions
      : [];

  return permissions.includes(requiredPermission);
}

export const manpowerRequestResolvers = {
  Query: {
    // 獲取人力需求列表（支援篩選）
    manpowerRequests: async (
      _: any,
      { filter }: { filter?: any },
      context: any
    ) => {
      // 權限檢查
      if (!context.user) {
        throw new Error("未登入，無法查看人力需求");
      }

      if (!hasPermission(context.user.role, "form:read")) {
        throw new Error("沒有權限查看人力需求");
      }

      try {
        // 構建查詢條件
        const where: any = {};

        // 業務人員 (STAFF) 只能看到自己介紹的客戶
        // SUPER_ADMIN 和 OWNER 可以看到所有客戶
        if (context.user.role === "STAFF") {
          where.invitedBy = context.user.id;
        }

        if (filter) {
          if (filter.status) {
            where.status = filter.status;
          }
          if (filter.contactEmail) {
            where.contactEmail = {
              contains: filter.contactEmail,
              mode: "insensitive",
            };
          }
          if (filter.startDate || filter.endDate) {
            where.createdAt = {};
            if (filter.startDate) {
              where.createdAt.gte = new Date(filter.startDate);
            }
            if (filter.endDate) {
              where.createdAt.lte = new Date(filter.endDate);
            }
          }
        }

        const requests = await prisma.manpowerRequest.findMany({
          where,
          orderBy: {
            createdAt: "desc",
          },
        });

        return requests.map((req) => ({
          ...req,
          expectedStartDate: req.expectedStartDate?.toISOString() || null,
          processedAt: req.processedAt?.toISOString() || null,
          createdAt: req.createdAt.toISOString(),
          updatedAt: req.updatedAt.toISOString(),
        }));
      } catch (error) {
        console.error("查詢人力需求失敗：", error);
        throw new Error(
          `查詢失敗：${error instanceof Error ? error.message : "未知錯誤"}`
        );
      }
    },

    // 根據 ID 獲取單一需求
    manpowerRequest: async (_: any, { id }: { id: number }, context: any) => {
      if (!context.user) {
        throw new Error("未登入，無法查看人力需求");
      }

      if (!hasPermission(context.user.role, "form:read")) {
        throw new Error("沒有權限查看人力需求");
      }

      try {
        const request = await prisma.manpowerRequest.findUnique({
          where: { id },
        });

        if (!request) {
          throw new Error("找不到該人力需求");
        }

        return {
          ...request,
          expectedStartDate: request.expectedStartDate?.toISOString() || null,
          processedAt: request.processedAt?.toISOString() || null,
          createdAt: request.createdAt.toISOString(),
          updatedAt: request.updatedAt.toISOString(),
        };
      } catch (error) {
        console.error("查詢人力需求失敗：", error);
        throw new Error(
          `查詢失敗：${error instanceof Error ? error.message : "未知錯誤"}`
        );
      }
    },

    // 根據需求單號獲取需求
    manpowerRequestByNo: async (
      _: any,
      { requestNo }: { requestNo: string },
      context: any
    ) => {
      if (!context.user) {
        throw new Error("未登入，無法查看人力需求");
      }

      if (!hasPermission(context.user.role, "form:read")) {
        throw new Error("沒有權限查看人力需求");
      }

      try {
        const request = await prisma.manpowerRequest.findUnique({
          where: { requestNo },
        });

        if (!request) {
          throw new Error("找不到該人力需求");
        }

        return {
          ...request,
          expectedStartDate: request.expectedStartDate?.toISOString() || null,
          processedAt: request.processedAt?.toISOString() || null,
          createdAt: request.createdAt.toISOString(),
          updatedAt: request.updatedAt.toISOString(),
        };
      } catch (error) {
        console.error("查詢人力需求失敗：", error);
        throw new Error(
          `查詢失敗：${error instanceof Error ? error.message : "未知錯誤"}`
        );
      }
    },

    // 獲取統計資料
    manpowerRequestStats: async (_: any, __: any, context: any) => {
      if (!context.user) {
        throw new Error("未登入，無法查看統計資料");
      }

      if (!hasPermission(context.user.role, "form:read")) {
        throw new Error("沒有權限查看統計資料");
      }

      try {
        // 業務人員 (STAFF) 只統計自己介紹的客戶
        // SUPER_ADMIN 和 OWNER 可以看到所有統計
        const baseWhere =
          context.user.role === "STAFF"
            ? { invitedBy: context.user.id }
            : {};

        const [total, pending, processing, completed, rejected, cancelled] =
          await Promise.all([
            prisma.manpowerRequest.count({ where: baseWhere }),
            prisma.manpowerRequest.count({
              where: { ...baseWhere, status: "pending" },
            }),
            prisma.manpowerRequest.count({
              where: { ...baseWhere, status: "processing" },
            }),
            prisma.manpowerRequest.count({
              where: { ...baseWhere, status: "completed" },
            }),
            prisma.manpowerRequest.count({
              where: { ...baseWhere, status: "rejected" },
            }),
            prisma.manpowerRequest.count({
              where: { ...baseWhere, status: "cancelled" },
            }),
          ]);

        return {
          total,
          pending,
          processing,
          completed,
          rejected,
          cancelled,
        };
      } catch (error) {
        console.error("查詢統計資料失敗：", error);
        throw new Error(
          `查詢失敗：${error instanceof Error ? error.message : "未知錯誤"}`
        );
      }
    },
  },

  Mutation: {
    // 更新人力需求（主要用於更新狀態和備註）- 僅 SUPER_ADMIN 可操作
    updateManpowerRequest: async (
      _: any,
      { input }: { input: any },
      context: any
    ) => {
      if (!context.user) {
        throw new Error("未登入，無法更新人力需求");
      }

      // 只有 SUPER_ADMIN 可以更新狀態
      if (context.user.role !== "SUPER_ADMIN") {
        throw new Error("只有系統管理員可以更新人力需求狀態");
      }

      try {
        const updateData: any = {};

        if (input.status) {
          updateData.status = input.status;
        }

        if (input.notes !== undefined) {
          updateData.notes = input.notes;
        }

        if (input.processedBy) {
          updateData.processedBy = input.processedBy;
        }

        // 如果狀態更新為非 pending，記錄處理時間
        if (input.status && input.status !== "pending") {
          updateData.processedAt = new Date();
          if (!input.processedBy) {
            updateData.processedBy = context.user.id;
          }
        }

        const request = await prisma.manpowerRequest.update({
          where: { id: input.id },
          data: updateData,
        });

        // 記錄活動日誌
        await prisma.activityLog.create({
          data: {
            userId: context.user.id,
            action: "update",
            entity: "manpower_request",
            entityId: request.id.toString(),
            details: {
              requestNo: request.requestNo,
              changes: updateData,
            },
          },
        });

        return {
          ...request,
          expectedStartDate: request.expectedStartDate?.toISOString() || null,
          processedAt: request.processedAt?.toISOString() || null,
          createdAt: request.createdAt.toISOString(),
          updatedAt: request.updatedAt.toISOString(),
        };
      } catch (error) {
        console.error("更新人力需求失敗：", error);
        throw new Error(
          `更新失敗：${error instanceof Error ? error.message : "未知錯誤"}`
        );
      }
    },

    // 刪除人力需求（僅超級管理員和業主）
    deleteManpowerRequest: async (
      _: any,
      { id }: { id: number },
      context: any
    ) => {
      if (!context.user) {
        throw new Error("未登入，無法刪除人力需求");
      }

      if (!hasPermission(context.user.role, "form:delete")) {
        throw new Error("沒有權限刪除人力需求");
      }

      try {
        // 先獲取需求資訊以記錄日誌
        const request = await prisma.manpowerRequest.findUnique({
          where: { id },
        });

        await prisma.manpowerRequest.delete({
          where: { id },
        });

        // 記錄活動日誌
        if (request) {
          await prisma.activityLog.create({
            data: {
              userId: context.user.id,
              action: "delete",
              entity: "manpower_request",
              entityId: id.toString(),
              details: {
                requestNo: request.requestNo,
                contactPerson: request.contactPerson,
              },
            },
          });
        }

        return true;
      } catch (error) {
        console.error("刪除人力需求失敗：", error);
        throw new Error(
          `刪除失敗：${error instanceof Error ? error.message : "未知錯誤"}`
        );
      }
    },
  },
};
