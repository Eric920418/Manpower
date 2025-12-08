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
  type: "TEXT" | "RADIO" | "CHECKBOX";
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
  loading?: boolean;
}

export default function WorkflowEditor({
  taskTypes,
  flows,
  onSave,
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
      // 檢查是否已存在相同連接（同一來源和目標，但允許不同條件）
      // 這裡我們允許多條相同方向的連線，因為可能有不同條件

      // 不允許自連接
      if (connection.source === connection.target) return;

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
          stroke: "#3b82f6",
        },
        data: {
          flowId: null, // 新建的邊沒有 flowId
          condition: null,
        },
      };

      setEdges((eds) => addEdge(newEdge, eds));
      setHasChanges(true);

      // 自動打開條件編輯 Modal
      setSelectedEdge(newEdge);
      setEditingCondition({ questionId: "", answer: "", label: "" });
      setShowConditionModal(true);
    },
    [setEdges]
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
  const handleSaveCondition = useCallback(() => {
    if (!selectedEdge) return;

    setEdges((eds) =>
      eds.map((e) => {
        if (e.id === selectedEdge.id) {
          const hasCondition = editingCondition.questionId && editingCondition.answer;
          const condition = hasCondition
            ? { questionId: editingCondition.questionId, answer: editingCondition.answer }
            : null;

          // 生成標籤
          let label: string | undefined = editingCondition.label || undefined;
          if (!label && hasCondition) {
            // 找到問題標籤
            const questions = getSourceQuestions(e.source);
            const question = questions.find(q => q.id === editingCondition.questionId);
            if (question) {
              label = `${question.label}: ${editingCondition.answer}`;
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
  }, [selectedEdge, editingCondition, setEdges, getSourceQuestions]);

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
        <div className="font-medium mb-2">圖例</div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-4 h-0.5 bg-blue-500"></div>
          <span>固定流程（自動觸發）</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-4 h-0.5 bg-amber-500"></div>
          <span>條件觸發（依答案）</span>
        </div>
        <div className="text-gray-400 mt-2">無連線 = 流程終點</div>
      </div>

      {/* 操作提示 */}
      <div className="absolute bottom-4 right-4 z-10 bg-white rounded-lg shadow-md p-3 text-xs text-gray-600">
        <div className="mb-1">• 拖動節點調整位置</div>
        <div className="mb-1">• 從底部連接點拖到目標頂部創建連線</div>
        <div className="mb-1">• 點擊連線編輯觸發條件</div>
        <div>• 選中連線後按 Delete 刪除</div>
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

      {/* 條件編輯 Modal */}
      {showConditionModal && selectedEdge && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-[600px] max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-medium mb-4">編輯連線條件</h3>

            <div className="flex items-center justify-between gap-4">
              {/* 來源和目標顯示 */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">從:</span>
                  <span className="font-medium">
                    {taskTypes.find((t) => String(t.id) === selectedEdge.source)
                      ?.label || "未知"}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-gray-500">到:</span>
                  <span className="font-medium">
                    {taskTypes.find((t) => String(t.id) === selectedEdge.target)
                      ?.label || "未知"}
                  </span>
                </div>
              </div>

              {/* 條件類型選擇 */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  觸發方式
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="conditionType"
                      checked={!editingCondition.questionId}
                      onChange={() =>
                        setEditingCondition({
                          questionId: "",
                          answer: "",
                          label: "",
                        })
                      }
                      className="text-blue-600"
                    />
                    <span className="text-sm">固定流程（自動觸發下一步）</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="conditionType"
                      checked={!!editingCondition.questionId}
                      onChange={() => {
                        const firstQuestion = selectedEdgeQuestions[0];
                        if (firstQuestion) {
                          setEditingCondition({
                            ...editingCondition,
                            questionId: firstQuestion.id,
                            answer: firstQuestion.options?.[0] || "",
                          });
                        }
                      }}
                      className="text-amber-600"
                      disabled={selectedEdgeQuestions.length === 0}
                    />
                    <span
                      className={`text-sm ${
                        selectedEdgeQuestions.length === 0
                          ? "text-gray-400"
                          : ""
                      }`}
                    >
                      條件觸發（依問題答案）
                      {selectedEdgeQuestions.length === 0 && (
                        <span className="text-xs text-gray-400 ml-1">
                          （來源無問題）
                        </span>
                      )}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* 條件設定 */}
            {editingCondition.questionId &&
              selectedEdgeQuestions.length > 0 && (
                <div className="space-y-4 mb-4 p-3 bg-amber-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      當問題
                    </label>
                    <select
                      value={editingCondition.questionId}
                      onChange={(e) => {
                        const newQuestionId = e.target.value;
                        const question = selectedEdgeQuestions.find(
                          (q) => q.id === newQuestionId
                        );
                        setEditingCondition({
                          ...editingCondition,
                          questionId: newQuestionId,
                          answer: question?.options?.[0] || "",
                        });
                      }}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    >
                      {selectedEdgeQuestions.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      回答為
                    </label>
                    {selectedQuestionOptions.length > 0 ? (
                      <select
                        value={editingCondition.answer}
                        onChange={(e) =>
                          setEditingCondition({
                            ...editingCondition,
                            answer: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      >
                        {selectedQuestionOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={editingCondition.answer}
                        onChange={(e) =>
                          setEditingCondition({
                            ...editingCondition,
                            answer: e.target.value,
                          })
                        }
                        placeholder="輸入觸發答案"
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    )}
                  </div>
                </div>
              )}

            {/* 自訂標籤 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                連線標籤（選填）
              </label>
              <input
                type="text"
                value={editingCondition.label}
                onChange={(e) =>
                  setEditingCondition({
                    ...editingCondition,
                    label: e.target.value,
                  })
                }
                placeholder="留空則自動生成"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>

            {/* 按鈕 */}
            <div className="flex justify-between">
              <button
                onClick={() => {
                  if (selectedEdge) {
                    // 記錄要刪除的 flowId
                    const flowId = selectedEdge.data?.flowId;
                    if (flowId && typeof flowId === "number") {
                      setDeletedFlowIds((prev) => [...prev, flowId]);
                    }
                    // 從 edges 中移除
                    setEdges((eds) => eds.filter((e) => e.id !== selectedEdge.id));
                    setHasChanges(true);
                  }
                  setShowConditionModal(false);
                  setSelectedEdge(null);
                }}
                className="px-4 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg"
              >
                刪除連線
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowConditionModal(false);
                    setSelectedEdge(null);
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveCondition}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
