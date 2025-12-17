"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/Admin/AdminLayout";
import { usePermission } from "@/hooks/usePermission";

export default function AnalyticsPage() {
  const { status } = useSession();
  const { can } = usePermission();
  const router = useRouter();
  const hasAccess = can("system:analytics");

  const [gaConfigured, setGaConfigured] = useState(false);
  const [gaPropertyId, setGaPropertyId] = useState("");

  useEffect(() => {
    // 检查 Google Analytics 是否配置
    const checkGAConfig = () => {
      // 检查环境变量或系统配置中的 GA ID
      const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
      if (gaId) {
        setGaConfigured(true);
        setGaPropertyId(gaId);
      }
    };

    checkGAConfig();
  }, []);

  // 權限檢查
  if (status === "loading") {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!hasAccess) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-red-500">權限不足：您沒有查看數據分析的權限</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-gray-900">数据分析</h1>

          {/* Google Analytics 配置状态 */}
          {!gaConfigured ? (
            <div className="bg-white rounded-lg shadow-md p-8">
              <div className="text-center">
                <div className="mb-4">
                  <svg
                    className="mx-auto h-12 w-12 text-yellow-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold mb-2 text-gray-900">
                  Google Analytics 未配置
                </h2>
                <p className="text-gray-600 mb-6">
                  请先设置 Google Analytics Measurement ID 以启用数据分析功能
                </p>

                <div className="bg-gray-50 rounded-lg p-6 text-left max-w-2xl mx-auto">
                  <h3 className="font-semibold mb-3 text-gray-900">配置步骤：</h3>
                  <ol className="list-decimal list-inside space-y-2 text-gray-700">
                    <li>
                      前往{" "}
                      <a
                        href="https://analytics.google.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Google Analytics
                      </a>{" "}
                      创建账户和资源
                    </li>
                    <li>获取 Measurement ID（格式：G-XXXXXXXXXX）</li>
                    <li>
                      在项目根目录的 <code className="bg-gray-200 px-2 py-1 rounded">.env.local</code>{" "}
                      文件中添加：
                    </li>
                  </ol>
                  <div className="mt-4 bg-gray-800 text-green-400 p-4 rounded font-mono text-sm">
                    NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
                  </div>
                  <p className="mt-4 text-sm text-gray-600">
                    配置完成后，重启开发服务器即可看到数据分析报表。
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Google Analytics 已配置 - 显示嵌入报表 */
            <div className="space-y-6">
              {/* 统计卡片 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Property ID</p>
                      <p className="text-2xl font-semibold text-gray-900">{gaPropertyId}</p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-full">
                      <svg
                        className="h-8 w-8 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">状态</p>
                      <p className="text-2xl font-semibold text-green-600">已启用</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-full">
                      <svg
                        className="h-8 w-8 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">数据收集</p>
                      <p className="text-2xl font-semibold text-gray-900">实时</p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-full">
                      <svg
                        className="h-8 w-8 text-purple-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Google Analytics 控制台链接 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-900">快速访问</h2>
                <p className="text-gray-600 mb-4">
                  访问 Google Analytics 控制台查看完整的数据分析报表
                </p>
                <a
                  href={`https://analytics.google.com/analytics/web/#/p${gaPropertyId.replace('G-', '')}/reports/home`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg
                    className="h-5 w-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                  打开 Google Analytics 控制台
                </a>
              </div>

              {/* 说明文档 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-semibold text-blue-900 mb-2">💡 使用提示</h3>
                <ul className="text-blue-800 space-y-1 text-sm">
                  <li>• 数据通常需要 24-48 小时才能在报表中显示</li>
                  <li>• 实时报表可以查看当前访问者数据</li>
                  <li>• 建议定期检查跟踪代码是否正常工作</li>
                  <li>• 可以设置自定义事件追踪特定用户行为</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
