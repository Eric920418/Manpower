import { prisma } from "../prismaClient";
import { hasPermissionWithCustom, type CustomPermissions } from "@/lib/permissions";
import type { Role } from "@prisma/client";

interface Context {
  user?: {
    id: string;
    role: string;
    customPermissions?: CustomPermissions | null;
  };
}

const requireSystemConfig = (context: Context) => {
  if (!context.user) {
    throw new Error("未登入");
  }

  const hasPermission = hasPermissionWithCustom(
    context.user.role as Role,
    'system:config',
    context.user.customPermissions
  );

  if (!hasPermission) {
    throw new Error("權限不足：需要「系統設定」權限才能進行此操作");
  }

  return context.user;
};

const MAINTENANCE_KEY = "maintenanceMode";

export const maintenanceModeResolvers = {
  Query: {
    maintenanceMode: async () => {
      const config = await prisma.systemConfig.findUnique({
        where: { key: MAINTENANCE_KEY },
      });

      if (!config) {
        return { id: "0", enabled: false, message: "網站維修中，請稍後再試。" };
      }

      const value = config.value as { enabled?: boolean; message?: string };
      return {
        id: config.id.toString(),
        enabled: value.enabled ?? false,
        message: value.message ?? "網站維修中，請稍後再試。",
      };
    },
  },

  Mutation: {
    updateMaintenanceMode: async (
      _: unknown,
      { input }: { input: { enabled: boolean; message?: string } },
      context: Context
    ) => {
      const user = requireSystemConfig(context);

      const value = {
        enabled: input.enabled,
        message: input.message ?? "網站維修中，請稍後再試。",
      };

      const config = await prisma.systemConfig.upsert({
        where: { key: MAINTENANCE_KEY },
        create: {
          key: MAINTENANCE_KEY,
          value,
          category: "system",
        },
        update: {
          value,
        },
      });

      // 記錄活動日誌
      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: "update",
          entity: "system_config",
          entityId: MAINTENANCE_KEY,
          details: {
            configName: "維護模式",
            enabled: input.enabled,
            message: value.message,
          },
        },
      });

      const resultValue = config.value as { enabled?: boolean; message?: string };
      return {
        id: config.id.toString(),
        enabled: resultValue.enabled ?? false,
        message: resultValue.message ?? "網站維修中，請稍後再試。",
      };
    },
  },
};
