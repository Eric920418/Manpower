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
type QuestionType = "TEXT" | "RADIO";

// 問題觸發條件
interface QuestionTrigger {
  answer: string;
  taskTypeId: number;
}

// 提醒設定
interface ReminderSetting {
  answer: string;
  message: string;
}

// 補充說明設定
interface ExplanationSetting {
  answer: string;
  prompt: string;
}

interface Question {
  id: string;
  label: string;
  type: QuestionType;
  options: string[];
  required: boolean;
  triggers: QuestionTrigger[];  // 改為陣列，每個選項可設定不同的後續任務
  reminders: ReminderSetting[];  // 改為陣列，每個選項可設定不同的提醒
  explanations: ExplanationSetting[];  // 改為陣列，每個選項可要求補充說明
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
  titlePlaceholder: string | null;
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
};

export default function TaskTypesPage() {
  const { status } = useSession();
  const { can } = usePermission();
  const router = useRouter();
  const canManageTaskTypes = can("system:config");

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
    label: "",
    description: "",
    titlePlaceholder: "",
  });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [saving, setSaving] = useState(false);

  // 問題編輯
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [showQuestionModal, setShowQuestionModal] = useState(false);

  // 展開的後續流程
  const [expandedFlows, setExpandedFlows] = useState<Set<number>>(new Set());
  const [questionForm, setQuestionForm] = useState<{
    label: string;
    type: QuestionType;
    options: string[];
    required: boolean;
    triggers: QuestionTrigger[];
    reminders: ReminderSetting[];
    explanations: ExplanationSetting[];
  }>({
    label: "",
    type: "TEXT",
    options: [],
    required: false,
    triggers: [],
    reminders: [],
    explanations: [],
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
            titlePlaceholder
            order
            isActive
            questions {
              id
              label
              type
              options
              required
              triggers {
                answer
                taskTypeId
              }
              reminders {
                answer
                message
              }
              explanations {
                answer
                prompt
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
    if (status === "authenticated" && canManageTaskTypes) {
      fetchData();
    }
  }, [status, canManageTaskTypes, fetchData]);

  // 開啟新增模態框
  const handleAdd = () => {
    setEditingType(null);
    setFormData({ label: "", description: "", titlePlaceholder: "" });
    setQuestions([]);
    setShowModal(true);
  };

  // 開啟編輯模態框
  const handleEdit = (type: TaskType) => {
    setEditingType(type);
    setFormData({
      label: type.label,
      description: type.description || "",
      titlePlaceholder: type.titlePlaceholder || "",
    });
    setQuestions(type.questions || []);
    setShowModal(true);
  };

  // 自動生成代碼（根據名稱生成）
  const generateCode = (label: string): string => {
    // 使用時間戳確保唯一性
    const timestamp = Date.now().toString(36).toUpperCase();
    // 取前幾個字的拼音或直接用 label 轉大寫
    const prefix = label.trim().substring(0, 10).toUpperCase().replace(/[^A-Z0-9\u4e00-\u9fa5]/g, '') || 'TYPE';
    return `${prefix}_${timestamp}`;
  };

  // 儲存
  const handleSave = async () => {
    if (!formData.label.trim()) {
      alert("請填寫顯示名稱");
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
        triggers: q.triggers || [],
        reminders: q.reminders || [],
        explanations: q.explanations || [],
      }));

      if (editingType) {
        // 更新（保留原有的 code）
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
                triggers {
                  answer
                  taskTypeId
                }
                reminders {
                  answer
                  message
                }
                explanations {
                  answer
                  prompt
                }
              }
            }
          }
        `;
        variables = {
          input: {
            id: typeof editingType.id === 'string' ? parseInt(editingType.id, 10) : editingType.id,
            label: formData.label,
            description: formData.description || null,
            titlePlaceholder: formData.titlePlaceholder || null,
            questions: questionsInput,
          },
        };
      } else {
        // 新增（自動生成 code）
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
                triggers {
                  answer
                  taskTypeId
                }
                reminders {
                  answer
                  message
                }
                explanations {
                  answer
                  prompt
                }
              }
            }
          }
        `;
        variables = {
          input: {
            code: generateCode(formData.label),
            label: formData.label,
            description: formData.description || null,
            titlePlaceholder: formData.titlePlaceholder || null,
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
      triggers: [],
      reminders: [],
      explanations: [],
    });
    setNewOption("");
    setShowQuestionModal(true);
  };

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question);
    // 過濾掉不存在選項的相關設定（清理髒資料）
    const validOptions = new Set(question.options);
    setQuestionForm({
      label: question.label,
      type: question.type,
      options: [...question.options],
      required: question.required,
      triggers: (question.triggers || []).filter((t) => validOptions.has(t.answer)),
      reminders: (question.reminders || []).filter((r) => validOptions.has(r.answer)),
      explanations: (question.explanations || []).filter((e) => validOptions.has(e.answer)),
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

    if (questionForm.type === "RADIO" && questionForm.options.length < 2) {
      alert("單選題至少需要 2 個選項");
      return;
    }

    // 驗證觸發條件（過濾掉沒有選擇任務類型的觸發）
    const validTriggers = questionForm.triggers.filter(t => t.answer && t.taskTypeId);
    // 驗證提醒設定（過濾掉沒有訊息的提醒）
    const validReminders = questionForm.reminders.filter(r => r.answer && r.message);
    // 驗證補充說明設定（過濾掉沒有提示文字的）
    const validExplanations = questionForm.explanations.filter(e => e.answer && e.prompt);

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
                triggers: validTriggers,
                reminders: validReminders,
                explanations: validExplanations,
              }
            : q
        )
      );
    } else {
      // 新增問題 - 使用兼容性更好的 UUID 生成方式
      const generateId = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
          return crypto.randomUUID();
        }
        // fallback for older browsers
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };
      const newQuestion: Question = {
        id: generateId(),
        label: questionForm.label,
        type: questionForm.type,
        options: questionForm.options,
        required: questionForm.required,
        triggers: validTriggers,
        reminders: validReminders,
        explanations: validExplanations,
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
    const removedOption = questionForm.options[index];
    setQuestionForm({
      ...questionForm,
      options: questionForm.options.filter((_, i) => i !== index),
      // 同時清理相關的 triggers、reminders、explanations
      triggers: questionForm.triggers.filter((t) => t.answer !== removedOption),
      reminders: questionForm.reminders.filter((r) => r.answer !== removedOption),
      explanations: questionForm.explanations.filter((e) => e.answer !== removedOption),
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

  // 從流程編輯器新增問題
  const handleAddQuestionFromWorkflow = async (
    taskTypeId: number,
    question: { label: string; type: "RADIO"; options: string[] }
  ): Promise<{ id: string } | null> => {
    try {
      // 先獲取現有的 taskType
      const existingType = taskTypes.find(t => Number(t.id) === taskTypeId);
      if (!existingType) {
        throw new Error("找不到該類型");
      }

      // 生成新問題的 ID
      const generateId = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
          return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };

      const newQuestionId = generateId();
      const newQuestion = {
        id: newQuestionId,
        label: question.label,
        type: question.type,
        options: question.options,
        required: false,
        triggers: [],
        reminders: [],
        explanations: [],
      };

      // 合併現有問題
      const updatedQuestions = [...(existingType.questions || []), newQuestion];

      // 更新 TaskType
      const mutation = `
        mutation UpdateTaskType($input: UpdateTaskTypeInput!) {
          updateTaskType(input: $input) {
            id
            questions {
              id
              label
              type
              options
              reminders {
                answer
                message
              }
              explanations {
                answer
                prompt
              }
            }
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
              id: taskTypeId,
              questions: updatedQuestions.map(q => ({
                id: q.id,
                label: q.label,
                type: q.type,
                options: q.options,
                required: q.required,
                triggers: q.triggers || [],
                reminders: q.reminders || [],
                explanations: q.explanations || [],
              })),
            },
          },
        }),
      });

      const result = await res.json();

      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      // 更新本地狀態
      setTaskTypes(prev => prev.map(t => {
        if (Number(t.id) === taskTypeId) {
          return { ...t, questions: updatedQuestions };
        }
        return t;
      }));

      return { id: newQuestionId };
    } catch (err) {
      console.error("新增問題失敗：", err);
      alert(`新增問題失敗：${err instanceof Error ? err.message : "未知錯誤"}`);
      return null;
    }
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

  if (!canManageTaskTypes) {
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
            <p className="text-gray-600">
              管理行政任務的申請類型、自訂問題與工作流程
            </p>
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
                onAddQuestion={handleAddQuestionFromWorkflow}
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
              <div className="grid gap-4">
                {taskTypes.map((type) => {
                  // 分析流程類型
                  const hasConditions = type.outgoingFlows?.some(
                    (f) => f.condition
                  );
                  const branchQuestionId = type.outgoingFlows?.find(
                    (f) => f.condition?.questionId
                  )?.condition?.questionId;
                  const branchQuestion = branchQuestionId
                    ? type.questions?.find((q) => q.id === branchQuestionId)
                    : null;

                  return (
                    <div
                      key={type.id}
                      className={`bg-white rounded-xl shadow-md overflow-hidden border ${
                        !type.isActive
                          ? "opacity-60 border-gray-200"
                          : "border-transparent"
                      }`}
                    >
                      {/* 卡片頭部 */}
                      <div className="p-4 flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {type.label}
                            </h3>
                            <span
                              className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                                type.isActive
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-500"
                              }`}
                            >
                              {type.isActive ? "啟用中" : "已停用"}
                            </span>
                          </div>
                          {type.description && (
                            <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                              {type.description}
                            </p>
                          )}
                        </div>

                        {/* 操作按鈕 */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleEdit(type)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="編輯"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleToggleActive(type)}
                            className={`p-2 rounded-lg transition-colors ${
                              type.isActive
                                ? "text-yellow-600 hover:bg-yellow-50"
                                : "text-green-600 hover:bg-green-50"
                            }`}
                            title={type.isActive ? "停用" : "啟用"}
                          >
                            {type.isActive ? (
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                                />
                              </svg>
                            ) : (
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(type)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="刪除"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* 統計區域 */}
                      <div className="px-4 pb-4 flex flex-wrap gap-4">
                        {/* 問題數 */}
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-500">問題：</span>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                            {type.questions?.length || 0} 題
                          </span>
                        </div>

                        {/* 後續流程 */}
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-500">後續：</span>
                          {type.outgoingFlows &&
                          type.outgoingFlows.length > 0 ? (
                            <button
                              onClick={() => {
                                const newExpanded = new Set(expandedFlows);
                                if (newExpanded.has(type.id)) {
                                  newExpanded.delete(type.id);
                                } else {
                                  newExpanded.add(type.id);
                                }
                                setExpandedFlows(newExpanded);
                              }}
                              className={`flex items-center gap-1 px-2 py-0.5 rounded-full font-medium transition-colors ${
                                hasConditions
                                  ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                                  : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                              }`}
                            >
                              <span
                                className={`transform transition-transform text-xs ${
                                  expandedFlows.has(type.id) ? "rotate-90" : ""
                                }`}
                              >
                                ▶
                              </span>
                              {hasConditions ? (
                                <span>{type.outgoingFlows.length} 條分支</span>
                              ) : (
                                <span>固定流程</span>
                              )}
                            </button>
                          ) : (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                              流程終點
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 展開的流程詳情 */}
                      {expandedFlows.has(type.id) &&
                        type.outgoingFlows &&
                        type.outgoingFlows.length > 0 && (
                          <div className="border-t bg-gray-50 p-4">
                            {/* 分支問題標題 */}
                            {hasConditions && branchQuestion && (
                              <div className="mb-3 text-sm">
                                <span className="text-gray-500">
                                  分支問題：
                                </span>
                                <span className="font-medium text-amber-700">
                                  {branchQuestion.label}
                                </span>
                              </div>
                            )}

                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                              {type.outgoingFlows.map((flow) => {
                                const targetType = taskTypes.find(
                                  (t) => Number(t.id) === flow.toTaskTypeId
                                );

                                return (
                                  <div
                                    key={flow.id}
                                    className={`p-3 rounded-lg border ${
                                      flow.condition
                                        ? "bg-amber-50 border-amber-200"
                                        : "bg-blue-50 border-blue-200"
                                    }`}
                                  >
                                    {flow.condition ? (
                                      <>
                                        <div className="text-xs text-amber-600 mb-1">
                                          當回答為
                                        </div>
                                        <div className="font-medium text-amber-800">
                                          「{flow.condition.answer}」
                                        </div>
                                      </>
                                    ) : (
                                      <div className="text-blue-700 font-medium">
                                        ✓ 自動觸發
                                      </div>
                                    )}
                                    <div className="mt-2 pt-2 border-t border-gray-200 text-sm text-gray-600">
                                      → {targetType?.label || "未知類型"}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* 編輯模態框 */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
              {/* 頭部 */}
              <div className="shrink-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-xl">
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

              {/* 內容區 - 左右分欄 */}
              <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2">
                {/* 左欄 - 基本資訊 */}
                <div className="p-6 overflow-y-auto border-r border-gray-100">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                      基本資訊
                    </h3>
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
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        rows={3}
                        placeholder="選填"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        任務標題提示文字
                      </label>
                      <input
                        type="text"
                        value={formData.titlePlaceholder}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            titlePlaceholder: e.target.value,
                          })
                        }
                        placeholder="例如：請輸入雇主姓名"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        此文字將顯示於新增行政申請時的任務標題輸入框中
                      </p>
                    </div>

                    {editingType &&
                      editingType.outgoingFlows &&
                      editingType.outgoingFlows.length > 0 && (
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <p className="text-sm text-blue-800">
                            <span className="font-medium">後續流程：</span>{" "}
                            {editingType.outgoingFlows
                              .map((flow) => {
                                const target = taskTypes.find(
                                  (t) => Number(t.id) === flow.toTaskTypeId
                                );
                                return target?.label || "未知";
                              })
                              .join("、")}
                          </p>
                          <p className="text-xs text-blue-600 mt-1">
                            使用「流程編輯器」頁籤來管理後續流程關係
                          </p>
                        </div>
                      )}
                  </div>
                </div>

                {/* 右欄 - 自訂問題 */}
                <div className="p-6 overflow-y-auto bg-gray-50">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        自訂問題{" "}
                        <span className="text-sm font-normal text-gray-500">
                          ({questions.length})
                        </span>
                      </h3>
                      <button
                        onClick={handleAddQuestion}
                        className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
                      >
                        <span>+</span>
                        <span>新增</span>
                      </button>
                    </div>

                    {questions.length === 0 ? (
                      <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-200">
                        <div className="text-4xl mb-2">📝</div>
                        <p className="text-gray-500">尚未設定任何問題</p>
                        <p className="text-gray-400 text-sm mt-1">
                          點擊「新增」開始設定
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {questions.map((question, index) => (
                          <div
                            key={question.id}
                            className="bg-white rounded-lg p-3 border border-gray-200 hover:border-gray-300 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs text-gray-400 font-mono">
                                    #{index + 1}
                                  </span>
                                  <span className="text-sm font-medium text-gray-900 truncate">
                                    {question.label}
                                  </span>
                                  {question.required && (
                                    <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded shrink-0">
                                      必填
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                                    {questionTypeLabels[question.type]}
                                  </span>
                                  {question.options.length > 0 && (
                                    <span className="text-xs text-gray-500">
                                      {question.options.length} 選項
                                    </span>
                                  )}
                                </div>
                                {question.options.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {question.options
                                      .slice(0, 4)
                                      .map((opt, i) => (
                                        <span
                                          key={i}
                                          className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                                        >
                                          {opt}
                                        </span>
                                      ))}
                                    {question.options.length > 4 && (
                                      <span className="px-1.5 py-0.5 text-gray-400 text-xs">
                                        +{question.options.length - 4} 更多
                                      </span>
                                    )}
                                  </div>
                                )}
                                {(() => {
                                  // 過濾掉不存在選項的設定
                                  const validOptions = new Set(question.options);
                                  const validTriggers = (question.triggers || []).filter(t => validOptions.has(t.answer));
                                  const validReminders = (question.reminders || []).filter(r => validOptions.has(r.answer));
                                  const validExplanations = (question.explanations || []).filter(e => validOptions.has(e.answer));

                                  return (
                                    <>
                                      {validTriggers.length > 0 && (
                                        <div className="mt-2 space-y-1">
                                          {validTriggers.map((trigger, idx) => (
                                            <div
                                              key={idx}
                                              className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded"
                                            >
                                              ⚡ 「{trigger.answer}」→{" "}
                                              {taskTypes.find(
                                                (t) =>
                                                  Number(t.id) ===
                                                  trigger.taskTypeId
                                              )?.label || "未知"}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      {validReminders.length > 0 && (
                                        <div className="mt-2 space-y-1">
                                          {validReminders.map(
                                            (reminder, idx) => (
                                              <div
                                                key={idx}
                                                className="text-xs text-red-700 bg-red-50 px-2 py-1 rounded"
                                              >
                                                🔔 「{reminder.answer}」→{" "}
                                                {reminder.message}
                                              </div>
                                            )
                                          )}
                                        </div>
                                      )}
                                      {validExplanations.length > 0 && (
                                        <div className="mt-2 space-y-1">
                                          {validExplanations.map(
                                            (explanation, idx) => (
                                              <div
                                                key={idx}
                                                className="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded"
                                              >
                                                📝 「{explanation.answer}」→{" "}
                                                {explanation.prompt}
                                              </div>
                                            )
                                          )}
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button
                                  onClick={() => moveQuestion(index, "up")}
                                  disabled={index === 0}
                                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30 disabled:hover:bg-transparent"
                                  title="上移"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M5 15l7-7 7 7"
                                    />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => moveQuestion(index, "down")}
                                  disabled={index === questions.length - 1}
                                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30 disabled:hover:bg-transparent"
                                  title="下移"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M19 9l-7 7-7-7"
                                    />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleEditQuestion(question)}
                                  className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                                  title="編輯"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                    />
                                  </svg>
                                </button>
                                <button
                                  onClick={() =>
                                    handleDeleteQuestion(question.id)
                                  }
                                  className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                                  title="刪除"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                    />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 底部按鈕 */}
              <div className="shrink-0 border-t bg-gray-50 px-6 py-4 flex gap-3 rounded-b-xl">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? "儲存中..." : "確認儲存"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 問題編輯模態框 */}
        {showQuestionModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white max-w-6xl w-full max-h-[90vh] flex flex-col">
              {/* 頭部 */}
              <div className="shrink-0 border-b px-6 py-4 flex items-center justify-between">
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

              {/* 內容區 - 左右分欄 */}
              <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr_350px]">
                {/* 左欄 - 基本設定 */}
                <div className="p-6 overflow-y-auto border-r border-gray-100">
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                      基本設定
                    </h3>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        問題標籤 *
                      </label>
                      <input
                        type="text"
                        value={questionForm.label}
                        onChange={(e) =>
                          setQuestionForm({
                            ...questionForm,
                            label: e.target.value,
                          })
                        }
                        placeholder="例如：雇主名稱"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        問題類型 *
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { value: "TEXT", label: "文字", icon: "📝" },
                          { value: "RADIO", label: "單選", icon: "⭕" },
                        ].map((type) => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() =>
                              setQuestionForm({
                                ...questionForm,
                                type: type.value as QuestionType,
                                options:
                                  type.value === "TEXT"
                                    ? []
                                    : questionForm.options,
                              })
                            }
                            className={`p-3 rounded-lg border-2 text-center transition-all ${
                              questionForm.type === type.value
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <div className="text-xl mb-1">{type.icon}</div>
                            <div
                              className={`text-sm font-medium ${
                                questionForm.type === type.value
                                  ? "text-blue-700"
                                  : "text-gray-700"
                              }`}
                            >
                              {type.label}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <input
                        type="checkbox"
                        id="required"
                        checked={questionForm.required}
                        onChange={(e) =>
                          setQuestionForm({
                            ...questionForm,
                            required: e.target.checked,
                          })
                        }
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <label
                        htmlFor="required"
                        className="text-sm text-gray-700"
                      >
                        此問題為必填
                      </label>
                    </div>

                    {/* 各選項進階設定 - 使用 Grid 3 欄顯示 */}
                    {questionForm.type === "RADIO" &&
                      questionForm.options.length > 0 && (
                        <div className="border-t pt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            各選項進階設定
                          </label>

                          {/* 標題列 */}
                          <div className="grid grid-cols-[100px_1fr_1fr_1fr] gap-2 mb-2 px-2">
                            <div className="text-xs font-medium text-gray-500">
                              選項
                            </div>
                            <div className="text-xs font-medium text-amber-600">
                              ⚡ 觸發任務
                            </div>
                            <div className="text-xs font-medium text-red-600">
                              🔔 補件提醒
                            </div>
                            <div className="text-xs font-medium text-blue-600">
                              📝 補充說明
                            </div>
                          </div>

                          {/* 選項列表 */}
                          <div className="space-y-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                            {questionForm.options.map((option, index) => {
                              const existingTrigger =
                                questionForm.triggers.find(
                                  (t) => t.answer === option
                                );
                              const existingReminder =
                                questionForm.reminders.find(
                                  (r) => r.answer === option
                                );
                              const existingExplanation =
                                questionForm.explanations.find(
                                  (e) => e.answer === option
                                );

                              return (
                                <div
                                  key={index}
                                  className="grid grid-cols-[100px_1fr_1fr_1fr] gap-2 bg-white p-2 rounded-lg border border-gray-200"
                                >
                                  {/* 選項名稱 */}
                                  <div className="flex items-center">
                                    <span
                                      className="text-sm text-gray-700 truncate font-medium"
                                      title={option}
                                    >
                                      {option}
                                    </span>
                                  </div>

                                  {/* 觸發任務 */}
                                  <select
                                    value={existingTrigger?.taskTypeId || ""}
                                    onChange={(e) => {
                                      const newTaskTypeId = Number(
                                        e.target.value
                                      );
                                      let newTriggers = [
                                        ...questionForm.triggers,
                                      ];
                                      if (newTaskTypeId) {
                                        const existingIndex =
                                          newTriggers.findIndex(
                                            (t) => t.answer === option
                                          );
                                        if (existingIndex >= 0) {
                                          newTriggers[existingIndex] = {
                                            answer: option,
                                            taskTypeId: newTaskTypeId,
                                          };
                                        } else {
                                          newTriggers.push({
                                            answer: option,
                                            taskTypeId: newTaskTypeId,
                                          });
                                        }
                                      } else {
                                        newTriggers = newTriggers.filter(
                                          (t) => t.answer !== option
                                        );
                                      }
                                      setQuestionForm({
                                        ...questionForm,
                                        triggers: newTriggers,
                                      });
                                    }}
                                    className="w-full px-2 py-1.5 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs bg-amber-50"
                                  >
                                    <option value="">不觸發</option>
                                    {taskTypes
                                      .filter(
                                        (t) =>
                                          t.isActive && t.id !== editingType?.id
                                      )
                                      .map((t) => (
                                        <option key={t.id} value={t.id}>
                                          {t.label}
                                        </option>
                                      ))}
                                  </select>

                                  {/* 補件提醒 */}
                                  <input
                                    type="text"
                                    value={existingReminder?.message || ""}
                                    onChange={(e) => {
                                      const newMessage = e.target.value;
                                      let newReminders = [
                                        ...questionForm.reminders,
                                      ];
                                      if (newMessage) {
                                        const existingIndex =
                                          newReminders.findIndex(
                                            (r) => r.answer === option
                                          );
                                        if (existingIndex >= 0) {
                                          newReminders[existingIndex] = {
                                            answer: option,
                                            message: newMessage,
                                          };
                                        } else {
                                          newReminders.push({
                                            answer: option,
                                            message: newMessage,
                                          });
                                        }
                                      } else {
                                        newReminders = newReminders.filter(
                                          (r) => r.answer !== option
                                        );
                                      }
                                      setQuestionForm({
                                        ...questionForm,
                                        reminders: newReminders,
                                      });
                                    }}
                                    placeholder="提醒訊息"
                                    className="w-full px-2 py-1.5 border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-xs bg-red-50"
                                  />

                                  {/* 補充說明 */}
                                  <input
                                    type="text"
                                    value={existingExplanation?.prompt || ""}
                                    onChange={(e) => {
                                      const newPrompt = e.target.value;
                                      let newExplanations = [
                                        ...questionForm.explanations,
                                      ];
                                      if (newPrompt) {
                                        const existingIndex =
                                          newExplanations.findIndex(
                                            (ex) => ex.answer === option
                                          );
                                        if (existingIndex >= 0) {
                                          newExplanations[existingIndex] = {
                                            answer: option,
                                            prompt: newPrompt,
                                          };
                                        } else {
                                          newExplanations.push({
                                            answer: option,
                                            prompt: newPrompt,
                                          });
                                        }
                                      } else {
                                        newExplanations =
                                          newExplanations.filter(
                                            (ex) => ex.answer !== option
                                          );
                                      }
                                      setQuestionForm({
                                        ...questionForm,
                                        explanations: newExplanations,
                                      });
                                    }}
                                    placeholder="提示文字"
                                    className="w-full px-2 py-1.5 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-blue-50"
                                  />
                                </div>
                              );
                            })}
                          </div>

                          {/* 說明文字 */}
                          <div className="mt-2 text-xs text-gray-500 space-y-1">
                            <p>
                              <span className="text-amber-600">
                                ⚡ 觸發任務
                              </span>
                              ：選擇該答案時自動建立後續任務
                            </p>
                            <p>
                              <span className="text-red-600">🔔 補件提醒</span>
                              ：選擇該答案時顯示提醒訊息
                            </p>
                            <p>
                              <span className="text-blue-600">📝 補充說明</span>
                              ：選擇該答案時要求用戶輸入補充說明
                            </p>
                          </div>
                        </div>
                      )}
                  </div>
                </div>

                {/* 右欄 - 選項設定 */}
                <div className="p-6 overflow-y-auto bg-gray-50">
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                      選項設定
                    </h3>

                    {questionForm.type === "TEXT" ? (
                      <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-200">
                        <div className="text-4xl mb-2">📝</div>
                        <p className="text-gray-500">文字回答類型</p>
                        <p className="text-gray-400 text-sm mt-1">
                          無需設定選項
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2">
                          {questionForm.options.length === 0 ? (
                            <div className="text-center py-8 bg-white rounded-lg border-2 border-dashed border-gray-200">
                              <p className="text-gray-500">尚未設定選項</p>
                              <p className="text-gray-400 text-sm mt-1">
                                在下方新增選項
                              </p>
                            </div>
                          ) : (
                            questionForm.options.map((option, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200"
                              >
                                <span className="w-6 h-6 flex items-center justify-center bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                  {index + 1}
                                </span>
                                <span className="flex-1 text-sm text-gray-900">
                                  {option}
                                </span>
                                <button
                                  onClick={() => handleRemoveOption(index)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                >
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M6 18L18 6M6 6l12 12"
                                    />
                                  </svg>
                                </button>
                              </div>
                            ))
                          )}
                        </div>

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
                          placeholder="輸入選項後按 Enter..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <span
                              className={
                                questionForm.options.length >= 2
                                  ? "text-green-600"
                                  : "text-amber-600"
                              }
                            >
                              {questionForm.options.length >= 2 ? "✓" : "!"}
                            </span>
                            {questionForm.options.length >= 2
                              ? `已設定 ${questionForm.options.length} 個選項`
                              : `至少需要 2 個選項（目前 ${questionForm.options.length} 個）`}
                          </p>
                          <button
                            onClick={handleAddOption}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            新增
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* 底部按鈕 */}
              <div className="shrink-0 border-t bg-gray-50 px-6 py-4 flex gap-3">
                <button
                  onClick={() => setShowQuestionModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveQuestion}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  確認
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
