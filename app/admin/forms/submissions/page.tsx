"use client";

import { useState } from "react";
import { useQuery, useMutation, gql } from "@apollo/client";
import AdminLayout from "@/components/Admin/AdminLayout";
import { usePermission } from "@/hooks/usePermission";
import { PermissionEnum } from "@/lib/permissions";
import { exportToExcel, formatDateForExcel } from "@/lib/exportExcel";

// GraphQL 查詢
const GET_FORM_SUBMISSIONS = gql`
  query GetFormSubmissions($page: Int, $pageSize: Int, $filter: FormSubmissionFilterInput) {
    formSubmissions(page: $page, pageSize: $pageSize, filter: $filter) {
      submissions {
        id
        templateId
        formType
        data
        status
        notes
        submitterName
        submitterEmail
        submitterPhone
        processedAt
        createdAt
        template {
          id
          name
          type
        }
        processor {
          id
          name
          email
        }
      }
      total
      page
      pageSize
      totalPages
    }
  }
`;

const PROCESS_FORM_SUBMISSION = gql`
  mutation ProcessFormSubmission($id: ID!, $input: ProcessFormSubmissionInput!) {
    processFormSubmission(id: $id, input: $input) {
      id
      status
      notes
      processedAt
      processedBy
    }
  }
`;

const DELETE_FORM_SUBMISSION = gql`
  mutation DeleteFormSubmission($id: ID!) {
    deleteFormSubmission(id: $id)
  }
`;

interface FormSubmission {
  id: string;
  templateId: number;
  formType: string;
  data: any;
  status: string;
  notes: string | null;
  submitterName: string | null;
  submitterEmail: string | null;
  submitterPhone: string | null;
  processedAt: string | null;
  createdAt: string;
  template: {
    id: string;
    name: string;
    type: string;
  };
  processor: {
    id: string;
    name: string;
    email: string;
  } | null;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: '待處理', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'processing', label: '處理中', color: 'bg-blue-100 text-blue-800' },
  { value: 'completed', label: '已完成', color: 'bg-green-100 text-green-800' },
  { value: 'rejected', label: '已拒絕', color: 'bg-red-100 text-red-800' },
];

export default function SubmissionsPage() {
  const { can } = usePermission();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [processData, setProcessData] = useState({
    status: "processing",
    notes: "",
  });

  // 查詢表單提交列表
  const { data, loading, error, refetch } = useQuery(GET_FORM_SUBMISSIONS, {
    variables: {
      page,
      pageSize,
      filter: {
        search: search || undefined,
        formType: typeFilter || undefined,
        status: statusFilter || undefined,
      },
    },
    fetchPolicy: "network-only",
  });

  // 處理表單提交
  const [processSubmission, { loading: processing }] = useMutation(PROCESS_FORM_SUBMISSION, {
    onCompleted: () => {
      setShowProcessModal(false);
      setSelectedSubmission(null);
      refetch();
      alert("處理成功！");
    },
    onError: (error) => {
      alert(`處理失敗: ${error.message}`);
    },
  });

  // 刪除表單提交
  const [deleteSubmission, { loading: deleting }] = useMutation(DELETE_FORM_SUBMISSION, {
    onCompleted: () => {
      setShowDeleteConfirm(false);
      setSelectedSubmission(null);
      refetch();
      alert("提交記錄已刪除");
    },
    onError: (error) => {
      alert(`刪除失敗: ${error.message}`);
    },
  });

  const handleDelete = () => {
    if (selectedSubmission) {
      deleteSubmission({ variables: { id: selectedSubmission.id } });
    }
  };

  const handleProcess = () => {
    if (!selectedSubmission) return;

    processSubmission({
      variables: {
        id: selectedSubmission.id,
        input: {
          status: processData.status,
          notes: processData.notes || undefined,
        },
      },
    });
  };

  const submissions = data?.formSubmissions?.submissions || [];
  const total = data?.formSubmissions?.total || 0;
  const totalPages = data?.formSubmissions?.totalPages || 1;

  // 導出 Excel
  const handleExportExcel = () => {
    if (submissions.length === 0) {
      alert("沒有資料可以導出");
      return;
    }

    exportToExcel({
      filename: "表單提交記錄",
      sheetName: "提交記錄",
      columns: [
        { key: "submitterName", header: "提交者姓名", width: 15 },
        { key: "submitterEmail", header: "Email", width: 25 },
        { key: "submitterPhone", header: "電話", width: 15 },
        { key: "template", header: "表單名稱", width: 20, format: (value) => value?.name || "" },
        { key: "formType", header: "表單類型", width: 12 },
        { key: "status", header: "狀態", width: 10, format: (value) => STATUS_OPTIONS.find(s => s.value === value)?.label || value },
        { key: "processor", header: "處理者", width: 15, format: (value) => value?.name || "" },
        { key: "notes", header: "備註", width: 30 },
        { key: "createdAt", header: "提交時間", width: 18, format: (value) => formatDateForExcel(value) },
        { key: "processedAt", header: "處理時間", width: 18, format: (value) => formatDateForExcel(value) },
      ],
      data: submissions,
    });
  };

  if (!can(PermissionEnum.FORM_READ)) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">沒有權限</h2>
          <p className="text-gray-600">您沒有權限訪問表單提交記錄</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div>
        {/* 頁面標題 */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">表單提交記錄</h1>
            <p className="text-gray-500 mt-1">查看和處理表單提交</p>
          </div>
          <button
            onClick={handleExportExcel}
            disabled={submissions.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            導出 Excel
          </button>
        </div>

        {/* 搜尋與篩選 */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 搜尋 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                搜尋
              </label>
              <input
                type="text"
                placeholder="搜尋提交者姓名或 Email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 狀態篩選 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                處理狀態
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">全部狀態</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 表單類型篩選 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                表單類型
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
                <option value="job">求職應徵</option>
                <option value="company">企業需求</option>
                <option value="franchise">加盟申請</option>
                <option value="contact">聯絡表單</option>
                <option value="custom">自訂表單</option>
              </select>
            </div>
          </div>
        </div>

        {/* 表單提交列表 */}
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
          ) : submissions.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-gray-600">沒有找到提交記錄</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        提交者
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        表單名稱
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        狀態
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        處理者
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        提交時間
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {submissions.map((submission: FormSubmission) => {
                      const statusOption = STATUS_OPTIONS.find(
                        (s) => s.value === submission.status
                      );
                      return (
                        <tr key={submission.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {submission.submitterName || "-"}
                              </div>
                              <div className="text-sm text-gray-500">
                                {submission.submitterEmail || "-"}
                              </div>
                              {submission.submitterPhone && (
                                <div className="text-sm text-gray-500">
                                  {submission.submitterPhone}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {submission.template.name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs font-semibold rounded-full ${statusOption?.color}`}
                            >
                              {statusOption?.label || submission.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {submission.processor
                              ? submission.processor.name
                              : "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(submission.createdAt).toLocaleString(
                              "zh-TW"
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => {
                                  setSelectedSubmission(submission);
                                  setShowDetailModal(true);
                                }}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                查看
                              </button>
                              {can(PermissionEnum.FORM_UPDATE) && (
                                <button
                                  onClick={() => {
                                    setSelectedSubmission(submission);
                                    setProcessData({
                                      status: submission.status,
                                      notes: submission.notes || "",
                                    });
                                    setShowProcessModal(true);
                                  }}
                                  className="text-green-600 hover:text-green-900"
                                >
                                  處理
                                </button>
                              )}
                              {can(PermissionEnum.FORM_DELETE) && (
                                <button
                                  onClick={() => {
                                    setSelectedSubmission(submission);
                                    setShowDeleteConfirm(true);
                                  }}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  刪除
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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

      {/* 查看詳情對話框 */}
      {showDetailModal && selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              表單提交詳情
            </h3>

            <div className="space-y-4">
              {/* 基本資訊 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-700 mb-2">基本資訊</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">表單名稱：</span>
                    <span className="text-gray-900">{selectedSubmission.template.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">狀態：</span>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      STATUS_OPTIONS.find((s) => s.value === selectedSubmission.status)?.color
                    }`}>
                      {STATUS_OPTIONS.find((s) => s.value === selectedSubmission.status)?.label}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">提交時間：</span>
                    <span className="text-gray-900">
                      {new Date(selectedSubmission.createdAt).toLocaleString("zh-TW")}
                    </span>
                  </div>
                  {selectedSubmission.processedAt && (
                    <div>
                      <span className="text-gray-500">處理時間：</span>
                      <span className="text-gray-900">
                        {new Date(selectedSubmission.processedAt).toLocaleString("zh-TW")}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 提交者資訊 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-700 mb-2">提交者資訊</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500">姓名：</span>
                    <span className="text-gray-900">{selectedSubmission.submitterName || "-"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Email：</span>
                    <span className="text-gray-900">{selectedSubmission.submitterEmail || "-"}</span>
                  </div>
                  {selectedSubmission.submitterPhone && (
                    <div>
                      <span className="text-gray-500">電話：</span>
                      <span className="text-gray-900">{selectedSubmission.submitterPhone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 表單內容 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-700 mb-2">表單內容</h4>
                <pre className="text-sm bg-white p-4 rounded border overflow-auto max-h-64">
                  {JSON.stringify(selectedSubmission.data, null, 2)}
                </pre>
              </div>

              {/* 處理備註 */}
              {selectedSubmission.notes && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-700 mb-2">處理備註</h4>
                  <p className="text-sm text-gray-900">{selectedSubmission.notes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedSubmission(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 處理表單對話框 */}
      {showProcessModal && selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              處理表單提交
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  處理狀態
                </label>
                <select
                  value={processData.status}
                  onChange={(e) =>
                    setProcessData({ ...processData, status: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  處理備註
                </label>
                <textarea
                  value={processData.notes}
                  onChange={(e) =>
                    setProcessData({ ...processData, notes: e.target.value })
                  }
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="輸入處理備註..."
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowProcessModal(false);
                  setSelectedSubmission(null);
                }}
                disabled={processing}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleProcess}
                disabled={processing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {processing ? "處理中..." : "確認處理"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 刪除確認對話框 */}
      {showDeleteConfirm && selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              確認刪除提交記錄
            </h3>
            <p className="text-gray-600 mb-6">
              確定要刪除此提交記錄嗎？
              <br />
              <span className="text-red-600 font-semibold">
                此操作無法復原！
              </span>
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedSubmission(null);
                }}
                disabled={deleting}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "刪除中..." : "確認刪除"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
