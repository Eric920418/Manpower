"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

interface ContractTemplate {
  id: string;
  name: string;
  type: string;
  content: string;
  variables: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Contract {
  id: string;
  contractNo: string;
  title: string;
  content: string;
  parties: any;
  status: string;
  validFrom?: string;
  validUntil?: string;
  signedAt?: string;
  createdAt: string;
  template?: ContractTemplate;
}

export const Contracts = () => {
  const [activeTab, setActiveTab] = useState<"templates" | "contracts">("templates");
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useSession(); // 確保用戶已登入

  // GraphQL Queries
  const TEMPLATES_QUERY = `
    query {
      contractTemplates {
        id
        name
        type
        content
        variables
        isActive
        createdAt
        updatedAt
      }
    }
  `;

  const CONTRACTS_QUERY = `
    query {
      contracts {
        id
        contractNo
        title
        content
        parties
        status
        validFrom
        validUntil
        signedAt
        createdAt
        template {
          id
          name
          type
        }
      }
    }
  `;

  // 获取模板列表
  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: TEMPLATES_QUERY }),
      });
      const { data, errors } = await res.json();

      if (errors) {
        setError(errors[0]?.message || "获取模板失败");
        return;
      }

      setTemplates(data.contractTemplates || []);
    } catch (err) {
      setError("网络错误，请稍后重试");
      console.error("Error fetching templates:", err);
    } finally {
      setIsLoading(false);
    }
  }, [TEMPLATES_QUERY]);

  // 获取合约列表
  const fetchContracts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: CONTRACTS_QUERY }),
      });
      const { data, errors } = await res.json();

      if (errors) {
        setError(errors[0]?.message || "获取合约失败");
        return;
      }

      setContracts(data.contracts || []);
    } catch (err) {
      setError("网络错误，请稍后重试");
      console.error("Error fetching contracts:", err);
    } finally {
      setIsLoading(false);
    }
  }, [CONTRACTS_QUERY]);

  useEffect(() => {
    if (activeTab === "templates") {
      fetchTemplates();
    } else {
      fetchContracts();
    }
  }, [activeTab, fetchTemplates, fetchContracts]);

  // 状态标签颜色
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-800",
      pending: "bg-yellow-100 text-yellow-800",
      signed: "bg-green-100 text-green-800",
      expired: "bg-red-100 text-red-800",
      terminated: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  // 合约类型标签
  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      employment: "劳工合约",
      service: "服务合约",
      franchise: "加盟合约",
    };
    return labels[type] || type;
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">合约管理</h1>

      {/* 标签页导航 */}
      <div className="flex border-b mb-6">
        <button
          onClick={() => setActiveTab("templates")}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === "templates"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          合约模板
        </button>
        <button
          onClick={() => setActiveTab("contracts")}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === "contracts"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          合约记录
        </button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* 加载状态 */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* 合约模板列表 */}
      {!isLoading && activeTab === "templates" && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-xl font-semibold">模板列表</h2>
            <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
              + 新增模板
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    模板名称
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    类型
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    创建时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {templates.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      暂无模板数据
                    </td>
                  </tr>
                ) : (
                  templates.map((template) => (
                    <tr key={template.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{template.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {getTypeLabel(template.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            template.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {template.isActive ? "启用" : "停用"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(template.createdAt).toLocaleDateString("zh-CN")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button className="text-blue-600 hover:text-blue-900 mr-3">编辑</button>
                        <button className="text-red-600 hover:text-red-900">删除</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 合约记录列表 */}
      {!isLoading && activeTab === "contracts" && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-xl font-semibold">合约记录</h2>
            <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
              + 新增合约
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    合约编号
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    标题
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    模板
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    有效期
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {contracts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      暂无合约数据
                    </td>
                  </tr>
                ) : (
                  contracts.map((contract) => (
                    <tr key={contract.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {contract.contractNo}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{contract.title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">
                          {contract.template?.name || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(contract.status)}`}>
                          {contract.status === "draft" && "草稿"}
                          {contract.status === "pending" && "待签署"}
                          {contract.status === "signed" && "已签署"}
                          {contract.status === "expired" && "已过期"}
                          {contract.status === "terminated" && "已终止"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {contract.validFrom && contract.validUntil ? (
                          <>
                            {new Date(contract.validFrom).toLocaleDateString("zh-CN")} -{" "}
                            {new Date(contract.validUntil).toLocaleDateString("zh-CN")}
                          </>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button className="text-blue-600 hover:text-blue-900 mr-3">查看</button>
                        <button className="text-green-600 hover:text-green-900 mr-3">编辑</button>
                        <button className="text-red-600 hover:text-red-900">删除</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
