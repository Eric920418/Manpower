import { Role } from '@prisma/client';
import { hasPermission, Permission } from '../../src/lib/permissions';
import { prisma } from '../prismaClient';

interface Context {
  user?: {
    id: string;
    role: Role;
    email: string;
  };
  isIPAllowed?: boolean;
}

interface FormTemplateFilterInput {
  search?: string;
  type?: string;
  isActive?: boolean;
}

interface FormSubmissionFilterInput {
  search?: string;
  formType?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface CreateFormTemplateInput {
  name: string;
  type: string;
  description?: string;
  fields: any;
  settings?: any;
  isActive?: boolean;
}

interface UpdateFormTemplateInput {
  name?: string;
  type?: string;
  description?: string;
  fields?: any;
  settings?: any;
  isActive?: boolean;
}

interface ProcessFormSubmissionInput {
  status: string;
  notes?: string;
}

export const formResolvers = {
  Query: {
    /**
     * 獲取表單模板列表（分頁）
     */
    formTemplates: async (
      _: unknown,
      args: {
        page?: number;
        pageSize?: number;
        filter?: FormTemplateFilterInput;
      },
      context: Context
    ) => {
      // 權限檢查
      // 開發環境下：如果 IP 在白名單內，暫時允許訪問
      if (!context.user) {
        if (process.env.NODE_ENV !== 'development' || !context.isIPAllowed) {
          throw new Error('未授權：請先登入');
        }
        // 開發環境且 IP 允許，繼續執行
        console.log('⚠️ 開發模式：允許無認證查詢（IP 已驗證）');
      } else if (!hasPermission(context.user.role, 'form:read')) {
        throw new Error('沒有權限查看表單模板');
      }

      const page = args.page || 1;
      const pageSize = args.pageSize || 10;
      const skip = (page - 1) * pageSize;

      // 建立查詢條件
      const where: any = {};

      if (args.filter) {
        // 搜尋（name 或 description）
        if (args.filter.search) {
          where.OR = [
            { name: { contains: args.filter.search, mode: 'insensitive' } },
            { description: { contains: args.filter.search, mode: 'insensitive' } },
          ];
        }

        // 類型篩選
        if (args.filter.type) {
          where.type = args.filter.type;
        }

        // 狀態篩選
        if (typeof args.filter.isActive === 'boolean') {
          where.isActive = args.filter.isActive;
        }
      }

      // 查詢總數
      const total = await prisma.formTemplate.count({ where });

      // 查詢模板
      const templates = await prisma.formTemplate.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { submissions: true },
          },
        },
      });

      // 添加統計數據
      const templatesWithStats = templates.map((template) => ({
        ...template,
        submissionCount: template._count.submissions,
      }));

      return {
        templates: templatesWithStats,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    },

    /**
     * 獲取單個表單模板
     */
    formTemplate: async (_: unknown, args: { id: string }, context: Context) => {
      if (!context.user) {
        throw new Error('未授權：請先登入');
      }

      if (!hasPermission(context.user.role, 'form:read')) {
        throw new Error('沒有權限查看表單模板');
      }

      const template = await prisma.formTemplate.findUnique({
        where: { id: parseInt(args.id) },
        include: {
          _count: {
            select: { submissions: true },
          },
        },
      });

      if (!template) {
        throw new Error('表單模板不存在');
      }

      return {
        ...template,
        submissionCount: template._count.submissions,
      };
    },

    /**
     * 獲取表單提交列表（分頁）
     */
    formSubmissions: async (
      _: unknown,
      args: {
        page?: number;
        pageSize?: number;
        filter?: FormSubmissionFilterInput;
      },
      context: Context
    ) => {
      if (!context.user) {
        throw new Error('未授權：請先登入');
      }

      if (!hasPermission(context.user.role, 'form:read')) {
        throw new Error('沒有權限查看表單提交');
      }

      const page = args.page || 1;
      const pageSize = args.pageSize || 10;
      const skip = (page - 1) * pageSize;

      // 建立查詢條件
      const where: any = {};

      if (args.filter) {
        // 搜尋（submitterName 或 submitterEmail）
        if (args.filter.search) {
          where.OR = [
            { submitterName: { contains: args.filter.search, mode: 'insensitive' } },
            { submitterEmail: { contains: args.filter.search, mode: 'insensitive' } },
          ];
        }

        // 表單類型篩選
        if (args.filter.formType) {
          where.formType = args.filter.formType;
        }

        // 狀態篩選
        if (args.filter.status) {
          where.status = args.filter.status;
        }

        // 日期範圍篩選
        if (args.filter.dateFrom || args.filter.dateTo) {
          where.createdAt = {};
          if (args.filter.dateFrom) {
            where.createdAt.gte = new Date(args.filter.dateFrom);
          }
          if (args.filter.dateTo) {
            where.createdAt.lte = new Date(args.filter.dateTo);
          }
        }
      }

      // 優化：並行查詢總數和資料
      const [total, submissions] = await Promise.all([
        prisma.formSubmission.count({ where }),
        prisma.formSubmission.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            formType: true,
            status: true,
            submitterName: true,
            submitterEmail: true,
            submitterPhone: true,
            data: true,
            notes: true,
            createdAt: true,
            updatedAt: true,
            processedAt: true,
            templateId: true,
            processedBy: true,
            template: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
            processor: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
              },
            },
            attachments: {
              select: {
                id: true,
                filename: true,
                originalName: true,
                mimeType: true,
                size: true,
                url: true,
              },
            },
          },
        }),
      ]);

      return {
        submissions,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    },

    /**
     * 獲取單個表單提交
     */
    formSubmission: async (_: unknown, args: { id: string }, context: Context) => {
      if (!context.user) {
        throw new Error('未授權：請先登入');
      }

      if (!hasPermission(context.user.role, 'form:read')) {
        throw new Error('沒有權限查看表單提交');
      }

      const submission = await prisma.formSubmission.findUnique({
        where: { id: parseInt(args.id) },
        include: {
          template: true,
          processor: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
            },
          },
          attachments: true,
        },
      });

      if (!submission) {
        throw new Error('表單提交不存在');
      }

      return submission;
    },

    /**
     * 獲取表單統計數據 - 優化：使用 groupBy 減少查詢次數
     */
    formStats: async (_: unknown, __: unknown, context: Context) => {
      if (!context.user) {
        throw new Error('未授權：請先登入');
      }

      if (!hasPermission(context.user.role, 'form:read')) {
        throw new Error('沒有權限查看表單統計');
      }

      // 優化：從 6 個查詢減少到 3 個（模板 2 個 + 提交 groupBy 1 個）
      const [
        totalTemplates,
        activeTemplates,
        submissionStats,
      ] = await Promise.all([
        prisma.formTemplate.count(),
        prisma.formTemplate.count({ where: { isActive: true } }),
        // 使用 groupBy 一次查詢所有狀態的計數
        prisma.formSubmission.groupBy({
          by: ['status'],
          _count: { id: true },
        }),
      ]);

      // 將 groupBy 結果轉換為 map
      const statsMap = new Map(
        submissionStats.map(s => [s.status, s._count.id])
      );

      return {
        totalTemplates,
        activeTemplates,
        totalSubmissions: submissionStats.reduce((sum, s) => sum + s._count.id, 0),
        pendingSubmissions: statsMap.get('pending') || 0,
        processingSubmissions: statsMap.get('processing') || 0,
        completedSubmissions: statsMap.get('completed') || 0,
      };
    },

    /**
     * 獲取附件列表（分頁）
     */
    attachments: async (
      _: unknown,
      args: {
        page?: number;
        pageSize?: number;
        filter?: {
          search?: string;
          mimeType?: string;
        };
      },
      context: Context
    ) => {
      // 權限檢查
      // 開發環境下：如果 IP 在白名單內，暫時允許訪問
      if (!context.user) {
        if (process.env.NODE_ENV !== 'development' || !context.isIPAllowed) {
          throw new Error('未授權：請先登入');
        }
        // 開發環境且 IP 允許，繼續執行
        console.log('⚠️ 開發模式：允許無認證查詢（IP 已驗證）');
      } else if (!hasPermission(context.user.role, 'file:read')) {
        throw new Error('沒有權限查看檔案');
      }

      const page = args.page || 1;
      const pageSize = args.pageSize || 20;
      const skip = (page - 1) * pageSize;

      // 建立查詢條件
      const where: any = {};

      if (args.filter) {
        // 搜尋（originalName 或 filename）
        if (args.filter.search) {
          where.OR = [
            { originalName: { contains: args.filter.search, mode: 'insensitive' } },
            { filename: { contains: args.filter.search, mode: 'insensitive' } },
          ];
        }

        // 檔案類型篩選
        if (args.filter.mimeType) {
          where.mimeType = { contains: args.filter.mimeType };
        }
      }

      // 查詢總數
      const total = await prisma.attachment.count({ where });

      // 查詢附件
      const attachments = await prisma.attachment.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      });

      return {
        attachments,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    },

    /**
     * 獲取單個附件
     */
    attachment: async (_: unknown, args: { id: string }, context: Context) => {
      if (!context.user) {
        throw new Error('未授權：請先登入');
      }

      if (!hasPermission(context.user.role, 'file:read')) {
        throw new Error('沒有權限查看檔案');
      }

      const attachment = await prisma.attachment.findUnique({
        where: { id: parseInt(args.id) },
      });

      if (!attachment) {
        throw new Error('檔案不存在');
      }

      return attachment;
    },
  },

  Mutation: {
    /**
     * 創建表單模板
     */
    createFormTemplate: async (
      _: unknown,
      args: { input: CreateFormTemplateInput },
      context: Context
    ) => {
      if (!context.user) {
        throw new Error('未授權：請先登入');
      }

      if (!hasPermission(context.user.role, 'form:create')) {
        throw new Error('沒有權限創建表單模板');
      }

      const template = await prisma.formTemplate.create({
        data: {
          name: args.input.name,
          type: args.input.type,
          description: args.input.description,
          fields: args.input.fields,
          settings: args.input.settings || {},
          isActive: args.input.isActive !== undefined ? args.input.isActive : true,
        },
        include: {
          _count: {
            select: { submissions: true },
          },
        },
      });

      // 記錄操作日誌
      await prisma.activityLog.create({
        data: {
          userId: context.user.id,
          action: 'create',
          entity: 'form_template',
          entityId: template.id.toString(),
          details: {
            templateName: template.name,
            templateType: template.type,
          },
        },
      });

      return {
        ...template,
        submissionCount: template._count.submissions,
      };
    },

    /**
     * 更新表單模板
     */
    updateFormTemplate: async (
      _: unknown,
      args: { id: string; input: UpdateFormTemplateInput },
      context: Context
    ) => {
      if (!context.user) {
        throw new Error('未授權：請先登入');
      }

      if (!hasPermission(context.user.role, 'form:update')) {
        throw new Error('沒有權限更新表單模板');
      }

      const template = await prisma.formTemplate.update({
        where: { id: parseInt(args.id) },
        data: args.input,
        include: {
          _count: {
            select: { submissions: true },
          },
        },
      });

      // 記錄操作日誌
      await prisma.activityLog.create({
        data: {
          userId: context.user.id,
          action: 'update',
          entity: 'form_template',
          entityId: template.id.toString(),
          details: {
            templateName: template.name,
            changes: JSON.parse(JSON.stringify(args.input)),
          },
        },
      });

      return {
        ...template,
        submissionCount: template._count.submissions,
      };
    },

    /**
     * 刪除表單模板
     */
    deleteFormTemplate: async (
      _: unknown,
      args: { id: string },
      context: Context
    ) => {
      if (!context.user) {
        throw new Error('未授權：請先登入');
      }

      if (!hasPermission(context.user.role, 'form:delete')) {
        throw new Error('沒有權限刪除表單模板');
      }

      const template = await prisma.formTemplate.findUnique({
        where: { id: parseInt(args.id) },
      });

      if (!template) {
        throw new Error('表單模板不存在');
      }

      // 記錄操作日誌（在刪除前）
      await prisma.activityLog.create({
        data: {
          userId: context.user.id,
          action: 'delete',
          entity: 'form_template',
          entityId: args.id,
          details: {
            templateName: template.name,
            templateType: template.type,
          },
        },
      });

      // 刪除模板
      await prisma.formTemplate.delete({
        where: { id: parseInt(args.id) },
      });

      return true;
    },

    /**
     * 啟用/停用表單模板
     */
    toggleFormTemplateStatus: async (
      _: unknown,
      args: { id: string },
      context: Context
    ) => {
      if (!context.user) {
        throw new Error('未授權：請先登入');
      }

      if (!hasPermission(context.user.role, 'form:update')) {
        throw new Error('沒有權限更改表單模板狀態');
      }

      const template = await prisma.formTemplate.findUnique({
        where: { id: parseInt(args.id) },
      });

      if (!template) {
        throw new Error('表單模板不存在');
      }

      const updated = await prisma.formTemplate.update({
        where: { id: parseInt(args.id) },
        data: { isActive: !template.isActive },
        include: {
          _count: {
            select: { submissions: true },
          },
        },
      });

      // 記錄操作日誌
      await prisma.activityLog.create({
        data: {
          userId: context.user.id,
          action: 'toggle_status',
          entity: 'form_template',
          entityId: args.id,
          details: {
            templateName: template.name,
            newStatus: updated.isActive,
          },
        },
      });

      return {
        ...updated,
        submissionCount: updated._count.submissions,
      };
    },

    /**
     * 處理表單提交
     */
    processFormSubmission: async (
      _: unknown,
      args: { id: string; input: ProcessFormSubmissionInput },
      context: Context
    ) => {
      if (!context.user) {
        throw new Error('未授權：請先登入');
      }

      if (!hasPermission(context.user.role, 'form:update')) {
        throw new Error('沒有權限處理表單提交');
      }

      const submission = await prisma.formSubmission.update({
        where: { id: parseInt(args.id) },
        data: {
          status: args.input.status,
          notes: args.input.notes,
          processedBy: context.user.id,
          processedAt: new Date(),
        },
        include: {
          template: true,
          processor: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
            },
          },
          attachments: true,
        },
      });

      // 記錄操作日誌
      await prisma.activityLog.create({
        data: {
          userId: context.user.id,
          action: 'process',
          entity: 'form_submission',
          entityId: args.id,
          details: {
            submitterEmail: submission.submitterEmail,
            status: args.input.status,
            notes: args.input.notes,
          },
        },
      });

      return submission;
    },

    /**
     * 刪除表單提交
     */
    deleteFormSubmission: async (
      _: unknown,
      args: { id: string },
      context: Context
    ) => {
      if (!context.user) {
        throw new Error('未授權：請先登入');
      }

      if (!hasPermission(context.user.role, 'form:delete')) {
        throw new Error('沒有權限刪除表單提交');
      }

      const submission = await prisma.formSubmission.findUnique({
        where: { id: parseInt(args.id) },
      });

      if (!submission) {
        throw new Error('表單提交不存在');
      }

      // 記錄操作日誌（在刪除前）
      await prisma.activityLog.create({
        data: {
          userId: context.user.id,
          action: 'delete',
          entity: 'form_submission',
          entityId: args.id,
          details: {
            submitterEmail: submission.submitterEmail,
            formType: submission.formType,
          },
        },
      });

      // 刪除提交記錄（會自動級聯刪除關聯的附件）
      await prisma.formSubmission.delete({
        where: { id: parseInt(args.id) },
      });

      return true;
    },
  },
};
