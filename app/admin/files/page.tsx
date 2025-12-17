"use client";

import { useState } from "react";
import { useQuery, gql } from "@apollo/client";
import { useSession } from "next-auth/react";
import AdminLayout from "@/components/Admin/AdminLayout";

// GraphQL 查詢
const GET_ATTACHMENTS = gql`
  query GetAttachments($page: Int, $pageSize: Int, $filter: AttachmentFilterInput) {
    attachments(page: $page, pageSize: $pageSize, filter: $filter) {
      attachments {
        id
        filename
        originalName
        mimeType
        size
        url
        uploadedBy
        createdAt
      }
      total
      page
      pageSize
      totalPages
    }
  }
`;

interface Attachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string | null;
  uploadedBy: string | null;
  createdAt: string;
}

const FILE_TYPE_ICONS: Record<string, string> = {
  'application/pdf': '📄',
  'image/jpeg': '🖼️',
  'image/png': '🖼️',
  'image/gif': '🖼️',
  'image/webp': '🖼️',
  'application/msword': '📝',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
  'application/vnd.ms-excel': '📊',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
  'application/zip': '🗜️',
  'application/x-rar-compressed': '🗜️',
};

export default function FilesPage() {
  const { status } = useSession();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<Attachment | null>(null);

  // 查詢附件列表
  const { data, loading, error, refetch } = useQuery(GET_ATTACHMENTS, {
    variables: {
      page,
      pageSize,
      filter: {
        search: search || undefined,
        mimeType: typeFilter || undefined,
      },
    },
    fetchPolicy: "network-only",
  });

  const handleDelete = async () => {
    if (!selectedFile) return;

    try {
      const response = await fetch(`/api/files/${selectedFile.filename}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setShowDeleteConfirm(false);
        setSelectedFile(null);
        refetch();
        alert('檔案已刪除');
      } else {
        const data = await response.json();
        alert(`刪除失敗: ${data.error}`);
      }
    } catch (error: any) {
      alert(`刪除失敗: ${error.message}`);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getFileIcon = (mimeType: string): string => {
    return FILE_TYPE_ICONS[mimeType] || '📎';
  };

  const attachments = data?.attachments?.attachments || [];
  const total = data?.attachments?.total || 0;
  const totalPages = data?.attachments?.totalPages || 1;

  // 等待 session 載入完成
  if (status === "loading") {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">載入中...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // 所有已登入用戶都可以訪問檔案管理

  return (
    <AdminLayout>
      <div>
        {/* 頁面標題 */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">檔案管理</h1>
            <p className="text-gray-500 mt-1">查看和管理系統檔案</p>
          </div>
        </div>

        {/* 搜尋與篩選 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 搜尋 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                搜尋
              </label>
              <input
                type="text"
                placeholder="搜尋檔案名稱..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 類型篩選 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                檔案類型
              </label>
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">全部類型</option>
                <option value="image">圖片</option>
                <option value="application/pdf">PDF</option>
                <option value="application/vnd">Office 文件</option>
                <option value="application/zip">壓縮檔</option>
              </select>
            </div>
          </div>
        </div>

        {/* 檔案列表 */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">載入中...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">❌</div>
              <p className="text-red-600">{error.message}</p>
            </div>
          ) : attachments.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-gray-600">沒有找到檔案</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        檔案
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        類型
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        大小
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        上傳時間
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {attachments.map((file: Attachment) => (
                      <tr key={file.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <span className="text-3xl mr-3">
                              {getFileIcon(file.mimeType)}
                            </span>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {file.originalName}
                              </div>
                              <div className="text-xs text-gray-500">
                                {file.filename}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                            {file.mimeType.split('/')[1]?.toUpperCase() || 'FILE'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatFileSize(file.size)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(file.createdAt).toLocaleString("zh-TW")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            {file.url && (
                              <a
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-900"
                              >
                                查看
                              </a>
                            )}
                            {file.url && (
                              <a
                                href={file.url}
                                download={file.originalName}
                                className="text-green-600 hover:text-green-900"
                              >
                                下載
                              </a>
                            )}
                            <button
                              onClick={() => {
                                setSelectedFile(file);
                                setShowDeleteConfirm(true);
                              }}
                              className="text-red-600 hover:text-red-900"
                            >
                              刪除
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 分頁 */}
              <div className="px-6 py-4 border-t flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  顯示 {(page - 1) * pageSize + 1} 到{" "}
                  {Math.min(page * pageSize, total)} 筆，共 {total} 筆
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    上一頁
                  </button>
                  <span className="px-3 py-1">
                    第 {page} / {totalPages} 頁
                  </span>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page >= totalPages}
                    className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    下一頁
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 刪除確認對話框 */}
      {showDeleteConfirm && selectedFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              確認刪除檔案
            </h3>
            <p className="text-gray-600 mb-6">
              確定要刪除檔案「{selectedFile.originalName}」嗎？
              <br />
              <span className="text-red-600 font-semibold">
                此操作無法復原！
              </span>
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedFile(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
