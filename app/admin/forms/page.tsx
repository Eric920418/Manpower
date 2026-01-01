"use client";

import { useState } from "react";
import { useQuery, useMutation, gql } from "@apollo/client";
import AdminLayout from "@/components/Admin/AdminLayout";
import { usePermission } from "@/hooks/usePermission";
import { PermissionEnum } from "@/lib/permissions";
import { exportToExcel, formatDateForExcel } from "@/lib/exportExcel";

// GraphQL 查詢
const GET_FORM_TEMPLATES = gql`
  query GetFormTemplates($page: Int, $pageSize: Int, $filter: FormTemplateFilterInput) {
    formTemplates(page: $page, pageSize: $pageSize, filter: $filter) {
      templates {
        id
        name
        type
        description
        isActive
        submissionCount
        createdAt
        updatedAt
      }
      total
      page
      pageSize
      totalPages
    }
  }
`;

const DELETE_FORM_TEMPLATE = gql`
  mutation DeleteFormTemplate($id: ID!) {
    deleteFormTemplate(id: $id)
  }
`;

const TOGGLE_FORM_TEMPLATE_STATUS = gql`
  mutation ToggleFormTemplateStatus($id: ID!) {
    toggleFormTemplateStatus(id: $id) {
      id
      isActive
    }
  }
`;

const CREATE_FORM_TEMPLATE = gql`
  mutation CreateFormTemplate($input: CreateFormTemplateInput!) {
    createFormTemplate(input: $input) {
      id
      name
      type
      description
      fields
      isActive
    }
  }
`;

const UPDATE_FORM_TEMPLATE = gql`
  mutation UpdateFormTemplate($id: ID!, $input: UpdateFormTemplateInput!) {
    updateFormTemplate(id: $id, input: $input) {
      id
      name
      type
      description
      fields
      isActive
    }
  }
`;

interface FormTemplate {
  id: string;
  name: string;
  type: string;
  description: string | null;
  isActive: boolean;
  submissionCount: number;
  createdAt: string;
  updatedAt: string;
}

const FORM_TYPES = [
  { value: 'job', label: '求職應徵表' },
  { value: 'company', label: '企業需求表' },
  { value: 'franchise', label: '加盟申請表' },
  { value: 'contact', label: '聯絡表單' },
  { value: 'custom', label: '自訂表單' },
];

export default function FormsPage() {
  const { can } = usePermission();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<boolean | "">("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formData, setFormData] = useState({
    name: "",
    type: "custom",
    description: "",
    fields: [],
    isActive: true,
  });

  // 查詢表單模板列表
  const { data, loading, error, refetch } = useQuery(GET_FORM_TEMPLATES, {
    variables: {
      page,
      pageSize,
      filter: {
        search: search || undefined,
        type: typeFilter || undefined,
        isActive: statusFilter === "" ? undefined : statusFilter,
      },
    },
    fetchPolicy: "network-only",
  });

  // 刪除模板
  const [deleteTemplate, { loading: deleting }] = useMutation(DELETE_FORM_TEMPLATE, {
    onCompleted: () => {
      setShowDeleteConfirm(false);
      setSelectedTemplate(null);
      refetch();
      alert("表單模板已刪除");
    },
    onError: (error) => {
      alert(`刪除失敗: ${error.message}`);
    },
  });

  // 切換模板狀態
  const [toggleStatus] = useMutation(TOGGLE_FORM_TEMPLATE_STATUS, {
    onCompleted: () => {
      refetch();
    },
    onError: (error) => {
      alert(`操作失敗: ${error.message}`);
    },
  });

  // 創建模板
  const [createTemplate, { loading: creating }] = useMutation(CREATE_FORM_TEMPLATE, {
    onCompleted: () => {
      setShowTemplateForm(false);
      resetForm();
      refetch();
      alert("表單模板創建成功！");
    },
    onError: (error) => {
      alert(`創建失敗: ${error.message}`);
    },
  });

  // 更新模板
  const [updateTemplate, { loading: updating }] = useMutation(UPDATE_FORM_TEMPLATE, {
    onCompleted: () => {
      setShowTemplateForm(false);
      resetForm();
      refetch();
      alert("表單模板更新成功！");
    },
    onError: (error) => {
      alert(`更新失敗: ${error.message}`);
    },
  });

  const handleDelete = () => {
    if (selectedTemplate) {
      deleteTemplate({ variables: { id: selectedTemplate.id } });
    }
  };

  const handleToggleStatus = (template: FormTemplate) => {
    if (
      confirm(
        `確定要${template.isActive ? "停用" : "啟用"}表單模板「${template.name}」嗎？`
      )
    ) {
      toggleStatus({ variables: { id: template.id } });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      type: "custom",
      description: "",
      fields: [],
      isActive: true,
    });
    setSelectedTemplate(null);
  };

  const handleCreateTemplate = () => {
    setFormMode("create");
    resetForm();
    setShowTemplateForm(true);
  };

  const handleEditTemplate = (template: FormTemplate) => {
    setFormMode("edit");
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      type: template.type,
      description: template.description || "",
      fields: [],
      isActive: template.isActive,
    });
    setShowTemplateForm(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.type) {
      alert("請填寫表單名稱和類型");
      return;
    }

    const input = {
      name: formData.name,
      type: formData.type,
      description: formData.description || undefined,
      fields: formData.fields,
      isActive: formData.isActive,
    };

    if (formMode === "create") {
      createTemplate({ variables: { input } });
    } else {
      updateTemplate({
        variables: {
          id: selectedTemplate!.id,
          input,
        },
      });
    }
  };

  const templates = data?.formTemplates?.templates || [];
  const total = data?.formTemplates?.total || 0;
  const totalPages = data?.formTemplates?.totalPages || 1;

  // 導出 Excel
  const handleExportExcel = () => {
    if (templates.length === 0) {
      alert("沒有資料可以導出");
      return;
    }

    exportToExcel({
      filename: "表單模板列表",
      sheetName: "模板",
      columns: [
        { key: "name", header: "表單名稱", width: 25 },
        { key: "type", header: "類型", width: 15, format: (value) => FORM_TYPES.find((t) => t.value === value)?.label || value },
        { key: "description", header: "描述", width: 30 },
        { key: "submissionCount", header: "提交次數", width: 12 },
        { key: "isActive", header: "狀態", width: 8, format: (value) => value ? "啟用" : "停用" },
        { key: "createdAt", header: "建立時間", width: 18, format: (value) => formatDateForExcel(value) },
        { key: "updatedAt", header: "更新時間", width: 18, format: (value) => formatDateForExcel(value) },
      ],
      data: templates,
    });
  };

  if (!can(PermissionEnum.FORM_READ)) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">沒有權限</h2>
          <p className="text-gray-600">您沒有權限訪問表單管理</p>
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
            <h1 className="text-2xl font-bold text-gray-900">表單管理</h1>
            <p className="text-gray-500 mt-1">管理系統表單模板</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleExportExcel}
              disabled={templates.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              導出 Excel
            </button>
            {can(PermissionEnum.FORM_CREATE) && (
              <button
                onClick={handleCreateTemplate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                ➕ 新增表單模板
              </button>
            )}
          </div>
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
                placeholder="搜尋表單名稱..."
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
                {FORM_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 狀態篩選 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                狀態
              </label>
              <select
                value={statusFilter === "" ? "" : statusFilter ? "true" : "false"}
                onChange={(e) => {
                  setStatusFilter(
                    e.target.value === "" ? "" : e.target.value === "true"
                  );
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">全部狀態</option>
                <option value="true">啟用</option>
                <option value="false">停用</option>
              </select>
            </div>
          </div>
        </div>

        {/* 表單模板列表 */}
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
          ) : templates.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-gray-600">沒有找到表單模板</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        表單名稱
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        類型
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        提交次數
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        狀態
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        更新時間
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {templates.map((template: FormTemplate) => (
                      <tr key={template.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {template.name}
                            </div>
                            {template.description && (
                              <div className="text-sm text-gray-500">
                                {template.description}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                            {FORM_TYPES.find((t) => t.value === template.type)?.label ||
                              template.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {template.submissionCount || 0} 筆
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              template.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {template.isActive ? "✓ 啟用" : "✗ 停用"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(template.updatedAt).toLocaleString("zh-TW")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            {can(PermissionEnum.FORM_UPDATE) && (
                              <>
                                <button
                                  onClick={() => handleEditTemplate(template)}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  編輯
                                </button>
                                <button
                                  onClick={() => handleToggleStatus(template)}
                                  className="text-yellow-600 hover:text-yellow-900"
                                >
                                  {template.isActive ? "停用" : "啟用"}
                                </button>
                              </>
                            )}
                            {can(PermissionEnum.FORM_DELETE) && (
                              <button
                                onClick={() => {
                                  setSelectedTemplate(template);
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
      {showDeleteConfirm && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              確認刪除表單模板
            </h3>
            <p className="text-gray-600 mb-6">
              確定要刪除表單模板「{selectedTemplate.name}」嗎？
              <br />
              <span className="text-red-600 font-semibold">
                此操作無法復原！相關的表單提交記錄將會被刪除。
              </span>
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedTemplate(null);
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

      {/* 新增/編輯表單模板對話框 */}
      {showTemplateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 my-8">
            <h3 className="text-lg font-bold text-gray-900 mb-6">
              {formMode === "create" ? "新增表單模板" : "編輯表單模板"}
            </h3>
            <form onSubmit={handleSubmitForm}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 表單名稱 */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    表單名稱 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="例如：求職應徵表"
                  />
                </div>

                {/* 表單類型 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    表單類型 <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {FORM_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 狀態 */}
                <div>
                  <label className="flex items-center space-x-2 mt-6">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) =>
                        setFormData({ ...formData, isActive: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      啟用此表單模板
                    </span>
                  </label>
                </div>

                {/* 描述 */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    描述
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="簡述此表單的用途..."
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowTemplateForm(false);
                    resetForm();
                  }}
                  disabled={creating || updating}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={creating || updating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {creating || updating
                    ? formMode === "create"
                      ? "創建中..."
                      : "更新中..."
                    : formMode === "create"
                    ? "創建表單模板"
                    : "更新表單模板"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
