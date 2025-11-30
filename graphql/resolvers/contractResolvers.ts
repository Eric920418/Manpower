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

interface CreateContractTemplateInput {
  name: string;
  type: string;
  content: string;
  variables?: any;
  isActive?: boolean;
}

interface UpdateContractTemplateInput {
  name?: string;
  type?: string;
  content?: string;
  variables?: any;
  isActive?: boolean;
}

interface CreateContractInput {
  templateId: number;
  title: string;
  parties: any;
  validFrom?: string;
  validUntil?: string;
}

interface UpdateContractInput {
  title?: string;
  content?: string;
  parties?: any;
  status?: string;
  validFrom?: string;
  validUntil?: string;
}

export const contractResolvers = {
  Query: {
    /**
     * 获取合约模板列表
     */
    contractTemplates: async (_: unknown, __: unknown, context: Context) => {
      // 权限检查
      if (!context.user) {
        if (process.env.NODE_ENV !== 'development' || !context.isIPAllowed) {
          throw new Error('未授权：请先登入');
        }
        console.log('⚠️ 开发模式：允许无认证查询（IP 已验证）');
      } else if (!hasPermission(context.user.role, 'contract:read')) {
        throw new Error('没有权限查看合约模板');
      }

      const templates = await prisma.contractTemplate.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { contracts: true },
          },
        },
      });

      return templates.map((template) => ({
        ...template,
        contractCount: template._count.contracts,
      }));
    },

    /**
     * 获取单个合约模板
     */
    contractTemplate: async (_: unknown, args: { id: string }, context: Context) => {
      if (!context.user) {
        throw new Error('未授权：请先登入');
      }

      if (!hasPermission(context.user.role, 'contract:read')) {
        throw new Error('没有权限查看合约模板');
      }

      const template = await prisma.contractTemplate.findUnique({
        where: { id: parseInt(args.id) },
        include: {
          _count: {
            select: { contracts: true },
          },
        },
      });

      if (!template) {
        throw new Error('合约模板不存在');
      }

      return {
        ...template,
        contractCount: template._count.contracts,
      };
    },

    /**
     * 获取合约列表 - 優化：使用 select 減少資料傳輸
     */
    contracts: async (_: unknown, args: { page?: number; pageSize?: number }, context: Context) => {
      if (!context.user) {
        if (process.env.NODE_ENV !== 'development' || !context.isIPAllowed) {
          throw new Error('未授权：请先登入');
        }
        console.log('⚠️ 开发模式：允许无认证查询（IP 已验证）');
      } else if (!hasPermission(context.user.role, 'contract:read')) {
        throw new Error('没有权限查看合约');
      }

      const page = args.page || 1;
      const pageSize = args.pageSize || 20;
      const skip = (page - 1) * pageSize;

      // 優化：並行查詢 + select 只取需要的欄位
      const [total, contracts] = await Promise.all([
        prisma.contract.count(),
        prisma.contract.findMany({
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            contractNo: true,
            title: true,
            status: true,
            parties: true,
            validFrom: true,
            validUntil: true,
            signedAt: true,
            createdAt: true,
            updatedAt: true,
            template: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
            creator: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
              },
            },
            signatures: {
              select: {
                id: true,
                signedName: true,
                signedAt: true,
                userId: true,
              },
            },
            _count: {
              select: { attachments: true },
            },
          },
        }),
      ]);

      return {
        contracts: contracts.map(c => ({
          ...c,
          attachmentCount: c._count.attachments,
        })),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    },

    /**
     * 获取单个合约
     */
    contract: async (_: unknown, args: { id: string }, context: Context) => {
      if (!context.user) {
        throw new Error('未授权：请先登入');
      }

      if (!hasPermission(context.user.role, 'contract:read')) {
        throw new Error('没有权限查看合约');
      }

      const contract = await prisma.contract.findUnique({
        where: { id: parseInt(args.id) },
        include: {
          template: true,
          creator: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
            },
          },
          signatures: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },
            },
          },
          attachments: true,
        },
      });

      if (!contract) {
        throw new Error('合约不存在');
      }

      return contract;
    },

    /**
     * 根据状态获取合约列表 - 優化：加入分頁和 select
     */
    contractsByStatus: async (
      _: unknown,
      args: { status: string; page?: number; pageSize?: number },
      context: Context
    ) => {
      if (!context.user) {
        throw new Error('未授权：请先登入');
      }

      if (!hasPermission(context.user.role, 'contract:read')) {
        throw new Error('没有权限查看合约');
      }

      const page = args.page || 1;
      const pageSize = args.pageSize || 20;
      const skip = (page - 1) * pageSize;
      const where = { status: args.status };

      // 優化：並行查詢 + select
      const [total, contracts] = await Promise.all([
        prisma.contract.count({ where }),
        prisma.contract.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            contractNo: true,
            title: true,
            status: true,
            parties: true,
            validFrom: true,
            validUntil: true,
            signedAt: true,
            createdAt: true,
            template: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
            creator: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
              },
            },
            signatures: {
              select: {
                id: true,
                signedName: true,
                signedAt: true,
              },
            },
          },
        }),
      ]);

      return {
        contracts,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    },
  },

  Mutation: {
    /**
     * 创建合约模板
     */
    createContractTemplate: async (
      _: unknown,
      args: { input: CreateContractTemplateInput },
      context: Context
    ) => {
      if (!context.user) {
        throw new Error('未授权：请先登入');
      }

      if (!hasPermission(context.user.role, 'contract:create')) {
        throw new Error('没有权限创建合约模板');
      }

      const template = await prisma.contractTemplate.create({
        data: {
          name: args.input.name,
          type: args.input.type,
          content: args.input.content,
          variables: args.input.variables || {},
          isActive: args.input.isActive !== undefined ? args.input.isActive : true,
        },
      });

      // 记录操作日志
      await prisma.activityLog.create({
        data: {
          userId: context.user.id,
          action: 'create',
          entity: 'contract_template',
          entityId: template.id.toString(),
          details: {
            templateName: template.name,
            templateType: template.type,
          },
        },
      });

      return template;
    },

    /**
     * 更新合约模板
     */
    updateContractTemplate: async (
      _: unknown,
      args: { input: UpdateContractTemplateInput & { id: string } },
      context: Context
    ) => {
      if (!context.user) {
        throw new Error('未授权：请先登入');
      }

      if (!hasPermission(context.user.role, 'contract:update')) {
        throw new Error('没有权限更新合约模板');
      }

      const { id, ...updateData } = args.input;
      const template = await prisma.contractTemplate.update({
        where: { id: parseInt(id) },
        data: updateData,
      });

      // 记录操作日志
      await prisma.activityLog.create({
        data: {
          userId: context.user.id,
          action: 'update',
          entity: 'contract_template',
          entityId: template.id.toString(),
          details: {
            templateName: template.name,
            changes: updateData,
          },
        },
      });

      return template;
    },

    /**
     * 删除合约模板
     */
    deleteContractTemplate: async (
      _: unknown,
      args: { id: string },
      context: Context
    ) => {
      if (!context.user) {
        throw new Error('未授权：请先登入');
      }

      if (!hasPermission(context.user.role, 'contract:delete')) {
        throw new Error('没有权限删除合约模板');
      }

      const template = await prisma.contractTemplate.findUnique({
        where: { id: parseInt(args.id) },
      });

      if (!template) {
        throw new Error('合约模板不存在');
      }

      // 记录操作日志
      await prisma.activityLog.create({
        data: {
          userId: context.user.id,
          action: 'delete',
          entity: 'contract_template',
          entityId: args.id,
          details: {
            templateName: template.name,
          },
        },
      });

      await prisma.contractTemplate.delete({
        where: { id: parseInt(args.id) },
      });

      return true;
    },

    /**
     * 创建合约
     */
    createContract: async (
      _: unknown,
      args: { input: CreateContractInput },
      context: Context
    ) => {
      if (!context.user) {
        throw new Error('未授权：请先登入');
      }

      if (!hasPermission(context.user.role, 'contract:create')) {
        throw new Error('没有权限创建合约');
      }

      // 获取模板内容
      const template = await prisma.contractTemplate.findUnique({
        where: { id: args.input.templateId },
      });

      if (!template) {
        throw new Error('合约模板不存在');
      }

      // 生成合约编号（简单示例，实际应该更复杂）
      const contractNo = `CONTRACT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      const contract = await prisma.contract.create({
        data: {
          templateId: args.input.templateId,
          contractNo,
          title: args.input.title,
          content: template.content, // 使用模板内容
          parties: args.input.parties,
          status: 'draft',
          validFrom: args.input.validFrom ? new Date(args.input.validFrom) : null,
          validUntil: args.input.validUntil ? new Date(args.input.validUntil) : null,
          createdBy: context.user.id,
        },
        include: {
          template: true,
          creator: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
            },
          },
        },
      });

      // 记录操作日志
      await prisma.activityLog.create({
        data: {
          userId: context.user.id,
          action: 'create',
          entity: 'contract',
          entityId: contract.id.toString(),
          details: {
            contractNo: contract.contractNo,
            title: contract.title,
          },
        },
      });

      return contract;
    },

    /**
     * 更新合约
     */
    updateContract: async (
      _: unknown,
      args: { input: UpdateContractInput & { id: string } },
      context: Context
    ) => {
      if (!context.user) {
        throw new Error('未授权：请先登入');
      }

      if (!hasPermission(context.user.role, 'contract:update')) {
        throw new Error('没有权限更新合约');
      }

      const { id, ...updateData } = args.input;

      // 转换日期字段
      const data: any = { ...updateData };
      if (data.validFrom) data.validFrom = new Date(data.validFrom);
      if (data.validUntil) data.validUntil = new Date(data.validUntil);

      const contract = await prisma.contract.update({
        where: { id: parseInt(id) },
        data,
        include: {
          template: true,
          creator: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
            },
          },
          signatures: true,
        },
      });

      // 记录操作日志
      await prisma.activityLog.create({
        data: {
          userId: context.user.id,
          action: 'update',
          entity: 'contract',
          entityId: contract.id.toString(),
          details: {
            contractNo: contract.contractNo,
            changes: updateData,
          },
        },
      });

      return contract;
    },

    /**
     * 删除合约
     */
    deleteContract: async (_: unknown, args: { id: string }, context: Context) => {
      if (!context.user) {
        throw new Error('未授权：请先登入');
      }

      if (!hasPermission(context.user.role, 'contract:delete')) {
        throw new Error('没有权限删除合约');
      }

      const contract = await prisma.contract.findUnique({
        where: { id: parseInt(args.id) },
      });

      if (!contract) {
        throw new Error('合约不存在');
      }

      // 记录操作日志
      await prisma.activityLog.create({
        data: {
          userId: context.user.id,
          action: 'delete',
          entity: 'contract',
          entityId: args.id,
          details: {
            contractNo: contract.contractNo,
            title: contract.title,
          },
        },
      });

      await prisma.contract.delete({
        where: { id: parseInt(args.id) },
      });

      return true;
    },

    /**
     * 签署合约
     */
    signContract: async (
      _: unknown,
      args: { contractId: string; signedName: string; signature?: string },
      context: Context
    ) => {
      if (!context.user) {
        throw new Error('未授权：请先登入');
      }

      const contract = await prisma.contract.findUnique({
        where: { id: parseInt(args.contractId) },
      });

      if (!contract) {
        throw new Error('合约不存在');
      }

      if (contract.status === 'signed') {
        throw new Error('合约已被签署');
      }

      // 创建签名记录
      const signature = await prisma.signature.create({
        data: {
          contractId: parseInt(args.contractId),
          userId: context.user.id,
          signedName: args.signedName,
          signature: args.signature,
          ipAddress: 'system', // 实际应该从请求中获取
          otpVerified: true, // 简化处理
        },
      });

      // 更新合约状态为已签署
      await prisma.contract.update({
        where: { id: parseInt(args.contractId) },
        data: {
          status: 'signed',
          signedAt: new Date(),
        },
      });

      // 记录操作日志
      await prisma.activityLog.create({
        data: {
          userId: context.user.id,
          action: 'sign',
          entity: 'contract',
          entityId: args.contractId,
          details: {
            contractNo: contract.contractNo,
            signedName: args.signedName,
          },
        },
      });

      return signature;
    },
  },
};
