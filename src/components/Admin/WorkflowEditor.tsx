"use client";

import { useCallback, useState, useEffect, useMemo } from "react";
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  BackgroundVariant,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
  NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// 問題類型
interface Question {
  id: string;
  label: string;
  type: "TEXT" | "RADIO";
  options?: string[];
}

// 任務類型節點資料
interface TaskTypeNodeData {
  label: string;
  code: string;
  isActive: boolean;
  questionCount: number;
  [key: string]: unknown;
}

// 任務類型
interface TaskType {
  id: string | number;
  code: string;
  label: string;
  description?: string | null;
  isActive: boolean;
  questions?: Question[];
  positionX?: number | null;
  positionY?: number | null;
  outgoingFlows?: Array<{
    id: number;
    toTaskTypeId: number;
    label?: string | null;
    condition?: { questionId?: string; answer?: string } | null;
  }>;
}

// 流程關聯
interface TaskTypeFlow {
  id: number;
  fromTaskTypeId: number;
  toTaskTypeId: number;
  label?: string | null;
  condition?: { questionId?: string; answer?: string } | null;
}

// 自定義節點組件
function TaskTypeNode({ data, selected }: NodeProps<Node<TaskTypeNodeData>>) {
  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 shadow-md min-w-[160px] transition-all ${
        selected
          ? "border-blue-500 ring-2 ring-blue-200"
          : data.isActive
          ? "border-gray-300 bg-white"
          : "border-gray-200 bg-gray-100 opacity-60"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-5 !h-5 !bg-blue-400 !border-2 !border-blue-600 hover:!scale-125 transition-transform cursor-crosshair"
      />
      <div className="font-medium text-gray-900">{data.label}</div>
      <div className="text-xs text-gray-500 mt-1">{data.code}</div>
      {data.questionCount > 0 && (
        <div className="text-xs text-blue-600 mt-1">
          {data.questionCount} 個問題
        </div>
      )}
      {!data.isActive && (
        <div className="text-xs text-red-500 mt-1">已停用</div>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-5 !h-5 !bg-green-400 !border-2 !border-green-600 hover:!scale-125 transition-transform cursor-crosshair"
      />
    </div>
  );
}

const nodeTypes = {
  taskType: TaskTypeNode,
};

interface WorkflowEditorProps {
  taskTypes: TaskType[];
  flows: TaskTypeFlow[];
  onSave: (data: {
    nodes: Array<{ id: number; positionX: number; positionY: number }>;
    flows: Array<{
      fromTaskTypeId: number;
      toTaskTypeId: number;
      label?: string;
      condition?: { questionId?: string; answer?: string };
    }>;
    deletedFlowIds: number[];
  }) => Promise<void>;
  onAddQuestion?: (taskTypeId: number, question: {
    label: string;
    type: "RADIO";
    options: string[];
  }) => Promise<{ id: string } | null>;
  loading?: boolean;
}

export default function WorkflowEditor({
  taskTypes,
  flows,
  onSave,
  onAddQuestion,
  loading = false,
}: WorkflowEditorProps) {
  // 追蹤已刪除的流程 ID
  const [deletedFlowIds, setDeletedFlowIds] = useState<number[]>([]);
  // 追蹤是否有未保存的更改
  const [hasChanges, setHasChanges] = useState(false);
  // 保存中狀態
  const [saving, setSaving] = useState(false);
  // 選中的連線（用於編輯條件）
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  // 條件編輯 Modal 狀態
  const [showConditionModal, setShowConditionModal] = useState(false);
  // 編輯中的條件
  const [editingCondition, setEditingCondition] = useState<{
    questionId: string;
    answer: string;
    label: string;
  }>({ questionId: "", answer: "", label: "" });

  // 新增問題的表單狀態
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    label: "",
    type: "RADIO" as const,
    options: ["", ""],
  });

  // 初始化節點
  const initialNodes = useMemo(() => {
    return taskTypes.map((type, index) => ({
      id: String(type.id),
      type: "taskType",
      position: {
        x: type.positionX ?? (index % 4) * 250 + 50,
        y: type.positionY ?? Math.floor(index / 4) * 150 + 50,
      },
      data: {
        label: type.label,
        code: type.code,
        isActive: type.isActive,
        questionCount: type.questions?.length ?? 0,
      },
    }));
  }, [taskTypes]);

  // 初始化邊
  const initialEdges = useMemo((): Edge[] => {
    return flows.map((flow) => ({
      id: `e${flow.fromTaskTypeId}-${flow.toTaskTypeId}-${flow.id}`,
      source: String(flow.fromTaskTypeId),
      target: String(flow.toTaskTypeId),
      label: flow.label || (flow.condition?.answer ? `當回答: ${flow.condition.answer}` : undefined),
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
      },
      style: {
        strokeWidth: 2,
        stroke: flow.condition ? "#f59e0b" : "#3b82f6",
      },
      data: {
        flowId: flow.id,
        condition: flow.condition,
      },
    }));
  }, [flows]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);

  // 當 taskTypes 或 flows 變化時重置
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setDeletedFlowIds([]);
    setHasChanges(false);
  }, [taskTypes, flows, initialNodes, initialEdges, setNodes, setEdges]);

  // 獲取來源節點的問題列表
  const getSourceQuestions = useCallback((sourceId: string): Question[] => {
    const sourceType = taskTypes.find(t => String(t.id) === sourceId);
    return sourceType?.questions || [];
  }, [taskTypes]);

  // 獲取問題的選項
  const getQuestionOptions = useCallback((sourceId: string, questionId: string): string[] => {
    const questions = getSourceQuestions(sourceId);
    const question = questions.find(q => q.id === questionId);
    return question?.options || [];
  }, [getSourceQuestions]);

  // 連接處理
  const onConnect = useCallback(
    (connection: Connection) => {
      // 不允許自連接
      if (connection.source === connection.target) return;

      const sourceId = connection.source!;

      // 檢查互斥規則
      const existingEdges = edges.filter(e => e.source === sourceId);

      // 檢查是否已有固定流程出線
      const hasFixedFlow = existingEdges.some(e => !e.data?.condition);
      if (hasFixedFlow) {
        alert("此節點已有固定流程出線，無法再新增其他連線。\n（固定流程只能有一條出線）");
        return;
      }

      // 獲取已使用的問題ID（所有出線應該用同一個問題）
      let usedQuestionId: string | null = null;
      const usedAnswers: string[] = [];
      for (const edge of existingEdges) {
        const condition = edge.data?.condition as { questionId?: string; answer?: string } | null;
        if (condition?.questionId) {
          usedQuestionId = condition.questionId;
          if (condition.answer) {
            usedAnswers.push(condition.answer);
          }
        }
      }

      // 獲取來源節點的問題
      const sourceType = taskTypes.find(t => String(t.id) === sourceId);
      const questions = sourceType?.questions || [];
      const questionsWithOptions = questions.filter(q => q.type === "RADIO");

      // 初始化條件 - 如果已有條件出線，新線也必須有條件且用同一個問題
      let initialQuestionId = "";
      let initialAnswer = "";

      if (usedQuestionId) {
        // 已有條件出線，新線必須使用同一個問題的不同答案
        const usedQuestion = questionsWithOptions.find(q => q.id === usedQuestionId);
        if (usedQuestion) {
          const availableAnswer = (usedQuestion.options || []).find(opt => !usedAnswers.includes(opt));
          if (!availableAnswer) {
            // 該問題所有選項都已被使用，需要新增問題
            initialQuestionId = "";
            initialAnswer = "";
          } else {
            initialQuestionId = usedQuestionId;
            initialAnswer = availableAnswer;
          }
        }
      }

      const newEdge: Edge = {
        id: `e${connection.source}-${connection.target}-new-${Date.now()}`,
        source: connection.source!,
        target: connection.target!,
        label: undefined,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
        },
        style: {
          strokeWidth: 2,
          stroke: usedQuestionId ? "#f59e0b" : "#3b82f6",
        },
        data: {
          flowId: null,
          condition: initialQuestionId ? { questionId: initialQuestionId, answer: initialAnswer } : null,
        },
      };

      setEdges((eds) => addEdge(newEdge, eds));
      setHasChanges(true);

      // 自動打開條件編輯 Modal
      setSelectedEdge(newEdge);
      setEditingCondition({
        questionId: initialQuestionId,
        answer: initialAnswer,
        label: ""
      });
      setShowConditionModal(true);
    },
    [setEdges, edges, taskTypes]
  );

  // 點擊連線時打開編輯 Modal
  const onEdgeClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge);
    const condition = edge.data?.condition as { questionId?: string; answer?: string } | null;
    setEditingCondition({
      questionId: condition?.questionId || "",
      answer: condition?.answer || "",
      label: typeof edge.label === "string" ? edge.label : "",
    });
    setShowConditionModal(true);
  }, []);

  // 保存條件編輯
  const handleSaveCondition = useCallback(async () => {
    if (!selectedEdge) return;

    // 獲取此節點的其他出線數量
    const existingEdges = edges.filter(e => e.source === selectedEdge.source && e.id !== selectedEdge.id);
    const totalOutgoingEdges = existingEdges.length + 1;

    // 獲取可用問題
    const questions = getSourceQuestions(selectedEdge.source);
    const questionsWithOptions = questions.filter(q => q.type === "RADIO");

    // 獲取已使用的問題ID和答案
    let usedQuestionId: string | null = null;
    const usedAnswers: string[] = [];
    for (const edge of existingEdges) {
      const condition = edge.data?.condition as { questionId?: string; answer?: string } | null;
      if (condition?.questionId) {
        usedQuestionId = condition.questionId;
        if (condition.answer) {
          usedAnswers.push(condition.answer);
        }
      }
    }

    // 計算可用問題（如果已有使用的問題，只能選該問題且要有可用選項）
    let availableQs: typeof questionsWithOptions = [];
    if (usedQuestionId) {
      const usedQuestion = questionsWithOptions.find(q => q.id === usedQuestionId);
      if (usedQuestion) {
        const availableOptions = (usedQuestion.options || []).filter(opt => !usedAnswers.includes(opt));
        if (availableOptions.length > 0) {
          availableQs = [usedQuestion];
        }
      }
    } else {
      availableQs = questionsWithOptions;
    }

    // 判斷是否需要新增問題
    const needsNewQuestion = availableQs.length === 0 && newQuestion.label.trim();

    let questionIdToUse = editingCondition.questionId;
    let questionLabelToUse = "";

    // 如果需要新增問題
    if (needsNewQuestion && onAddQuestion) {
      const validOptions = newQuestion.options.filter(o => o.trim());
      if (validOptions.length < 2) {
        alert("請至少填寫 2 個選項");
        return;
      }
      if (!editingCondition.answer) {
        alert("請選擇觸發此連線的答案");
        return;
      }

      // 呼叫新增問題的回調
      const taskTypeId = parseInt(selectedEdge.source);
      const result = await onAddQuestion(taskTypeId, {
        label: newQuestion.label,
        type: newQuestion.type,
        options: validOptions,
      });

      if (!result) {
        alert("新增問題失敗");
        return;
      }

      questionIdToUse = result.id;
      questionLabelToUse = newQuestion.label;

      // 重置新問題表單
      setNewQuestion({ label: "", type: "RADIO", options: ["", ""] });
    }

    // 檢查：如果有多條出線，必須有條件
    const hasCondition = questionIdToUse && editingCondition.answer;
    if (totalOutgoingEdges > 1 && !hasCondition) {
      alert("多條出線時，每條連線都必須設定觸發條件。");
      return;
    }

    setEdges((eds) =>
      eds.map((e) => {
        if (e.id === selectedEdge.id) {
          const condition = hasCondition
            ? { questionId: questionIdToUse, answer: editingCondition.answer }
            : null;

          // 生成標籤
          let label: string | undefined = editingCondition.label || undefined;
          if (!label && hasCondition) {
            // 找到問題標籤
            const question = questions.find(q => q.id === questionIdToUse);
            const qLabel = question?.label || questionLabelToUse;
            if (qLabel) {
              label = `${qLabel}: ${editingCondition.answer}`;
            }
          }

          return {
            ...e,
            label,
            style: {
              ...e.style,
              stroke: hasCondition ? "#f59e0b" : "#3b82f6",
            },
            data: {
              ...e.data,
              condition,
            },
          };
        }
        return e;
      })
    );

    setHasChanges(true);
    setShowConditionModal(false);
    setSelectedEdge(null);
  }, [selectedEdge, editingCondition, setEdges, getSourceQuestions, edges, newQuestion, onAddQuestion]);

  // 節點拖動結束
  const onNodeDragStop = useCallback(() => {
    setHasChanges(true);
  }, []);

  // 刪除邊
  const onEdgeDelete = useCallback(
    (edgesToDelete: Edge[]) => {
      edgesToDelete.forEach((edge) => {
        const flowId = edge.data?.flowId;
        if (flowId && typeof flowId === "number") {
          setDeletedFlowIds((prev) => [...prev, flowId]);
        }
      });
      setHasChanges(true);
    },
    []
  );

  // 保存處理
  const handleSave = async () => {
    setSaving(true);
    try {
      // 準備節點位置資料
      const nodePositions = nodes.map((node) => ({
        id: parseInt(node.id),
        positionX: node.position.x,
        positionY: node.position.y,
      }));

      // 準備流程資料
      const flowsData = edges.map((edge) => ({
        fromTaskTypeId: parseInt(edge.source),
        toTaskTypeId: parseInt(edge.target),
        label: typeof edge.label === "string" ? edge.label : undefined,
        condition: edge.data?.condition as
          | { questionId?: string; answer?: string }
          | undefined,
      }));

      await onSave({
        nodes: nodePositions,
        flows: flowsData,
        deletedFlowIds,
      });

      setDeletedFlowIds([]);
      setHasChanges(false);
    } catch (error) {
      console.error("保存工作流程失敗:", error);
    } finally {
      setSaving(false);
    }
  };

  // 獲取選中連線的來源節點問題
  const selectedEdgeQuestions = selectedEdge ? getSourceQuestions(selectedEdge.source) : [];
  // 獲取選中問題的選項
  const selectedQuestionOptions = selectedEdge && editingCondition.questionId
    ? getQuestionOptions(selectedEdge.source, editingCondition.questionId)
    : [];

  // 獲取同一來源節點的其他出線資訊（用於檢查互斥邏輯）
  const getExistingOutgoingEdges = useCallback((sourceId: string, excludeEdgeId?: string) => {
    return edges.filter(e => e.source === sourceId && e.id !== excludeEdgeId);
  }, [edges]);

  // 獲取同一來源節點已使用的問題ID（所有出線應該用同一個問題）
  const getUsedQuestionId = useCallback((sourceId: string, excludeEdgeId?: string): string | null => {
    const existingEdges = getExistingOutgoingEdges(sourceId, excludeEdgeId);
    for (const edge of existingEdges) {
      const condition = edge.data?.condition as { questionId?: string } | null;
      if (condition?.questionId) {
        return condition.questionId;
      }
    }
    return null;
  }, [getExistingOutgoingEdges]);

  // 獲取同一來源節點已使用的答案列表
  const getUsedAnswers = useCallback((sourceId: string, questionId: string, excludeEdgeId?: string): string[] => {
    const existingEdges = getExistingOutgoingEdges(sourceId, excludeEdgeId);
    const usedAnswers: string[] = [];
    for (const edge of existingEdges) {
      const condition = edge.data?.condition as { questionId?: string; answer?: string } | null;
      if (condition?.questionId === questionId && condition?.answer) {
        usedAnswers.push(condition.answer);
      }
    }
    return usedAnswers;
  }, [getExistingOutgoingEdges]);

  // 檢查是否已有固定流程出線
  const hasFixedFlowEdge = useCallback((sourceId: string, excludeEdgeId?: string): boolean => {
    const existingEdges = getExistingOutgoingEdges(sourceId, excludeEdgeId);
    return existingEdges.some(e => !e.data?.condition);
  }, [getExistingOutgoingEdges]);

  // 當前編輯的節點的約束資訊
  const sourceConstraints = useMemo(() => {
    if (!selectedEdge) return { usedQuestionId: null, usedAnswers: [], hasFixedFlow: false, totalOutgoingEdges: 0 };
    const existingEdges = getExistingOutgoingEdges(selectedEdge.source, selectedEdge.id);
    const usedQuestionId = getUsedQuestionId(selectedEdge.source, selectedEdge.id);
    const usedAnswers = usedQuestionId ? getUsedAnswers(selectedEdge.source, usedQuestionId, selectedEdge.id) : [];
    const hasFixedFlow = hasFixedFlowEdge(selectedEdge.source, selectedEdge.id);
    // 總出線數 = 其他出線 + 當前這條
    const totalOutgoingEdges = existingEdges.length + 1;
    return { usedQuestionId, usedAnswers, hasFixedFlow, totalOutgoingEdges };
  }, [selectedEdge, getUsedQuestionId, getUsedAnswers, hasFixedFlowEdge, getExistingOutgoingEdges]);

  // 過濾出可選的問題（如果已有出線使用某問題，則只能選該問題；否則可選任意問題）
  const availableQuestions = useMemo(() => {
    if (!selectedEdge) return [];
    const questions = getSourceQuestions(selectedEdge.source);
    // 只返回單選題（有選項的問題）
    const questionsWithOptions = questions.filter(q => q.type === "RADIO");

    // 如果已有其他出線使用某個問題，則只能選擇那個問題
    if (sourceConstraints.usedQuestionId) {
      const usedQuestion = questionsWithOptions.find(q => q.id === sourceConstraints.usedQuestionId);
      // 檢查該問題是否還有未使用的選項
      if (usedQuestion) {
        const availableOptions = (usedQuestion.options || []).filter(
          opt => !sourceConstraints.usedAnswers.includes(opt)
        );
        // 如果還有可用選項，則返回該問題
        if (availableOptions.length > 0) {
          return [usedQuestion];
        }
      }
      // 沒有可用選項了，返回空（需要新增問題）
      return [];
    }

    return questionsWithOptions;
  }, [selectedEdge, getSourceQuestions, sourceConstraints.usedQuestionId, sourceConstraints.usedAnswers]);

  // 過濾出可選的答案（排除已被其他出線使用的答案）
  const availableAnswers = useMemo(() => {
    if (!editingCondition.questionId) return [];
    const allOptions = selectedQuestionOptions;
    return allOptions.filter(opt => !sourceConstraints.usedAnswers.includes(opt));
  }, [editingCondition.questionId, selectedQuestionOptions, sourceConstraints.usedAnswers]);

  return (
    <div className="w-full h-[800px] border rounded-lg overflow-hidden bg-gray-50 relative">
      {/* 工具列 */}
      <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-md p-3 flex items-center gap-3">
        <div className="text-sm text-gray-600">
          <span className="font-medium">{nodes.length}</span> 個節點
          <span className="mx-2">|</span>
          <span className="font-medium">{edges.length}</span> 個連線
        </div>
        {hasChanges && (
          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
            有未保存的更改
          </span>
        )}
      </div>

      {/* 保存按鈕 */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving || loading}
          className={`px-4 py-2 rounded-lg font-medium text-white transition-colors ${
            hasChanges && !saving && !loading
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-gray-400 cursor-not-allowed"
          }`}
        >
          {saving ? "保存中..." : "保存流程"}
        </button>
      </div>

      {/* 圖例 */}
      <div className="absolute bottom-4 left-4 z-10 bg-white rounded-lg shadow-md p-3 text-xs">
        <div className="font-medium mb-2">連線類型</div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-4 h-0.5 bg-blue-500"></div>
          <span>固定流程</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-4 h-0.5 bg-amber-500"></div>
          <span>條件分支</span>
        </div>
        <div className="text-gray-400 mt-2 border-t pt-2 space-y-1">
          <div>• 一條出線可選「固定」或「條件」</div>
          <div>• 多條出線必須都設條件</div>
          <div>• 無出線 = 流程終點</div>
        </div>
      </div>

      {/* 操作提示 */}
      <div className="absolute bottom-4 right-4 z-10 bg-white rounded-lg shadow-md p-3 text-xs text-gray-600">
        <div className="mb-1">• 拖動節點調整位置</div>
        <div className="mb-1">• 從節點底部拖曳到目標頂部建立連線</div>
        <div className="mb-1">• 點擊連線可編輯觸發條件</div>
        <div>• 選中連線按 Delete 可刪除</div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={(changes) => {
          const deleteChanges = changes.filter((c) => c.type === "remove");
          if (deleteChanges.length > 0) {
            const edgesToDelete = deleteChanges
              .map((c) => {
                if (c.type === "remove") {
                  return edges.find((e) => e.id === c.id);
                }
                return undefined;
              })
              .filter((e): e is Edge => e !== undefined);
            onEdgeDelete(edgesToDelete);
          }
          onEdgesChange(changes);
        }}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        deleteKeyCode={["Backspace", "Delete"]}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls />
      </ReactFlow>

      {/* 條件編輯 Modal - Grid 左右分欄 */}
      {showConditionModal && selectedEdge && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-[800px] max-h-[85vh] flex flex-col">
            {/* 頭部 */}
            <div className="shrink-0 border-b px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">編輯連線條件</h3>
              <button
                onClick={() => {
                  setShowConditionModal(false);
                  setSelectedEdge(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* 內容區 - Grid 左右分欄 */}
            <div className="flex-1 overflow-hidden grid grid-cols-2">
              {/* 左欄 - 連線資訊與觸發方式 */}
              <div className="p-6 overflow-y-auto border-r border-gray-100">
                <div className="space-y-5">
                  {/* 連線資訊 */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                      連線資訊
                    </h4>
                    <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-sm text-gray-500">來源:</span>
                        <span className="font-medium text-gray-900">
                          {taskTypes.find((t) => String(t.id) === selectedEdge.source)?.label || "未知"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-sm text-gray-500">目標:</span>
                        <span className="font-medium text-gray-900">
                          {taskTypes.find((t) => String(t.id) === selectedEdge.target)?.label || "未知"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 觸發方式選擇 */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                      觸發方式
                    </h4>
                    {(() => {
                      const canUseFixedFlow = sourceConstraints.totalOutgoingEdges === 1;
                      const mustUseCondition = sourceConstraints.totalOutgoingEdges > 1;

                      return canUseFixedFlow ? (
                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={() => setEditingCondition({ questionId: "", answer: "", label: "" })}
                            className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                              !editingCondition.questionId
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                !editingCondition.questionId ? "border-blue-500" : "border-gray-300"
                              }`}>
                                {!editingCondition.questionId && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
                              </div>
                              <div>
                                <div className={`font-medium ${!editingCondition.questionId ? "text-blue-700" : "text-gray-700"}`}>
                                  固定流程
                                </div>
                                <div className="text-xs text-gray-500">不管回答什麼都往下一步</div>
                              </div>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const firstQuestion = availableQuestions[0];
                              if (firstQuestion) {
                                setEditingCondition({
                                  ...editingCondition,
                                  questionId: firstQuestion.id,
                                  answer: firstQuestion.options?.[0] || "",
                                });
                              }
                            }}
                            disabled={availableQuestions.length === 0}
                            className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                              editingCondition.questionId
                                ? "border-amber-500 bg-amber-50"
                                : availableQuestions.length === 0
                                  ? "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
                                  : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                editingCondition.questionId ? "border-amber-500" : "border-gray-300"
                              }`}>
                                {editingCondition.questionId && <div className="w-2 h-2 rounded-full bg-amber-500"></div>}
                              </div>
                              <div>
                                <div className={`font-medium ${editingCondition.questionId ? "text-amber-700" : "text-gray-700"}`}>
                                  條件觸發
                                </div>
                                <div className="text-xs text-gray-500">
                                  {availableQuestions.length === 0 ? "無可用的問題（需新增）" : "依問題答案決定"}
                                </div>
                              </div>
                            </div>
                          </button>
                        </div>
                      ) : (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                          <div className="flex items-center gap-2 text-amber-800">
                            <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                            <span className="font-medium">條件觸發</span>
                          </div>
                          <p className="text-xs text-amber-700 mt-1">
                            此節點有 {sourceConstraints.totalOutgoingEdges} 條出線，每條都必須設定不同的觸發條件
                          </p>
                        </div>
                      );
                    })()}
                  </div>

                  {/* 連線標籤 */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                      連線標籤
                    </h4>
                    <input
                      type="text"
                      value={editingCondition.label}
                      onChange={(e) => setEditingCondition({ ...editingCondition, label: e.target.value })}
                      placeholder="留空則自動生成"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* 右欄 - 條件設定 */}
              <div className="p-6 overflow-y-auto bg-gray-50">
                <div className="space-y-5">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    條件設定
                  </h4>

                  {!editingCondition.questionId && sourceConstraints.totalOutgoingEdges === 1 ? (
                    // 固定流程模式
                    <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-200">
                      <div className="text-4xl mb-2">➡️</div>
                      <p className="text-gray-500">固定流程模式</p>
                      <p className="text-gray-400 text-sm mt-1">無需設定條件</p>
                    </div>
                  ) : availableQuestions.length > 0 ? (
                    // 有可用問題 - 顯示選擇介面
                    <div className="space-y-4">
                      {/* 已使用問題和答案提示 */}
                      {sourceConstraints.usedQuestionId && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
                          <p className="font-medium">
                            使用問題：「{getSourceQuestions(selectedEdge.source).find(q => q.id === sourceConstraints.usedQuestionId)?.label || "未知"}」
                          </p>
                          {sourceConstraints.usedAnswers.length > 0 && (
                            <p className="mt-1">
                              已使用的答案：{sourceConstraints.usedAnswers.join("、")}
                            </p>
                          )}
                          <p className="mt-1 text-blue-600">
                            剩餘可用選項：{availableAnswers.length} 個
                          </p>
                        </div>
                      )}

                      {/* 選擇問題 */}
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          選擇分支問題
                        </label>
                        {sourceConstraints.usedQuestionId ? (
                          // 已有其他出線使用某問題，鎖定該問題
                          <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-700">
                            {availableQuestions[0]?.label || "未知問題"}
                            <span className="text-xs text-gray-500 ml-2">（同節點出線必須使用相同問題）</span>
                          </div>
                        ) : (
                          <select
                            value={editingCondition.questionId || ""}
                            onChange={(e) => {
                              const newQuestionId = e.target.value;
                              const question = availableQuestions.find((q) => q.id === newQuestionId);
                              // 選擇第一個可用的答案
                              const firstAvailableAnswer = (question?.options || []).find(opt => !sourceConstraints.usedAnswers.includes(opt)) || "";
                              setEditingCondition({
                                ...editingCondition,
                                questionId: newQuestionId,
                                answer: firstAvailableAnswer,
                              });
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">-- 請選擇問題 --</option>
                            {availableQuestions.map((q) => (
                              <option key={q.id} value={q.id}>
                                {q.label} ({q.options?.length || 0} 個選項)
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* 選擇答案 */}
                      {editingCondition.questionId && (
                        <div className="bg-white p-4 rounded-lg border border-gray-200">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            當回答為（選擇一個可用選項）
                          </label>
                          <div className="space-y-2">
                            {selectedQuestionOptions.map((opt) => {
                              const isUsed = sourceConstraints.usedAnswers.includes(opt);
                              const isSelected = editingCondition.answer === opt;
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => !isUsed && setEditingCondition({ ...editingCondition, answer: opt })}
                                  disabled={isUsed}
                                  className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                                    isUsed
                                      ? "border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed"
                                      : isSelected
                                        ? "border-amber-500 bg-amber-50"
                                        : "border-gray-200 hover:border-gray-300"
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                      isUsed ? "border-gray-300" : isSelected ? "border-amber-500" : "border-gray-300"
                                    }`}>
                                      {isSelected && !isUsed && <div className="w-2 h-2 rounded-full bg-amber-500"></div>}
                                    </div>
                                    <span className={isUsed ? "text-gray-400" : isSelected ? "text-amber-700 font-medium" : "text-gray-700"}>
                                      {opt}
                                    </span>
                                    {isUsed && (
                                      <span className="ml-auto text-xs text-gray-400">已使用</span>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    // 沒有可用問題 - 顯示新增問題表單
                    <div className="space-y-4">
                      {/* 提示訊息 */}
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                        <p className="font-medium">需要新增問題</p>
                        <p className="text-xs mt-1">
                          {sourceConstraints.usedQuestionId
                            ? `問題「${getSourceQuestions(selectedEdge.source).find(q => q.id === sourceConstraints.usedQuestionId)?.label || ""}」的所有選項都已被使用，請新增一個新問題。`
                            : "此節點尚未設定任何單選題，請新增一個問題來設定觸發條件。"}
                        </p>
                      </div>

                      {/* 新增問題表單 */}
                      <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            問題標籤 *
                          </label>
                          <input
                            type="text"
                            value={newQuestion.label}
                            onChange={(e) => setNewQuestion({ ...newQuestion, label: e.target.value })}
                            placeholder="例如：是否需要後續處理？"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            問題類型
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setNewQuestion({ ...newQuestion, type: "RADIO" })}
                              className={`p-2 rounded-lg border-2 text-center text-sm ${
                                newQuestion.type === "RADIO"
                                  ? "border-blue-500 bg-blue-50 text-blue-700"
                                  : "border-gray-200 hover:border-gray-300"
                              }`}
                            >
                              ⭕ 單選題
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            選項（至少 2 個）
                          </label>
                          <div className="space-y-2">
                            {newQuestion.options.map((opt, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <span className="text-xs text-gray-400 w-4">{idx + 1}.</span>
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) => {
                                    const newOptions = [...newQuestion.options];
                                    newOptions[idx] = e.target.value;
                                    setNewQuestion({ ...newQuestion, options: newOptions });
                                  }}
                                  placeholder={`選項 ${idx + 1}`}
                                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                {newQuestion.options.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newOptions = newQuestion.options.filter((_, i) => i !== idx);
                                      setNewQuestion({ ...newQuestion, options: newOptions });
                                    }}
                                    className="p-1 text-red-500 hover:bg-red-50 rounded"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => setNewQuestion({ ...newQuestion, options: [...newQuestion.options, ""] })}
                              className="w-full py-1.5 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-gray-400 hover:text-gray-600"
                            >
                              + 新增選項
                            </button>
                          </div>
                        </div>

                        {/* 選擇觸發答案 */}
                        {newQuestion.label && newQuestion.options.filter(o => o.trim()).length >= 2 && (
                          <div className="pt-3 border-t border-gray-200">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              選擇觸發此連線的答案
                            </label>
                            <div className="space-y-2">
                              {newQuestion.options.filter(o => o.trim()).map((opt, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setEditingCondition({ ...editingCondition, answer: opt })}
                                  className={`w-full p-2 rounded-lg border-2 text-left text-sm transition-all ${
                                    editingCondition.answer === opt
                                      ? "border-amber-500 bg-amber-50"
                                      : "border-gray-200 hover:border-gray-300"
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${
                                      editingCondition.answer === opt ? "border-amber-500" : "border-gray-300"
                                    }`}>
                                      {editingCondition.answer === opt && <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>}
                                    </div>
                                    <span className={editingCondition.answer === opt ? "text-amber-700 font-medium" : "text-gray-700"}>
                                      {opt}
                                    </span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 底部按鈕 */}
            <div className="shrink-0 border-t bg-gray-50 px-6 py-4 flex justify-between rounded-b-xl">
              <button
                onClick={() => {
                  if (selectedEdge) {
                    const flowId = selectedEdge.data?.flowId;
                    if (flowId && typeof flowId === "number") {
                      setDeletedFlowIds((prev) => [...prev, flowId]);
                    }
                    setEdges((eds) => eds.filter((e) => e.id !== selectedEdge.id));
                    setHasChanges(true);
                  }
                  setShowConditionModal(false);
                  setSelectedEdge(null);
                }}
                className="px-4 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-100 rounded-lg transition-colors"
              >
                刪除連線
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowConditionModal(false);
                    setSelectedEdge(null);
                  }}
                  className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveCondition}
                  disabled={sourceConstraints.totalOutgoingEdges > 1 && (!editingCondition.questionId || !editingCondition.answer)}
                  className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  確定
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
