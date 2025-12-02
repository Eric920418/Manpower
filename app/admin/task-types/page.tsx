"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { usePermission } from "@/hooks/usePermission";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/Admin/AdminLayout";
import dynamic from "next/dynamic";

// 動態載入 WorkflowEditor（避免 SSR 問題）
const WorkflowEditor = dynamic(
  () => import("@/components/Admin/WorkflowEditor"),
  { ssr: false, loading: () => <div className="h-[1000px] flex items-center justify-center bg-gray-100 rounded-lg">載入流程編輯器...</div> }
);

// 問題類型
type QuestionType = "TEXT" | "RADIO" | "CHECKBOX";

// 問題觸發條件
interface QuestionTrigger {
  answer: string;
  taskTypeId: number;
}

interface Question {
  id: string;
  label: string;
  type: QuestionType;
  options: string[];
  required: boolean;
  trigger?: QuestionTrigger | null;
}

// 流程關聯
interface TaskTypeFlow {
  id: number;
  fromTaskTypeId: number;
  toTaskTypeId: number;
  label: string | null;
  condition: { questionId?: string; answer?: string } | null;
  order: number;
}

interface TaskType {
  id: number;
  code: string;
  label: string;
  description: string | null;
  order: number;
  isActive: boolean;
  questions: Question[];
  positionX: number | null;
  positionY: number | null;
  outgoingFlows: TaskTypeFlow[];
  createdAt: string;
  updatedAt: string;
}

// 問題類型標籤
const questionTypeLabels: Record<QuestionType, string> = {
  TEXT: "文字回答",
  RADIO: "單選題",
  CHECKBOX: "複選題",
};

export default function TaskTypesPage() {
  const { status } = useSession();
  const { getRole } = usePermission();
  const router = useRouter();
  const userRole = getRole();
  const isAdmin = userRole === "SUPER_ADMIN";

  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [flows, setFlows] = useState<TaskTypeFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 頁籤狀態
  const [activeTab, setActiveTab] = useState<"list" | "workflow">("list");

  // 編輯模態框
  const [showModal, setShowModal] = useState(false);
  const [editingType, setEditingType] = useState<TaskType | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    label: "",
    description: "",
  });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [saving, setSaving] = useState(false);

  // 問題編輯
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [questionForm, setQuestionForm] = useState<{
    label: string;
    type: QuestionType;
    options: string[];
    required: boolean;
    trigger: QuestionTrigger | null;
  }>({
    label: "",
    type: "TEXT",
    options: [],
    required: false,
    trigger: null,
  });
  const [newOption, setNewOption] = useState("");

  // 獲取資料
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = `
        query {
          taskTypes(includeInactive: true) {
            id
            code
            label
            description
            order
            isActive
            questions {
              id
              label
              type
              options
              required
              trigger {
                answer
                taskTypeId
              }
            }
            positionX
            positionY
            outgoingFlows {
              id
              fromTaskTypeId
              toTaskTypeId
              label
              condition {
                questionId
                answer
              }
              order
            }
            createdAt
            updatedAt
          }
          taskTypeFlows {
            id
            fromTaskTypeId
            toTaskTypeId
            label
            condition {
              questionId
              answer
            }
            order
          }
        }
      `;

      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ query }),
      });

      if (!res.ok) {
        throw new Error(`HTTP 錯誤: ${res.status}`);
      }

      const data = await res.json();

      if (data.errors) {
        throw new Error(data.errors[0].message);
      }

      setTaskTypes(data.data.taskTypes);
      setFlows(data.data.taskTypeFlows || []);
    } catch (err) {
      console.error("載入資料失敗：", err);
      setError(err instanceof Error ? err.message : "未知錯誤");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated" && isAdmin) {
      fetchData();
    }
  }, [status, isAdmin, fetchData]);

  // 開啟新增模態框
  const handleAdd = () => {
    setEditingType(null);
    setFormData({ code: "", label: "", description: "" });
    setQuestions([]);
    setShowModal(true);
  };

  // 開啟編輯模態框
  const handleEdit = (type: TaskType) => {
    setEditingType(type);
    setFormData({
      code: type.code,
      label: type.label,
      description: type.description || "",
    });
    setQuestions(type.questions || []);
    setShowModal(true);
  };

  // 儲存
  const handleSave = async () => {
    if (!formData.code.trim() || !formData.label.trim()) {
      alert("請填寫代碼和名稱");
      return;
    }

    setSaving(true);
    try {
      let mutation: string;
      let variables: Record<string, unknown>;

      // 準備問題資料
      const questionsInput = questions.map((q) => ({
        id: q.id,
        label: q.label,
        type: q.type,
        options: q.options,
        required: q.required,
        trigger: q.trigger || null,
      }));

      if (editingType) {
        // 更新
        mutation = `
          mutation UpdateTaskType($input: UpdateTaskTypeInput!) {
            updateTaskType(input: $input) {
              id
              code
              label
              questions {
                id
                label
                type
                options
                required
                trigger {
                  answer
                  taskTypeId
                }
              }
            }
          }
        `;
        variables = {
          input: {
            id: typeof editingType.id === 'string' ? parseInt(editingType.id, 10) : editingType.id,
            code: formData.code,
            label: formData.label,
            description: formData.description || null,
            questions: questionsInput,
          },
        };
      } else {
        // 新增
        mutation = `
          mutation CreateTaskType($input: CreateTaskTypeInput!) {
            createTaskType(input: $input) {
              id
              code
              label
              questions {
                id
                label
                type
                options
                required
                trigger {
                  answer
                  taskTypeId
                }
              }
            }
          }
        `;
        variables = {
          input: {
            code: formData.code,
            label: formData.label,
            description: formData.description || null,
            questions: questionsInput,
          },
        };
      }

      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ query: mutation, variables }),
      });

      const data = await res.json();

      if (data.errors) {
        throw new Error(data.errors[0].message);
      }

      setShowModal(false);
      fetchData();
      alert(editingType ? "更新成功！" : "新增成功！");
    } catch (err) {
      console.error("儲存失敗：", err);
      alert(`儲存失敗：${err instanceof Error ? err.message : "未知錯誤"}`);
    } finally {
      setSaving(false);
    }
  };

  // 切換啟用狀態
  const handleToggleActive = async (type: TaskType) => {
    try {
      const mutation = `
        mutation UpdateTaskType($input: UpdateTaskTypeInput!) {
          updateTaskType(input: $input) {
            id
            isActive
          }
        }
      `;

      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          query: mutation,
          variables: {
            input: {
              id: typeof type.id === 'string' ? parseInt(type.id, 10) : type.id,
              isActive: !type.isActive,
            },
          },
        }),
      });

      const data = await res.json();

      if (data.errors) {
        throw new Error(data.errors[0].message);
      }

      fetchData();
    } catch (err) {
      console.error("更新失敗：", err);
      alert(`更新失敗：${err instanceof Error ? err.message : "未知錯誤"}`);
    }
  };

  // 刪除
  const handleDelete = async (type: TaskType) => {
    if (!confirm(`確定要刪除「${type.label}」嗎？\n注意：如果該類型已被使用，將會改為停用。`)) {
      return;
    }

    try {
      const mutation = `
        mutation DeleteTaskType($id: Int!) {
          deleteTaskType(id: $id)
        }
      `;

      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          query: mutation,
          variables: { id: typeof type.id === 'string' ? parseInt(type.id, 10) : type.id },
        }),
      });

      const data = await res.json();

      if (data.errors) {
        throw new Error(data.errors[0].message);
      }

      fetchData();
      alert("刪除成功！");
    } catch (err) {
      console.error("刪除失敗：", err);
      alert(`刪除失敗：${err instanceof Error ? err.message : "未知錯誤"}`);
    }
  };

  // 問題管理功能
  const handleAddQuestion = () => {
    setEditingQuestion(null);
    setQuestionForm({
      label: "",
      type: "TEXT",
      options: [],
      required: false,
      trigger: null,
    });
    setNewOption("");
    setShowQuestionModal(true);
  };

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question);
    setQuestionForm({
      label: question.label,
      type: question.type,
      options: [...question.options],
      required: question.required,
      trigger: question.trigger || null,
    });
    setNewOption("");
    setShowQuestionModal(true);
  };

  const handleDeleteQuestion = (questionId: string) => {
    if (!confirm("確定要刪除這個問題嗎？")) return;
    setQuestions(questions.filter((q) => q.id !== questionId));
  };

  const handleSaveQuestion = () => {
    if (!questionForm.label.trim()) {
      alert("請輸入問題標籤");
      return;
    }

    if (
      (questionForm.type === "RADIO" || questionForm.type === "CHECKBOX") &&
      questionForm.options.length < 2
    ) {
      alert("單選題和複選題至少需要 2 個選項");
      return;
    }

    // 驗證觸發條件
    if (questionForm.trigger) {
      if (!questionForm.trigger.answer || !questionForm.trigger.taskTypeId) {
        alert("觸發條件不完整，請選擇觸發答案和後續類型");
        return;
      }
    }

    if (editingQuestion) {
      // 更新現有問題
      setQuestions(
        questions.map((q) =>
          q.id === editingQuestion.id
            ? {
                ...q,
                label: questionForm.label,
                type: questionForm.type,
                options: questionForm.options,
                required: questionForm.required,
                trigger: questionForm.trigger,
              }
            : q
        )
      );
    } else {
      // 新增問題
      const newQuestion: Question = {
        id: crypto.randomUUID(),
        label: questionForm.label,
        type: questionForm.type,
        options: questionForm.options,
        required: questionForm.required,
        trigger: questionForm.trigger,
      };
      setQuestions([...questions, newQuestion]);
    }

    setShowQuestionModal(false);
  };

  const handleAddOption = () => {
    if (!newOption.trim()) return;
    if (questionForm.options.includes(newOption.trim())) {
      alert("選項已存在");
      return;
    }
    setQuestionForm({
      ...questionForm,
      options: [...questionForm.options, newOption.trim()],
    });
    setNewOption("");
  };

  const handleRemoveOption = (index: number) => {
    setQuestionForm({
      ...questionForm,
      options: questionForm.options.filter((_, i) => i !== index),
    });
  };

  const moveQuestion = (index: number, direction: "up" | "down") => {
    const newQuestions = [...questions];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newQuestions.length) return;
    [newQuestions[index], newQuestions[targetIndex]] = [
      newQuestions[targetIndex],
      newQuestions[index],
    ];
    setQuestions(newQuestions);
  };

  // 保存工作流程
  const handleSaveWorkflow = async (data: {
    nodes: Array<{ id: number; positionX: number; positionY: number }>;
    flows: Array<{
      fromTaskTypeId: number;
      toTaskTypeId: number;
      label?: string;
      condition?: { questionId?: string; answer?: string };
    }>;
    deletedFlowIds: number[];
  }) => {
    try {
      const mutation = `
        mutation SaveWorkflow($input: SaveWorkflowInput!) {
          saveWorkflow(input: $input)
        }
      `;

      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          query: mutation,
          variables: { input: data },
        }),
      });

      const result = await res.json();

      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      // 重新載入資料
      await fetchData();
      alert("工作流程已保存！");
    } catch (err) {
      console.error("保存工作流程失敗：", err);
      alert(`保存失敗：${err instanceof Error ? err.message : "未知錯誤"}`);
      throw err;
    }
  };

  if (status === "loading") {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">載入中...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!isAdmin) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md">
            <span className="text-6xl mb-4 block">🔒</span>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">權限不足</h1>
            <p className="text-gray-600 mb-6">您沒有權限訪問此頁面</p>
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              返回儀表板
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        {/* 頁面標題 */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              申請類型管理
            </h1>
            <p className="text-gray-600">管理行政任務的申請類型、自訂問題與工作流程</p>
          </div>
          {activeTab === "list" && (
            <button
              onClick={handleAdd}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <span>+</span>
              新增類型
            </button>
          )}
        </div>

        {/* 頁籤切換 */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("list")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "list"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              類型列表
            </button>
            <button
              onClick={() => setActiveTab("workflow")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "workflow"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              流程編輯器
            </button>
          </nav>
        </div>

        {/* 錯誤顯示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-red-500 text-2xl">⚠️</span>
              <div>
                <p className="text-red-800 font-medium">載入失敗</p>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
              <button
                onClick={fetchData}
                className="ml-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
              >
                重試
              </button>
            </div>
          </div>
        )}

        {/* 流程編輯器頁籤 */}
        {activeTab === "workflow" && (
          <div className="bg-white rounded-xl shadow-md ">
            {loading ? (
              <div className="h-[600px] flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">載入中...</p>
                </div>
              </div>
            ) : (
              <WorkflowEditor
                taskTypes={taskTypes}
                flows={flows}
                onSave={handleSaveWorkflow}
                loading={loading}
              />
            )}
          </div>
        )}

        {/* 列表頁籤 */}
        {activeTab === "list" && (
          <>
            {loading ? (
              <div className="text-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">載入中...</p>
              </div>
            ) : taskTypes.length === 0 ? (
              <div className="bg-white rounded-xl shadow-md p-16 text-center">
                <span className="text-6xl mb-4 block">📋</span>
                <p className="text-xl text-gray-900 font-semibold mb-2">
                  尚無申請類型
                </p>
                <p className="text-gray-600">點擊右上角「新增類型」開始創建</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        名稱
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        描述
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        問題數
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        後續流程
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        狀態
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {taskTypes.map((type) => (
                      <tr key={type.id} className={`hover:bg-gray-50 ${!type.isActive ? "opacity-50" : ""}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">
                            {type.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600">
                            {type.description || "-"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                            {type.questions?.length || 0} 題
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {type.outgoingFlows && type.outgoingFlows.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {type.outgoingFlows.map((flow) => {
                                const targetType = taskTypes.find((t) => Number(t.id) === flow.toTaskTypeId);
                                return (
                                  <span
                                    key={flow.id}
                                    className={`px-2 py-0.5 text-xs rounded ${
                                      flow.condition
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-green-100 text-green-800"
                                    }`}
                                    title={flow.condition ? `條件: ${flow.label || flow.condition.answer}` : "固定流程"}
                                  >
                                    {targetType?.label || "未知"}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs rounded-full font-medium ${
                              type.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {type.isActive ? "啟用" : "停用"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEdit(type)}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              編輯
                            </button>
                            <button
                              onClick={() => handleToggleActive(type)}
                              className="text-yellow-600 hover:text-yellow-800 text-sm font-medium"
                            >
                              {type.isActive ? "停用" : "啟用"}
                            </button>
                            <button
                              onClick={() => handleDelete(type)}
                              className="text-red-600 hover:text-red-800 text-sm font-medium"
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
            )}
          </>
        )}

        {/* 編輯模態框 */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingType ? "編輯類型" : "新增類型"}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* 基本資訊 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                    基本資訊
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      類型代碼 *
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "") })
                      }
                      placeholder="例如：CREATE_FILE"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">只能使用大寫字母、數字和底線</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      顯示名稱 *
                    </label>
                    <input
                      type="text"
                      value={formData.label}
                      onChange={(e) =>
                        setFormData({ ...formData, label: e.target.value })
                      }
                      placeholder="例如：建檔"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      描述
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      rows={2}
                      placeholder="選填"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>

                  {editingType && editingType.outgoingFlows && editingType.outgoingFlows.length > 0 && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <span className="font-medium">後續流程：</span>{" "}
                        {editingType.outgoingFlows.map((flow) => {
                          const target = taskTypes.find((t) => Number(t.id) === flow.toTaskTypeId);
                          return target?.label || "未知";
                        }).join("、")}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        使用「流程編輯器」頁籤來管理後續流程關係
                      </p>
                    </div>
                  )}
                </div>

                {/* 自訂問題 */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      自訂問題
                    </h3>
                    <button
                      onClick={handleAddQuestion}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                    >
                      + 新增問題
                    </button>
                  </div>

                  {questions.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <p className="text-gray-500">尚未設定任何問題</p>
                      <p className="text-gray-400 text-sm mt-1">
                        點擊「新增問題」開始設定
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {questions.map((question, index) => (
                        <div
                          key={question.id}
                          className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-gray-900">
                                  {index + 1}. {question.label}
                                </span>
                                {question.required && (
                                  <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded">
                                    必填
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                                  {questionTypeLabels[question.type]}
                                </span>
                                {question.options.length > 0 && (
                                  <span className="text-xs text-gray-500">
                                    {question.options.length} 個選項
                                  </span>
                                )}
                              </div>
                              {question.options.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {question.options.map((opt, i) => (
                                    <span
                                      key={i}
                                      className="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded"
                                    >
                                      {opt}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {question.trigger && (
                                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                                  <span className="text-xs text-yellow-800">
                                    ⚡ 觸發條件：當答案為「{question.trigger.answer}」時 → 建議創建「{taskTypes.find(t => Number(t.id) === question.trigger?.taskTypeId)?.label || '未知類型'}」
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1 ml-4">
                              <button
                                onClick={() => moveQuestion(index, "up")}
                                disabled={index === 0}
                                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                title="上移"
                              >
                                ▲
                              </button>
                              <button
                                onClick={() => moveQuestion(index, "down")}
                                disabled={index === questions.length - 1}
                                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                title="下移"
                              >
                                ▼
                              </button>
                              <button
                                onClick={() => handleEditQuestion(question)}
                                className="p-1 text-blue-600 hover:text-blue-800"
                                title="編輯"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDeleteQuestion(question.id)}
                                className="p-1 text-red-600 hover:text-red-800"
                                title="刪除"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 提交按鈕 */}
                <div className="flex gap-3 pt-4 border-t">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? "儲存中..." : "確認儲存"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 問題編輯模態框 */}
        {showQuestionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
              <div className="border-b px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingQuestion ? "編輯問題" : "新增問題"}
                </h2>
                <button
                  onClick={() => setShowQuestionModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    問題標籤 *
                  </label>
                  <input
                    type="text"
                    value={questionForm.label}
                    onChange={(e) =>
                      setQuestionForm({ ...questionForm, label: e.target.value })
                    }
                    placeholder="例如：雇主名稱"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    問題類型 *
                  </label>
                  <select
                    value={questionForm.type}
                    onChange={(e) =>
                      setQuestionForm({
                        ...questionForm,
                        type: e.target.value as QuestionType,
                        options: e.target.value === "TEXT" ? [] : questionForm.options,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="TEXT">文字回答</option>
                    <option value="RADIO">單選題</option>
                    <option value="CHECKBOX">複選題</option>
                  </select>
                </div>

                {/* 選項設定（僅單選和複選） */}
                {(questionForm.type === "RADIO" || questionForm.type === "CHECKBOX") && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      選項 *
                    </label>
                    <div className="space-y-2">
                      {questionForm.options.map((option, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <span className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-sm">
                            {option}
                          </span>
                          <button
                            onClick={() => handleRemoveOption(index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newOption}
                          onChange={(e) => setNewOption(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddOption();
                            }
                          }}
                          placeholder="輸入選項..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={handleAddOption}
                          className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                          新增
                        </button>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      至少需要 2 個選項
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="required"
                    checked={questionForm.required}
                    onChange={(e) =>
                      setQuestionForm({ ...questionForm, required: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="required" className="text-sm text-gray-700">
                    此問題為必填
                  </label>
                </div>

                {/* 觸發條件設定（僅單選和複選可設定） */}
                {(questionForm.type === "RADIO" || questionForm.type === "CHECKBOX") && questionForm.options.length > 0 && (
                  <div className="border-t pt-4 mt-4">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium text-gray-700">
                        觸發後續任務
                      </label>
                      <input
                        type="checkbox"
                        checked={!!questionForm.trigger}
                        onChange={(e) =>
                          setQuestionForm({
                            ...questionForm,
                            trigger: e.target.checked
                              ? { answer: questionForm.options[0] || "", taskTypeId: 0 }
                              : null,
                          })
                        }
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                    </div>
                    {questionForm.trigger && (
                      <div className="space-y-3 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            當選擇此答案時
                          </label>
                          <select
                            value={questionForm.trigger.answer}
                            onChange={(e) =>
                              setQuestionForm({
                                ...questionForm,
                                trigger: { ...questionForm.trigger!, answer: e.target.value },
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          >
                            {questionForm.options.map((opt, i) => (
                              <option key={i} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            建議創建任務類型
                          </label>
                          <select
                            value={questionForm.trigger.taskTypeId || ""}
                            onChange={(e) =>
                              setQuestionForm({
                                ...questionForm,
                                trigger: {
                                  ...questionForm.trigger!,
                                  taskTypeId: Number(e.target.value),
                                },
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          >
                            <option value="">請選擇類型</option>
                            {taskTypes
                              .filter((t) => t.isActive && t.id !== editingType?.id)
                              .map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.label}
                                </option>
                              ))}
                          </select>
                        </div>
                        <p className="text-xs text-yellow-700">
                          當用戶選擇「{questionForm.trigger.answer}」時，系統會提示創建關聯任務
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowQuestionModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSaveQuestion}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    確認
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
