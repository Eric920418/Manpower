"use client";
import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSession } from "next-auth/react";
import { usePermission } from "@/hooks/usePermission";
import { useRouter, useSearchParams } from "next/navigation";
import AdminLayout from "@/components/Admin/AdminLayout";
import { useTaskReminder } from "@/components/Admin/TaskReminderProvider";
import { useToast } from "@/components/UI/Toast";

// 類型定義
interface TaskUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

interface AdminTaskAttachment {
  id: number;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string | null;
  createdAt: string;
}

interface ApprovalRecord {
  id: number;
  action: string;
  comment: string | null;
  // 要求修改專用欄位
  revisionReason: string | null;
  revisionDetail: string | null;
  revisionDeadline: string | null;
  approver: TaskUser;
  createdAt: string;
}

// 問題類型
type QuestionType = "TEXT" | "RADIO" | "CHECKBOX";

// 問題觸發條件
interface QuestionTrigger {
  answer: string;
  taskTypeId: number;
}

interface ReminderSetting {
  answer: string;
  message: string;
}

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
  triggers?: QuestionTrigger[];
  reminders?: ReminderSetting[];
  explanations?: ExplanationSetting[];
}

// 流程關聯
interface TaskTypeFlow {
  id: number;
  fromTaskTypeId: number;
  toTaskTypeId: number;
  label: string | null;
  condition: { questionId?: string; answer?: string } | null;
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
  outgoingFlows: TaskTypeFlow[];
}

// 簡化的任務（用於父子關聯）
interface SimpleAdminTask {
  id: number;
  taskNo: string;
  title: string;
  status: string;
  taskType: TaskType;
  createdAt: string;
}

interface AdminTask {
  id: number;
  taskNo: string;
  taskType: TaskType;
  title: string;
  // 任務關聯
  parentTaskId: number | null;
  parentTask: SimpleAdminTask | null;
  childTasks: SimpleAdminTask[];
  groupId: string | null;
  // 關聯人員
  applicant: TaskUser;
  applicantName: string | null;
  processor: TaskUser | null;
  processorName: string | null;
  approver: TaskUser | null;
  applicationDate: string;
  deadline: string | null;
  receivedAt: string | null;
  completedAt: string | null;
  status: string;
  approvalRoute: string;
  approvalMark: string | null;
  payload: Record<string, unknown>;
  // 複審確認
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewers: TaskUser[];
  notes: string | null;
  attachments: AdminTaskAttachment[];
  approvalRecords: ApprovalRecord[];
  createdAt: string;
  updatedAt: string;
}

interface AdminTaskStats {
  total: number;
  pending: number;
  processing: number;
  pendingDocuments: number;
  approved: number;
  rejected: number;
  completed: number;
  overdue: number;
}

interface PageInfo {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 狀態映射
const statusLabels: Record<string, { label: string; className: string }> = {
  PENDING: { label: "待處理", className: "bg-yellow-100 text-yellow-800" },
  PROCESSING: { label: "處理中", className: "bg-blue-100 text-blue-800" },
  PENDING_DOCUMENTS: { label: "待補件", className: "bg-orange-100 text-orange-800" },
  PENDING_REVIEW: { label: "待複審", className: "bg-purple-100 text-purple-800" },
  REVISION_REQUESTED: { label: "要求修改", className: "bg-pink-100 text-pink-800" },
  APPROVED: { label: "已批准", className: "bg-green-100 text-green-800" },
  REJECTED: { label: "已退回", className: "bg-red-100 text-red-800" },
  COMPLETED: { label: "已完成", className: "bg-gray-100 text-gray-800" },
};

function AdminTasksContent() {
  const { data: session, status } = useSession();
  const { getRole, isAdminOrAbove, can, canAny } = usePermission();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { createReminders, completeReminder } = useTaskReminder();
  const { addToast } = useToast();

  // 使用 useMemo 緩存角色檢查結果，避免每次渲染都重新計算
  const userRole = getRole();
  // 允許 ADMIN 或 SUPER_ADMIN 訪問此頁面，或擁有行政任務相關權限的用戶
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const hasAccess = useMemo(() => {
    return isAdminOrAbove() || canAny([
      'admin_task:create',
      'admin_task:read',
      'admin_task:update',
      'admin_task:approve'
    ]);
  }, [userRole]);

  // URL 參數（從提醒跳轉過來時使用）
  const urlCreateTaskType = searchParams.get("createTask");
  const urlSourceTask = searchParams.get("sourceTask");
  const urlReminderId = searchParams.get("reminderId");
  const urlViewTask = searchParams.get("viewTask");

  // 狀態
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [stats, setStats] = useState<AdminTaskStats | null>(null);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [applicantFilter, setApplicantFilter] = useState<string>("all");
  const [applicants, setApplicants] = useState<{ id: string; name: string | null; email: string }[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  // 模態框狀態
  const [selectedTask, setSelectedTask] = useState<AdminTask | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // 創建表單狀態
  const [createForm, setCreateForm] = useState({
    taskTypeId: 0,
    title: "",
    applicantName: "", // 自訂申請人名稱
    deadline: "",
    deadlineText: "", // 文字型期限（如：待定、盡快等）
    notes: "",
    payload: {} as Record<string, unknown>,
    parentTaskId: null as number | null, // 父任務 ID（用於關聯任務）
  });
  const [deadlineType, setDeadlineType] = useState<"date" | "text">("date");
  const [creating, setCreating] = useState(false);
  // 自訂問題答案
  const [customAnswers, setCustomAnswers] = useState<Record<string, string | string[]>>({});
  // 補充說明文字（key 格式：questionId_answer）
  const [explanationTexts, setExplanationTexts] = useState<Record<string, string>>({});

  // 審批狀態
  const [approvalAction, setApprovalAction] = useState("");
  const [approvalComment, setApprovalComment] = useState("");
  const [approvalProcessorName, setApprovalProcessorName] = useState(""); // 負責人
  const [approving, setApproving] = useState(false);
  // 要求修改專用欄位
  const [revisionReason, setRevisionReason] = useState("");
  const [revisionDetail, setRevisionDetail] = useState("");
  const [revisionDeadline, setRevisionDeadline] = useState("");

  // 觸發任務提示
  const [showTriggerModal, setShowTriggerModal] = useState(false);
  const [triggeredTaskTypes, setTriggeredTaskTypes] = useState<TaskType[]>([]);
  const [lastCreatedTaskId, setLastCreatedTaskId] = useState<number | null>(null);

  // 分組展開狀態
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // 刪除確認狀態
  const [deleting, setDeleting] = useState(false);

  // 重新送出狀態
  const [resubmitting, setResubmitting] = useState(false);
  const [resubmitNotes, setResubmitNotes] = useState("");

  // 複審確認狀態
  const [togglingReviewId, setTogglingReviewId] = useState<number | null>(null);

  // 獲取資料
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 獲取統計
      const statsQuery = `
        query {
          adminTaskStats {
            total
            pending
            processing
            pendingDocuments
            approved
            rejected
            completed
            overdue
          }
        }
      `;

      // 獲取任務類型
      const taskTypesQuery = `
        query {
          taskTypes {
            id
            code
            label
            description
            titlePlaceholder
            order
            isActive
            outgoingFlows {
              id
              fromTaskTypeId
              toTaskTypeId
              label
              condition {
                questionId
                answer
              }
            }
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

      // 獲取用戶列表（用於申請人篩選）
      const usersQuery = `
        query {
          users {
            users {
              id
              name
              email
            }
          }
        }
      `;

      // 獲取任務列表
      const tasksQuery = `
        query AdminTasks($page: Int, $pageSize: Int, $status: AdminTaskStatus, $taskTypeId: Int, $applicantId: String) {
          adminTasks(page: $page, pageSize: $pageSize, status: $status, taskTypeId: $taskTypeId, applicantId: $applicantId) {
            items {
              id
              taskNo
              taskType {
                id
                code
                label
                questions {
                  id
                  label
                  type
                  options
                  required
                }
              }
              title
              parentTaskId
              parentTask {
                id
                taskNo
                title
                status
                taskType {
                  id
                  code
                  label
                }
                createdAt
              }
              childTasks {
                id
                taskNo
                title
                status
                taskType {
                  id
                  code
                  label
                }
                createdAt
              }
              groupId
              applicant {
                id
                name
                email
                role
              }
              applicantName
              processor {
                id
                name
                email
                role
              }
              processorName
              approver {
                id
                name
                email
                role
              }
              applicationDate
              deadline
              receivedAt
              completedAt
              status
              approvalRoute
              approvalMark
              reviewedAt
              reviewedBy
              reviewers {
                id
                name
                email
                role
              }
              payload
              notes
              attachments {
                id
                filename
                originalName
                mimeType
                size
                url
                createdAt
              }
              approvalRecords {
                id
                action
                comment
                revisionReason
                revisionDetail
                revisionDeadline
                approver {
                  id
                  name
                  email
                  role
                }
                createdAt
              }
              createdAt
              updatedAt
            }
            pageInfo {
              total
              page
              pageSize
              totalPages
            }
          }
        }
      `;

      const variables: Record<string, unknown> = {
        page: currentPage,
        pageSize: 20,
      };
      if (statusFilter !== "all") variables.status = statusFilter;
      if (typeFilter !== "all") variables.taskTypeId = parseInt(typeFilter, 10);
      if (applicantFilter !== "all") variables.applicantId = applicantFilter;

      // 添加時間戳防止緩存
      const timestamp = Date.now();
      const [statsRes, taskTypesRes, usersRes, tasksRes] = await Promise.all([
        fetch(`/api/graphql?_t=${timestamp}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
          },
          credentials: "include",
          cache: "no-store",
          body: JSON.stringify({ query: statsQuery }),
        }),
        fetch(`/api/graphql?_t=${timestamp}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
          },
          credentials: "include",
          cache: "no-store",
          body: JSON.stringify({ query: taskTypesQuery }),
        }),
        fetch(`/api/graphql?_t=${timestamp}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
          },
          credentials: "include",
          cache: "no-store",
          body: JSON.stringify({ query: usersQuery }),
        }),
        fetch(`/api/graphql?_t=${timestamp}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
          },
          credentials: "include",
          cache: "no-store",
          body: JSON.stringify({ query: tasksQuery, variables }),
        }),
      ]);

      if (!statsRes.ok || !taskTypesRes.ok || !usersRes.ok || !tasksRes.ok) {
        throw new Error(`HTTP 錯誤: ${statsRes.status || taskTypesRes.status || usersRes.status || tasksRes.status}`);
      }

      const [statsData, taskTypesData, usersData, tasksData] = await Promise.all([
        statsRes.json(),
        taskTypesRes.json(),
        usersRes.json(),
        tasksRes.json(),
      ]);

      if (statsData.errors) {
        console.error("GraphQL Stats Error:", statsData.errors);
        throw new Error(statsData.errors[0].message);
      }
      if (taskTypesData.errors) {
        console.error("GraphQL TaskTypes Error:", taskTypesData.errors);
        throw new Error(taskTypesData.errors[0].message);
      }
      if (usersData.errors) {
        console.error("GraphQL Users Error:", usersData.errors);
        throw new Error(usersData.errors[0].message);
      }
      if (tasksData.errors) {
        console.error("GraphQL Tasks Error:", tasksData.errors);
        throw new Error(tasksData.errors[0].message);
      }

      setStats(statsData.data.adminTaskStats);
      setTaskTypes(taskTypesData.data.taskTypes);
      setApplicants(usersData.data.users.users);
      setTasks(tasksData.data.adminTasks.items);
      setPageInfo(tasksData.data.adminTasks.pageInfo);
    } catch (err) {
      console.error("載入資料失敗：", err);
      const errorMessage = err instanceof Error ? err.message : "未知錯誤";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, applicantFilter, currentPage]);

  // 使用穩定的依賴項避免無限循環
  useEffect(() => {
    if (status === "authenticated" && hasAccess) {
      fetchData();
    }
  }, [status, hasAccess, fetchData]);

  // 處理 URL 參數（從提醒跳轉過來時自動打開創建對話框）
  useEffect(() => {
    if (urlCreateTaskType && taskTypes.length > 0 && !showCreateModal) {
      const taskTypeId = parseInt(urlCreateTaskType, 10);
      const taskType = taskTypes.find((t) => Number(t.id) === taskTypeId);
      if (taskType) {
        setCreateForm((prev) => ({
          ...prev,
          taskTypeId,
          applicantName: session?.user?.name || "",
          parentTaskId: urlSourceTask ? parseInt(urlSourceTask, 10) : null,
        }));
        setShowCreateModal(true);
        // 清除 URL 參數
        router.replace("/admin/admin-tasks", { scroll: false });
      }
    }
  }, [urlCreateTaskType, urlSourceTask, taskTypes, showCreateModal, session?.user?.name, router]);

  // 處理 viewTask URL 參數（從待修改通知跳轉過來時使用）
  useEffect(() => {
    if (urlViewTask && tasks.length > 0 && !showDetailModal) {
      const taskId = parseInt(urlViewTask, 10);
      const task = tasks.find((t) => Number(t.id) === taskId);
      if (task) {
        setSelectedTask(task);
        setShowDetailModal(true);
        // 清除 URL 參數
        router.replace("/admin/admin-tasks", { scroll: false });
      }
    }
  }, [urlViewTask, tasks, showDetailModal, router]);

  // 獲取當前選擇類型的問題（注意：GraphQL ID 可能是字符串）
  const selectedTaskType = taskTypes.find((t) => Number(t.id) === createForm.taskTypeId);
  const currentQuestions = selectedTaskType?.questions || [];

  // 處理任務分組（將關聯任務分組顯示）
  const groupedTasks = useMemo(() => {
    // 先找出所有有群組的任務
    const groups = new Map<string, AdminTask[]>();
    const processedIds = new Set<number>();

    // 第一步：找出所有群組
    for (const task of tasks) {
      if (task.groupId) {
        const existing = groups.get(task.groupId) || [];
        existing.push(task);
        groups.set(task.groupId, existing);
        processedIds.add(task.id);
      }
    }

    // 第二步：對每個群組按時間排序，最早的作為主任務
    const result: { type: "single" | "group"; task: AdminTask; children?: AdminTask[] }[] = [];

    for (const [, groupTasks] of groups) {
      // 按創建時間排序
      groupTasks.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const mainTask = groupTasks[0];
      const childTasks = groupTasks.slice(1);
      result.push({
        type: "group",
        task: mainTask,
        children: childTasks,
      });
    }

    // 第三步：添加獨立任務
    for (const task of tasks) {
      if (!processedIds.has(task.id)) {
        result.push({ type: "single", task });
      }
    }

    // 按創建時間倒序排列
    result.sort((a, b) => new Date(b.task.createdAt).getTime() - new Date(a.task.createdAt).getTime());

    return result;
  }, [tasks]);

  // 切換群組展開狀態
  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // 創建任務
  const handleCreateTask = async () => {
    if (!createForm.taskTypeId) {
      alert("請選擇申請類型");
      return;
    }
    if (!createForm.title.trim()) {
      alert("請輸入任務標題");
      return;
    }

    // 驗證必填問題
    for (const question of currentQuestions) {
      if (question.required) {
        const answer = customAnswers[question.id];
        if (!answer || (Array.isArray(answer) && answer.length === 0) || (typeof answer === "string" && !answer.trim())) {
          alert(`請填寫必填問題：${question.label}`);
          return;
        }
      }
    }

    setCreating(true);
    try {
      const mutation = `
        mutation CreateAdminTask($input: CreateAdminTaskInput!) {
          createAdminTask(input: $input) {
            id
            taskNo
            groupId
          }
        }
      `;

      // 根據期限類型決定發送的值
      const deadlineValue = deadlineType === "date"
        ? (createForm.deadline || null)
        : (createForm.deadlineText || null);

      // 合併 payload，包含自訂問題答案和補充說明
      const payload = {
        ...createForm.payload,
        ...(deadlineType === "text" && createForm.deadlineText && { deadlineText: createForm.deadlineText }),
        customAnswers: customAnswers,
        explanationTexts: explanationTexts,
      };

      const variables = {
        input: {
          taskTypeId: Number(createForm.taskTypeId),
          title: createForm.title,
          applicantName: createForm.applicantName || null,
          deadline: deadlineType === "date" ? deadlineValue : null,
          payload: payload,
          notes: createForm.notes || null,
          parentTaskId: createForm.parentTaskId ? Number(createForm.parentTaskId) : null,
        },
      };

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

      const createdTaskId = Number(data.data.createAdminTask.id);
      const taskNo = data.data.createAdminTask.taskNo;

      // 檢查是否有觸發補件提醒
      const triggeredReminders: string[] = [];
      for (const question of currentQuestions) {
        if (question.reminders && question.reminders.length > 0) {
          const answer = customAnswers[question.id];
          for (const reminder of question.reminders) {
            if (typeof answer === "string" && answer === reminder.answer) {
              triggeredReminders.push(reminder.message);
            } else if (Array.isArray(answer) && answer.includes(reminder.answer)) {
              triggeredReminders.push(reminder.message);
            }
          }
        }
      }

      // 如果有觸發補件提醒，更新任務狀態為待補件
      if (triggeredReminders.length > 0) {
        try {
          const updateStatusMutation = `
            mutation ApproveTask($input: ApprovalInput!) {
              approveTask(input: $input) {
                id
                status
              }
            }
          `;
          await fetch("/api/graphql", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              query: updateStatusMutation,
              variables: {
                input: {
                  taskId: createdTaskId,
                  action: "pending_documents",
                  comment: `補件提醒：${triggeredReminders.join("；")}`,
                },
              },
            }),
          });
        } catch (e) {
          console.error("更新任務狀態失敗:", e);
        }
      }

      // 檢查是否有觸發的後續流程
      const triggeredTypes: TaskType[] = [];

      if (selectedTaskType?.outgoingFlows) {
        for (const flow of selectedTaskType.outgoingFlows) {
          const targetType = taskTypes.find(t => Number(t.id) === flow.toTaskTypeId);
          if (!targetType) continue;

          // 已經添加過的跳過
          if (triggeredTypes.some(t => t.id === targetType.id)) continue;

          // 無條件流程（固定流程）
          if (!flow.condition) {
            triggeredTypes.push(targetType);
            continue;
          }

          // 有條件流程：檢查問題答案
          if (flow.condition.questionId && flow.condition.answer) {
            const answer = customAnswers[flow.condition.questionId];
            // 判斷答案是否符合觸發條件
            if (typeof answer === "string" && answer === flow.condition.answer) {
              triggeredTypes.push(targetType);
            } else if (Array.isArray(answer) && answer.includes(flow.condition.answer)) {
              triggeredTypes.push(targetType);
            }
          }
        }
      }

      // 也檢查問題內嵌的觸發條件（現在支援多個觸發）
      for (const question of currentQuestions) {
        if (question.triggers && question.triggers.length > 0) {
          const answer = customAnswers[question.id];
          // 檢查每個觸發條件
          for (const trigger of question.triggers) {
            // 判斷答案是否符合觸發條件
            if (typeof answer === "string" && answer === trigger.answer) {
              const triggeredType = taskTypes.find(t => Number(t.id) === trigger.taskTypeId);
              if (triggeredType && !triggeredTypes.some(t => t.id === triggeredType.id)) {
                triggeredTypes.push(triggeredType);
              }
            } else if (Array.isArray(answer) && answer.includes(trigger.answer)) {
              const triggeredType = taskTypes.find(t => Number(t.id) === trigger.taskTypeId);
              if (triggeredType && !triggeredTypes.some(t => t.id === triggeredType.id)) {
                triggeredTypes.push(triggeredType);
              }
            }
          }
        }
      }

      // 如果是從提醒跳轉過來創建的任務，標記提醒為已完成
      if (urlReminderId) {
        const reminderId = parseInt(urlReminderId, 10);
        if (!isNaN(reminderId)) {
          try {
            await completeReminder(reminderId, createdTaskId);
          } catch (e) {
            console.error("標記提醒完成失敗:", e);
          }
        }
      }

      // 關閉創建模態框，重置表單
      setShowCreateModal(false);
      setCreateForm({
        taskTypeId: taskTypes.length > 0 ? Number(taskTypes[0].id) : 0,
        title: "",
        applicantName: "",
        deadline: "",
        deadlineText: "",
        notes: "",
        payload: {},
        parentTaskId: null,
      });
      setDeadlineType("date");
      setCustomAnswers({});
      setExplanationTexts({});
      fetchData();

      // 顯示補件提醒 Toast（如果有）
      if (triggeredReminders.length > 0) {
        triggeredReminders.forEach((message) => {
          addToast({
            type: "documentReminder",
            title: "補件提醒",
            message: message,
            duration: 8000, // 8 秒後自動關閉
          });
        });
        // 額外顯示一個狀態更新的提示
        addToast({
          type: "warning",
          title: "任務狀態已更新",
          message: "任務已自動設為「待補件」狀態",
          duration: 5000,
        });
      }

      // 如果有觸發的任務類型，顯示提示模態框
      if (triggeredTypes.length > 0) {
        setLastCreatedTaskId(createdTaskId);
        setTriggeredTaskTypes(triggeredTypes);
        setShowTriggerModal(true);
      } else {
        // 沒有觸發任務時才顯示成功 alert
        alert(`任務創建成功！編號：${taskNo}`);
      }
    } catch (error) {
      console.error("創建失敗：", error);
      alert(`創建失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
    } finally {
      setCreating(false);
    }
  };

  // 審批操作
  const handleApproval = async () => {
    if (!selectedTask || !approvalAction) {
      alert("請選擇審批操作");
      return;
    }

    setApproving(true);
    try {
      // 執行審批操作
      const mutation = `
        mutation ApproveTask($input: ApprovalInput!) {
          approveTask(input: $input) {
            id
            status
            approvalMark
          }
        }
      `;

      const variables = {
        input: {
          taskId: typeof selectedTask.id === "string" ? parseInt(selectedTask.id, 10) : selectedTask.id,
          action: approvalAction,
          comment: approvalComment || null,
          // 要求修改專用欄位
          revisionReason: approvalAction === "request_revision" ? revisionReason || null : null,
          revisionDetail: approvalAction === "request_revision" ? revisionDetail || null : null,
          revisionDeadline: approvalAction === "request_revision" ? revisionDeadline || null : null,
        },
      };

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

      alert("審批操作成功！");
      setShowDetailModal(false);
      setApprovalAction("");
      setApprovalComment("");
      setApprovalProcessorName("");
      // 清除要求修改專用欄位
      setRevisionReason("");
      setRevisionDetail("");
      setRevisionDeadline("");
      fetchData();
    } catch (error) {
      console.error("審批失敗：", error);
      alert(`審批失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
    } finally {
      setApproving(false);
    }
  };

  // 重新送出案件（申請人修改後重新提交）
  const handleResubmit = async () => {
    if (!selectedTask) return;

    if (!confirm("確定要重新送出此案件嗎？案件將重新進入審批流程。")) {
      return;
    }

    setResubmitting(true);
    try {
      const mutation = `
        mutation ResubmitTask($input: ResubmitTaskInput!) {
          resubmitTask(input: $input) {
            id
            status
          }
        }
      `;

      const variables = {
        input: {
          taskId: typeof selectedTask.id === "string" ? parseInt(selectedTask.id, 10) : selectedTask.id,
          notes: resubmitNotes || null,
        },
      };

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

      alert("案件已重新送出！");
      setShowDetailModal(false);
      setResubmitNotes("");
      fetchData();
    } catch (error) {
      console.error("重新送出失敗：", error);
      alert(`重新送出失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
    } finally {
      setResubmitting(false);
    }
  };

  // 刪除任務
  const handleDeleteTask = async (taskId: number) => {
    if (!confirm("確定要刪除此任務嗎？此操作無法復原。")) {
      return;
    }

    setDeleting(true);
    try {
      const mutation = `
        mutation DeleteAdminTask($id: Int!) {
          deleteAdminTask(id: $id)
        }
      `;

      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ query: mutation, variables: { id: Number(taskId) } }),
      });

      const data = await res.json();

      if (data.errors) {
        throw new Error(data.errors[0].message);
      }

      // 先刷新數據再顯示提示
      await fetchData();
      alert("任務已刪除");
    } catch (error) {
      console.error("刪除失敗：", error);
      alert(`刪除失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
    } finally {
      setDeleting(false);
    }
  };

  // 處理複審確認打勾
  const handleToggleReviewCheck = async (task: AdminTask, checked: boolean) => {
    setTogglingReviewId(task.id);
    try {
      const mutation = `
        mutation ToggleReviewCheck($taskId: Int!, $checked: Boolean!) {
          toggleReviewCheck(taskId: $taskId, checked: $checked) {
            id
            reviewedAt
            reviewedBy
            status
            completedAt
          }
        }
      `;

      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          query: mutation,
          variables: { taskId: Number(task.id), checked },
        }),
      });

      const data = await res.json();

      if (data.errors) {
        throw new Error(data.errors[0].message);
      }

      // 更新本地狀態（包含狀態變更）
      const oldStatus = task.status;
      const newStatus = data.data.toggleReviewCheck.status;

      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? {
                ...t,
                reviewedAt: data.data.toggleReviewCheck.reviewedAt,
                reviewedBy: data.data.toggleReviewCheck.reviewedBy,
                status: newStatus,
                completedAt: data.data.toggleReviewCheck.completedAt,
              }
            : t
        )
      );

      // 更新統計數據
      if (oldStatus !== newStatus && stats) {
        setStats((prev) => {
          if (!prev) return prev;
          const updated = { ...prev };

          // 減少舊狀態計數
          if (oldStatus === "APPROVED") updated.approved = Math.max(0, updated.approved - 1);
          else if (oldStatus === "COMPLETED") updated.completed = Math.max(0, updated.completed - 1);
          else if (oldStatus === "PENDING") updated.pending = Math.max(0, updated.pending - 1);
          else if (oldStatus === "PROCESSING") updated.processing = Math.max(0, updated.processing - 1);

          // 增加新狀態計數
          if (newStatus === "APPROVED") updated.approved = updated.approved + 1;
          else if (newStatus === "COMPLETED") updated.completed = updated.completed + 1;
          else if (newStatus === "PENDING") updated.pending = updated.pending + 1;
          else if (newStatus === "PROCESSING") updated.processing = updated.processing + 1;

          return updated;
        });
      }
    } catch (error) {
      console.error("複審確認失敗：", error);
      alert(`操作失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
    } finally {
      setTogglingReviewId(null);
    }
  };

  // 格式化日期
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 格式化期限日期（簡短格式）
  const formatDeadlineDate = (dateString: string | null) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("zh-TW", {
      month: "2-digit",
      day: "2-digit",
    });
  };

  // 計算期限緊急程度（動態計算，每次渲染都會重新計算）
  // 2天內 → 紅色, 2-3天 → 黃色, 3天以上 → 藍色
  const getDeadlineUrgency = (deadline: string | null): "urgent" | "warning" | "normal" | null => {
    if (!deadline) return null;

    // 只比較日期，不考慮時間
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const deadlineDate = new Date(deadline);
    const deadlineStart = new Date(deadlineDate.getFullYear(), deadlineDate.getMonth(), deadlineDate.getDate());

    const diffDays = Math.round((deadlineStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));

    // 2天內（包含已過期、今天、明天）→ 紅色
    if (diffDays < 2) return "urgent";
    // 2-3天（後天、大後天）→ 黃色
    if (diffDays <= 3) return "warning";
    // 4天以上 → 藍色
    return "normal";
  };

  // 獲取期限樣式
  const getDeadlineStyle = (urgency: "urgent" | "warning" | "normal" | null) => {
    switch (urgency) {
      case "urgent":
        return "bg-red-100 text-red-800";
      case "warning":
        return "bg-yellow-100 text-yellow-800";
      case "normal":
        return "bg-blue-100 text-blue-800";
      default:
        return "text-gray-600";
    }
  };

  // 獲取狀態標籤
  const getStatusBadge = (status: string) => {
    const badge = statusLabels[status] || statusLabels.PENDING;
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.className}`}
      >
        {badge.label}
      </span>
    );
  };

  // 載入中
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

  // 權限不足
  if (!hasAccess) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md">
            <span className="text-6xl mb-4 block">🔒</span>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">權限不足</h1>
            <p className="text-gray-600 mb-6">
              您沒有權限訪問行政事務管理頁面
            </p>
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
        <div className="mb-4 md:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-gray-900 mb-1 md:mb-2">
              行政事務管理
            </h1>
            <p className="text-sm md:text-base text-gray-600">管理所有行政申請單與審批流程</p>
          </div>
          <button
            onClick={() => {
              // 自動帶入當前登入用戶名稱作為申請人
              setCreateForm((prev) => ({
                ...prev,
                applicantName: session?.user?.name || "",
              }));
              setShowCreateModal(true);
            }}
            className="w-full sm:w-auto px-4 py-3 md:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors flex items-center justify-center gap-2 min-h-[48px] md:min-h-0 text-base md:text-sm font-medium"
          >
            <span>+</span>
            新增申請
          </button>
        </div>

        {/* 統計卡片 */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 md:gap-4 mb-4 md:mb-8">
            <div className="bg-white rounded-xl shadow-md p-2 md:p-4 border-l-4 border-blue-500">
              <p className="text-xs md:text-sm text-gray-600 mb-0.5 md:mb-1">總計</p>
              <p className="text-lg md:text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="bg-white rounded-xl shadow-md p-2 md:p-4 border-l-4 border-yellow-500">
              <p className="text-xs md:text-sm text-gray-600 mb-0.5 md:mb-1">待處理</p>
              <p className="text-lg md:text-2xl font-bold text-yellow-600">
                {stats.pending}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-md p-2 md:p-4 border-l-4 border-blue-600">
              <p className="text-xs md:text-sm text-gray-600 mb-0.5 md:mb-1">處理中</p>
              <p className="text-lg md:text-2xl font-bold text-blue-600">
                {stats.processing}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-md p-2 md:p-4 border-l-4 border-orange-400">
              <p className="text-xs md:text-sm text-gray-600 mb-0.5 md:mb-1">待補件</p>
              <p className="text-lg md:text-2xl font-bold text-orange-500">
                {stats.pendingDocuments}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-md p-2 md:p-4 border-l-4 border-green-500">
              <p className="text-xs md:text-sm text-gray-600 mb-0.5 md:mb-1">已批准</p>
              <p className="text-lg md:text-2xl font-bold text-green-600">
                {stats.approved}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-md p-2 md:p-4 border-l-4 border-red-500">
              <p className="text-xs md:text-sm text-gray-600 mb-0.5 md:mb-1">已退回</p>
              <p className="text-lg md:text-2xl font-bold text-red-600">
                {stats.rejected}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-md p-2 md:p-4 border-l-4 border-gray-500">
              <p className="text-xs md:text-sm text-gray-600 mb-0.5 md:mb-1">已完成</p>
              <p className="text-lg md:text-2xl font-bold text-gray-600">
                {stats.completed}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-md p-2 md:p-4 border-l-4 border-purple-500">
              <p className="text-xs md:text-sm text-gray-600 mb-0.5 md:mb-1">逾期</p>
              <p className="text-lg md:text-2xl font-bold text-purple-600">
                {stats.overdue}
              </p>
            </div>
          </div>
        )}

        {/* 篩選器 */}
        <div className="bg-white rounded-xl shadow-md p-3 md:p-4 mb-4 md:mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
            {/* 狀態篩選 */}
            <div>
              <label className="block text-xs md:text-sm text-gray-600 mb-1">狀態</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2.5 md:py-1.5 border border-gray-300 rounded-lg text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">全部</option>
                <option value="PENDING">待處理</option>
                <option value="PROCESSING">處理中</option>
                <option value="PENDING_DOCUMENTS">待補件</option>
                <option value="PENDING_REVIEW">待複審</option>
                <option value="REVISION_REQUESTED">要求修改</option>
                <option value="APPROVED">已批准</option>
                <option value="REJECTED">已退回</option>
                <option value="COMPLETED">已完成</option>
              </select>
            </div>

            {/* 類型篩選 */}
            <div>
              <label className="block text-xs md:text-sm text-gray-600 mb-1">類型</label>
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2.5 md:py-1.5 border border-gray-300 rounded-lg text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">全部</option>
                {taskTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 申請人篩選 */}
            <div>
              <label className="block text-xs md:text-sm text-gray-600 mb-1">申請人</label>
              <select
                value={applicantFilter}
                onChange={(e) => {
                  setApplicantFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2.5 md:py-1.5 border border-gray-300 rounded-lg text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">全部</option>
                {applicants.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.email}
                  </option>
                ))}
              </select>
            </div>
          </div>
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

        {/* 任務列表 */}
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">載入中...</p>
          </div>
        ) : error ? null : tasks.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-16 text-center">
            <span className="text-6xl mb-4 block">📋</span>
            <p className="text-xl text-gray-900 font-semibold mb-2">
              尚無行政任務
            </p>
            <p className="text-gray-600">點擊右上角「新增申請」開始創建任務</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            {/* 手機版卡片視圖 */}
            <div className="md:hidden divide-y divide-gray-200">
              {groupedTasks.map((item) => (
                <div key={`mobile-${item.task.id}`} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {item.type === "group" && item.children && item.children.length > 0 && (
                          <button
                            onClick={() => item.task.groupId && toggleGroup(item.task.groupId)}
                            className="p-1 hover:bg-gray-200 rounded transition-colors text-gray-500 text-xs"
                          >
                            {item.task.groupId && expandedGroups.has(item.task.groupId) ? "▼" : "▶"}
                          </button>
                        )}
                        <span className="text-base font-medium text-gray-900 truncate">{item.task.title}</span>
                      </div>
                      {item.type === "group" && item.children && item.children.length > 0 && (
                        <span className="text-xs text-blue-600 font-medium">📎 {item.children.length + 1} 個關聯</span>
                      )}
                    </div>
                    {getStatusBadge(item.task.status)}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div>
                      <span className="text-gray-500">類型：</span>
                      <span className="text-gray-900">{item.task.taskType?.label || "未知"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">申請人：</span>
                      <span className="text-gray-900">{item.task.applicantName || item.task.applicant?.name || "-"}</span>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => {
                        setSelectedTask(item.task);
                        setApprovalProcessorName(item.task.processorName || "");
                        setShowDetailModal(true);
                      }}
                      className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg min-h-[44px] active:bg-blue-100"
                    >
                      查看詳情
                    </button>
                    {userRole === "SUPER_ADMIN" && (
                      <button
                        onClick={() => handleDeleteTask(item.task.id)}
                        disabled={deleting}
                        className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg min-h-[44px] active:bg-red-100 disabled:opacity-50"
                      >
                        刪除
                      </button>
                    )}
                  </div>
                  {/* 展開的子任務 */}
                  {item.type === "group" && item.task.groupId && expandedGroups.has(item.task.groupId) && item.children?.map((childTask) => {
                    const fullChildTask = tasks.find(t => t.id === childTask.id) as AdminTask | undefined;
                    return (
                      <div key={`mobile-child-${childTask.id}`} className="mt-3 ml-4 p-3 bg-gray-50 rounded-lg border-l-2 border-gray-300">
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">{childTask.title}</span>
                          {getStatusBadge(childTask.status)}
                        </div>
                        <button
                          onClick={() => {
                            if (fullChildTask) {
                              setSelectedTask(fullChildTask);
                              setApprovalProcessorName(fullChildTask.processorName || "");
                              setShowDetailModal(true);
                            }
                          }}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          查看詳情
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* 桌面版表格 */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      標題
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                      類型
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                      申請人
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                      狀態
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                      完成期限
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                      申請時間
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                      複審
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {groupedTasks.map((item) => (
                    <React.Fragment key={`group-${item.task.id}`}>
                      {/* 主任務行 */}
                      <tr
                        className={`hover:bg-gray-50 ${item.type === "group" ? "bg-blue-50/50" : ""}`}
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            {/* 展開/收起按鈕（僅群組顯示） */}
                            {item.type === "group" && item.children && item.children.length > 0 && (
                              <button
                                onClick={() => item.task.groupId && toggleGroup(item.task.groupId)}
                                className="p-1 hover:bg-gray-200 rounded transition-colors text-gray-500"
                              >
                                {item.task.groupId && expandedGroups.has(item.task.groupId) ? "▼" : "▶"}
                              </button>
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900 max-w-[180px] truncate">
                                {item.task.title}
                              </div>
                              {/* 群組標記 */}
                              {item.type === "group" && item.children && item.children.length > 0 && (
                                <span className="text-xs text-blue-600 font-medium">
                                  📎 {item.children.length + 1} 個關聯
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                            {item.task.taskType?.label || "未知類型"}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 max-w-[80px] truncate">
                            {item.task.applicantName ||
                              item.task.applicant?.name ||
                              item.task.applicant?.email}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {getStatusBadge(item.task.status)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {(() => {
                            const deadline = item.task.deadline;
                            const deadlineText = item.task.payload?.deadlineText as string;
                            if (!deadline && !deadlineText) {
                              return <span className="text-sm text-gray-400">-</span>;
                            }
                            if (deadlineText && !deadline) {
                              return <span className="text-sm text-gray-600">{deadlineText}</span>;
                            }
                            const urgency = getDeadlineUrgency(deadline);
                            return (
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getDeadlineStyle(urgency)}`}>
                                {formatDeadlineDate(deadline)}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">
                            {formatDeadlineDate(item.task.applicationDate)}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          {/* 複審確認 checkbox */}
                          {(() => {
                            const isReviewer = item.task.reviewers?.some(
                              (r) => r.id === session?.user?.id
                            );
                            const isSuperAdmin = userRole === "SUPER_ADMIN";
                            const isChecked = !!item.task.reviewedAt;
                            const isLoading = togglingReviewId === item.task.id;
                            // 只有已批准或已完成狀態才能操作 checkbox
                            const isApprovedOrCompleted = item.task.status === "APPROVED" || item.task.status === "COMPLETED";
                            const canCheck = (isReviewer || isSuperAdmin) && isApprovedOrCompleted;

                            // 沒有複審人時不顯示
                            if (!item.task.reviewers || item.task.reviewers.length === 0) {
                              return <span className="text-gray-300">-</span>;
                            }

                            // 顯示 checkbox（有複審人就顯示，但只有已批准狀態才能操作）
                            return (
                              <div className="flex items-center justify-center">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  disabled={!canCheck || isLoading}
                                  onChange={(e) =>
                                    handleToggleReviewCheck(item.task, e.target.checked)
                                  }
                                  className={`w-5 h-5 rounded border-2 ${
                                    canCheck
                                      ? "cursor-pointer text-purple-600 border-purple-300 focus:ring-purple-500"
                                      : "cursor-not-allowed text-gray-400 border-gray-300"
                                  } ${isLoading ? "opacity-50" : ""}`}
                                  title={
                                    !isApprovedOrCompleted
                                      ? "只有已批准狀態才能複審"
                                      : canCheck
                                        ? isChecked
                                          ? "點擊取消複審確認"
                                          : "點擊確認複審"
                                        : "只有複審人可以操作"
                                  }
                                />
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedTask(item.task);
                                setApprovalProcessorName(item.task.processorName || "");
                                setShowDetailModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                            >
                              詳情
                            </button>
                            {userRole === "SUPER_ADMIN" && (
                              <button
                                onClick={() => handleDeleteTask(item.task.id)}
                                disabled={deleting}
                                className="text-red-600 hover:text-red-800 font-medium text-sm disabled:opacity-50"
                              >
                                刪除
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* 子任務行（展開時顯示） */}
                      {item.type === "group" &&
                        item.task.groupId &&
                        expandedGroups.has(item.task.groupId) &&
                        item.children?.map((childTask) => {
                          const fullChildTask = tasks.find(t => t.id === childTask.id) as AdminTask | undefined;
                          return (
                          <tr
                            key={childTask.id}
                            className="bg-gray-50 hover:bg-gray-100"
                          >
                            <td className="px-4 py-3 pl-10">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-400">└</span>
                                <div className="text-sm text-gray-700 max-w-[160px] truncate">
                                  {childTask.title}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded">
                                {childTask.taskType?.label || "未知類型"}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-600 max-w-[80px] truncate">
                                {fullChildTask?.applicantName ||
                                  fullChildTask?.applicant?.name ||
                                  fullChildTask?.applicant?.email ||
                                  "-"}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {getStatusBadge(childTask.status)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {(() => {
                                const deadline = fullChildTask?.deadline;
                                const deadlineText = fullChildTask?.payload?.deadlineText as string;
                                if (!deadline && !deadlineText) {
                                  return <span className="text-sm text-gray-400">-</span>;
                                }
                                if (deadlineText && !deadline) {
                                  return <span className="text-sm text-gray-500">{deadlineText}</span>;
                                }
                                const urgency = getDeadlineUrgency(deadline ?? null);
                                return (
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${getDeadlineStyle(urgency)}`}>
                                    {formatDeadlineDate(deadline ?? null)}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-500">
                                {formatDeadlineDate(childTask.createdAt)}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              {/* 子任務複審確認 checkbox */}
                              {(() => {
                                if (!fullChildTask) return <span className="text-gray-300">-</span>;
                                const isReviewer = fullChildTask.reviewers?.some(
                                  (r) => r.id === session?.user?.id
                                );
                                const isSuperAdmin = userRole === "SUPER_ADMIN";
                                const isChecked = !!fullChildTask.reviewedAt;
                                const isLoading = togglingReviewId === fullChildTask.id;
                                // 只有已批准或已完成狀態才能操作 checkbox
                                const isApprovedOrCompleted = fullChildTask.status === "APPROVED" || fullChildTask.status === "COMPLETED";
                                const canCheck = (isReviewer || isSuperAdmin) && isApprovedOrCompleted;

                                if (!fullChildTask.reviewers || fullChildTask.reviewers.length === 0) {
                                  return <span className="text-gray-300">-</span>;
                                }

                                return (
                                  <div className="flex items-center justify-center">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      disabled={!canCheck || isLoading}
                                      onChange={(e) =>
                                        handleToggleReviewCheck(fullChildTask, e.target.checked)
                                      }
                                      className={`w-5 h-5 rounded border-2 ${
                                        canCheck
                                          ? "cursor-pointer text-purple-600 border-purple-300 focus:ring-purple-500"
                                          : "cursor-not-allowed text-gray-400 border-gray-300"
                                      } ${isLoading ? "opacity-50" : ""}`}
                                      title={
                                        !isApprovedOrCompleted
                                          ? "只有已批准狀態才能複審"
                                          : canCheck
                                            ? isChecked
                                              ? "點擊取消複審確認"
                                              : "點擊確認複審"
                                            : "只有複審人可以操作"
                                      }
                                    />
                                  </div>
                                );
                              })()}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    if (fullChildTask) {
                                      setSelectedTask(fullChildTask);
                                      setApprovalProcessorName(fullChildTask.processorName || "");
                                      setShowDetailModal(true);
                                    }
                                  }}
                                  className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                                >
                                  詳情
                                </button>
                                {userRole === "SUPER_ADMIN" && (
                                  <button
                                    onClick={() => handleDeleteTask(childTask.id)}
                                    disabled={deleting}
                                    className="text-red-600 hover:text-red-800 font-medium text-sm disabled:opacity-50"
                                  >
                                    刪除
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );})}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 分頁 */}
            {pageInfo && pageInfo.totalPages > 1 && (
              <div className="px-4 md:px-6 py-4 border-t flex flex-col md:flex-row items-center justify-between gap-3">
                <p className="text-sm text-gray-600 order-2 md:order-1">
                  共 {pageInfo.total} 筆，第 {pageInfo.page} /{" "}
                  {pageInfo.totalPages} 頁
                </p>
                <div className="flex gap-2 order-1 md:order-2 w-full md:w-auto justify-center">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex-1 md:flex-none px-4 py-2.5 md:py-1.5 border rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 min-h-[44px] md:min-h-0"
                  >
                    上一頁
                  </button>
                  <button
                    onClick={() =>
                      setCurrentPage((p) =>
                        Math.min(pageInfo.totalPages, p + 1)
                      )
                    }
                    disabled={currentPage === pageInfo.totalPages}
                    className="flex-1 md:flex-none px-4 py-2.5 md:py-1.5 border rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 min-h-[44px] md:min-h-0"
                  >
                    下一頁
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 創建任務模態框 */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div
              className={`bg-white rounded-xl shadow-2xl ${
                currentQuestions.length > 0 ? "max-w-5xl" : "max-w-2xl"
              } w-full max-h-[90vh] overflow-y-auto`}
            >
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
                <h2 className="text-xl font-bold text-gray-900">
                  新增行政申請
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  ✕
                </button>
              </div>

              <div
                className={`p-6 ${
                  currentQuestions.length > 0 ? "grid grid-cols-2 gap-6" : ""
                }`}
              >
                {/* 左側：基本資訊 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                    基本資訊
                  </h3>

                  {/* 任務類型 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      申請類型 *
                    </label>
                    <select
                      value={createForm.taskTypeId}
                      onChange={(e) => {
                        const newTypeId = parseInt(e.target.value, 10);
                        setCreateForm({
                          ...createForm,
                          taskTypeId: newTypeId,
                        });
                        // 切換類型時清空答案和補充說明
                        setCustomAnswers({});
                        setExplanationTexts({});
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={0}>請選擇類型</option>
                      {taskTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.label}
                          {type.questions?.length > 0 &&
                            ` (${type.questions.length} 題)`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 標題 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      任務標題 *
                    </label>
                    <input
                      type="text"
                      value={createForm.title}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, title: e.target.value })
                      }
                      placeholder={selectedTaskType?.titlePlaceholder || "請輸入任務標題"}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* 申請人 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      申請人
                    </label>
                    <input
                      type="text"
                      value={createForm.applicantName}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          applicantName: e.target.value,
                        })
                      }
                      placeholder="申請人名稱（已自動帶入當前登入用戶）"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* 完成限期 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      完成限期
                    </label>
                    {/* 類型切換 */}
                    <div className="flex gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => setDeadlineType("date")}
                        className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                          deadlineType === "date"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        選擇日期
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeadlineType("text")}
                        className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                          deadlineType === "text"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        輸入文字
                      </button>
                    </div>
                    {/* 根據類型顯示不同輸入框 */}
                    {deadlineType === "date" ? (
                      <input
                        type="datetime-local"
                        value={createForm.deadline}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            deadline: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <input
                        type="text"
                        value={createForm.deadlineText}
                        onChange={(e) =>
                          setCreateForm({
                            ...createForm,
                            deadlineText: e.target.value,
                          })
                        }
                        placeholder="例如：待定、盡快、下週前..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                  </div>

                  {/* 備註 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      細節
                    </label>
                    <textarea
                      value={createForm.notes}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, notes: e.target.value })
                      }
                      rows={3}
                      placeholder="請輸入細節..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>

                  {/* 如果沒有問題，提交按鈕在這裡 */}
                  {currentQuestions.length === 0 && (
                    <div className="flex gap-3 pt-4 border-t">
                      <button
                        onClick={() => setShowCreateModal(false)}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleCreateTask}
                        disabled={creating}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {creating ? "創建中..." : "確認創建"}
                      </button>
                    </div>
                  )}
                </div>

                {/* 右側：自訂問題 */}
                {currentQuestions.length > 0 && (
                  <div className="space-y-4 border-l pl-6">
                    <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                      類型問題
                      <span className="ml-2 text-sm font-normal text-gray-500">
                        ({currentQuestions.length} 題)
                      </span>
                    </h3>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                      {currentQuestions.map((question, index) => (
                        <div
                          key={question.id}
                          className="space-y-2 bg-gray-50 p-3 rounded-lg"
                        >
                          <label className="block text-sm font-medium text-gray-700">
                            {index + 1}. {question.label}
                            {question.required && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                          </label>

                          {/* 文字回答 */}
                          {question.type === "TEXT" && (
                            <input
                              type="text"
                              value={
                                (customAnswers[question.id] as string) || ""
                              }
                              onChange={(e) =>
                                setCustomAnswers({
                                  ...customAnswers,
                                  [question.id]: e.target.value,
                                })
                              }
                              placeholder="請輸入..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            />
                          )}

                          {/* 單選題 */}
                          {question.type === "RADIO" && (
                            <div className="space-y-2">
                              {question.options.map((option, optIndex) => (
                                <label
                                  key={optIndex}
                                  className="flex items-center gap-2 cursor-pointer"
                                >
                                  <input
                                    type="radio"
                                    name={`question_${question.id}`}
                                    value={option}
                                    checked={
                                      customAnswers[question.id] === option
                                    }
                                    onChange={(e) =>
                                      setCustomAnswers({
                                        ...customAnswers,
                                        [question.id]: e.target.value,
                                      })
                                    }
                                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-700">
                                    {option}
                                  </span>
                                </label>
                              ))}
                            </div>
                          )}

                          {/* 補充說明輸入（當選擇的答案需要補充說明時顯示） */}
                          {question.type === "RADIO" && customAnswers[question.id] && (() => {
                            const selectedAnswer = customAnswers[question.id] as string;
                            const explanation = question.explanations?.find(e => e.answer === selectedAnswer);
                            if (!explanation) return null;
                            const explanationKey = `${question.id}_${selectedAnswer}`;
                            return (
                              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <label className="block text-sm font-medium text-blue-800 mb-2">
                                  📝 {explanation.prompt}
                                </label>
                                <textarea
                                  value={explanationTexts[explanationKey] || ""}
                                  onChange={(e) =>
                                    setExplanationTexts({
                                      ...explanationTexts,
                                      [explanationKey]: e.target.value,
                                    })
                                  }
                                  placeholder="請輸入補充說明..."
                                  rows={3}
                                  className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                                />
                              </div>
                            );
                          })()}

                          {/* 複選題 */}
                          {question.type === "CHECKBOX" && (
                            <div className="space-y-2">
                              {question.options.map((option, optIndex) => {
                                const currentValues =
                                  (customAnswers[question.id] as string[]) ||
                                  [];
                                const isChecked =
                                  currentValues.includes(option);
                                return (
                                  <label
                                    key={optIndex}
                                    className="flex items-center gap-2 cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      value={option}
                                      checked={isChecked}
                                      onChange={(e) => {
                                        let newValues: string[];
                                        if (e.target.checked) {
                                          newValues = [
                                            ...currentValues,
                                            option,
                                          ];
                                        } else {
                                          newValues = currentValues.filter(
                                            (v) => v !== option
                                          );
                                        }
                                        setCustomAnswers({
                                          ...customAnswers,
                                          [question.id]: newValues,
                                        });
                                      }}
                                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700">
                                      {option}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* 提交按鈕 */}
                    <div className="flex gap-3 pt-4 border-t">
                      <button
                        onClick={() => setShowCreateModal(false)}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleCreateTask}
                        disabled={creating}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {creating ? "創建中..." : "確認創建"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 詳情模態框 */}
        {showDetailModal && selectedTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">任務詳情</h2>
                  <p className="text-sm text-gray-600 font-mono">
                    {selectedTask.taskNo}
                  </p>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* 基本資訊 */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    基本資訊
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">類型</p>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedTask.taskType?.label || "未知類型"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">標題</p>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedTask.title}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">狀態</p>
                      {getStatusBadge(selectedTask.status)}
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">申請人</p>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedTask.applicantName ||
                          selectedTask.applicant?.name ||
                          selectedTask.applicant?.email}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">負責人</p>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedTask.processorName ||
                          selectedTask.processor?.name ||
                          selectedTask.processor?.email ||
                          "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">申請時間</p>
                      <p className="text-sm text-gray-900">
                        {formatDate(selectedTask.applicationDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">完成限期</p>
                      <p className="text-sm text-gray-900">
                        {selectedTask.deadline
                          ? formatDate(selectedTask.deadline)
                          : (selectedTask.payload?.deadlineText as string) ||
                            "-"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 細節 */}
                {selectedTask.notes && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      細節
                    </h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {selectedTask.notes}
                      </p>
                    </div>
                  </div>
                )}

                {/* 自訂問題答案 */}
                {(() => {
                  const answers = selectedTask.payload?.customAnswers as
                    | Record<string, string | string[]>
                    | undefined;
                  const taskTypeQuestions =
                    selectedTask.taskType?.questions || [];
                  if (
                    !answers ||
                    Object.keys(answers).length === 0 ||
                    taskTypeQuestions.length === 0
                  ) {
                    return null;
                  }
                  return (
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-4">
                        類型問題回答
                      </h3>
                      <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                        {taskTypeQuestions.map(
                          (question: Question, index: number) => {
                            const answer = answers[question.id];
                            if (
                              answer === undefined ||
                              answer === null ||
                              (Array.isArray(answer) && answer.length === 0) ||
                              answer === ""
                            ) {
                              return null;
                            }
                            return (
                              <div
                                key={question.id}
                                className="border-b border-gray-200 pb-3 last:border-b-0 last:pb-0"
                              >
                                <p className="text-xs text-gray-600 mb-1">
                                  {index + 1}. {question.label}
                                </p>
                                <p className="text-sm font-medium text-gray-900">
                                  {Array.isArray(answer)
                                    ? answer.join("、")
                                    : answer}
                                </p>
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* 審批記錄 */}
                {selectedTask.approvalRecords.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      審批記錄
                    </h3>
                    <div className="space-y-3">
                      {selectedTask.approvalRecords.map((record) => (
                        <div
                          key={record.id}
                          className="bg-gray-50 p-4 rounded-lg"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <span
                                className={`px-2 py-1 text-xs rounded font-medium ${
                                  record.action === "approve"
                                    ? "bg-green-100 text-green-800"
                                    : record.action === "reject"
                                    ? "bg-red-100 text-red-800"
                                    : record.action === "pending_documents"
                                    ? "bg-orange-100 text-orange-800"
                                    : "bg-yellow-100 text-yellow-800"
                                }`}
                              >
                                {record.action === "approve"
                                  ? "批准"
                                  : record.action === "reject"
                                  ? "退回"
                                  : record.action === "pending_documents"
                                  ? "待補件"
                                  : "要求修改"}
                              </span>
                              <span className="ml-2 text-sm text-gray-600">
                                {record.approver?.name ||
                                  record.approver?.email}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {formatDate(record.createdAt)}
                            </span>
                          </div>
                          {record.comment && (
                            <p className="mt-2 text-sm text-gray-700">
                              {record.comment}
                            </p>
                          )}
                          {/* 要求修改詳情 */}
                          {record.action === "request_revision" && (record.revisionReason || record.revisionDetail || record.revisionDeadline) && (
                            <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                              {record.revisionReason && (
                                <div className="flex items-center gap-2 text-sm mb-1">
                                  <span className="font-medium text-yellow-800">原因類別：</span>
                                  <span className="text-gray-700">{record.revisionReason}</span>
                                </div>
                              )}
                              {record.revisionDetail && (
                                <div className="text-sm mb-1">
                                  <span className="font-medium text-yellow-800">修改說明：</span>
                                  <p className="text-gray-700 mt-1">{record.revisionDetail}</p>
                                </div>
                              )}
                              {record.revisionDeadline && (
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="font-medium text-yellow-800">修改期限：</span>
                                  <span className="text-gray-700">{formatDate(record.revisionDeadline)}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 審批操作（僅待處理/處理中狀態且有審批權限才顯示） */}
                {can('admin_task:approve') &&
                  (selectedTask.status === "PENDING" ||
                  selectedTask.status === "PROCESSING" ||
                  selectedTask.status === "PENDING_DOCUMENTS") && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      審批操作
                    </h3>
                    <div className="bg-blue-50 p-4 rounded-lg space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          操作
                        </label>
                        <div className="flex flex-wrap gap-3">
                          <button
                            onClick={() => setApprovalAction("approve")}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              approvalAction === "approve"
                                ? "bg-green-600 text-white"
                                : "bg-white border border-green-600 text-green-600 hover:bg-green-50"
                            }`}
                          >
                            批准
                          </button>
                          <button
                            onClick={() => setApprovalAction("reject")}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              approvalAction === "reject"
                                ? "bg-red-600 text-white"
                                : "bg-white border border-red-600 text-red-600 hover:bg-red-50"
                            }`}
                          >
                            退回
                          </button>
                          <button
                            onClick={() =>
                              setApprovalAction("pending_documents")
                            }
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              approvalAction === "pending_documents"
                                ? "bg-orange-600 text-white"
                                : "bg-white border border-orange-600 text-orange-600 hover:bg-orange-50"
                            }`}
                          >
                            待補件
                          </button>
                          <button
                            onClick={() =>
                              setApprovalAction("request_revision")
                            }
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              approvalAction === "request_revision"
                                ? "bg-yellow-600 text-white"
                                : "bg-white border border-yellow-600 text-yellow-600 hover:bg-yellow-50"
                            }`}
                          >
                            要求修改
                          </button>
                        </div>
                      </div>

                      {/* 要求修改專用欄位 */}
                      {approvalAction === "request_revision" && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-4">
                          <h4 className="font-medium text-yellow-800 flex items-center gap-2">
                            <span>⚠️</span> 修改要求詳情
                          </h4>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              修改原因類別 <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={revisionReason}
                              onChange={(e) => setRevisionReason(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                            >
                              <option value="">請選擇原因類別</option>
                              <option value="資料不完整">資料不完整</option>
                              <option value="格式錯誤">格式錯誤</option>
                              <option value="內容有誤">內容有誤</option>
                              <option value="缺少附件">缺少附件</option>
                              <option value="需補充說明">需補充說明</option>
                              <option value="其他">其他</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              具體修改說明 <span className="text-red-500">*</span>
                            </label>
                            <textarea
                              value={revisionDetail}
                              onChange={(e) => setRevisionDetail(e.target.value)}
                              rows={3}
                              placeholder="請詳細說明需要修改的內容..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 resize-none"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              修改期限 <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="date"
                              value={revisionDeadline}
                              onChange={(e) => setRevisionDeadline(e.target.value)}
                              min={new Date().toISOString().split("T")[0]}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                            />
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          審批意見
                        </label>
                        <textarea
                          value={approvalComment}
                          onChange={(e) => setApprovalComment(e.target.value)}
                          rows={3}
                          placeholder="請輸入審批意見..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                      </div>
                      <button
                        onClick={handleApproval}
                        disabled={
                          !approvalAction ||
                          approving ||
                          (approvalAction === "request_revision" && (!revisionReason || !revisionDetail || !revisionDeadline))
                        }
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {approving ? "處理中..." : "確認審批"}
                      </button>
                    </div>
                  </div>
                )}

                {/* 重新送出區塊（申請人可見，當狀態為要求修改或待補件時） */}
                {selectedTask.applicant?.id === session?.user?.id &&
                  (selectedTask.status === "REVISION_REQUESTED" ||
                  selectedTask.status === "PENDING_DOCUMENTS") && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      重新送出案件
                    </h3>
                    <div className="bg-pink-50 border border-pink-200 p-4 rounded-lg space-y-4">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">📝</span>
                        <div>
                          <p className="font-medium text-pink-800">
                            {selectedTask.status === "REVISION_REQUESTED"
                              ? "此案件需要修改後重新送出"
                              : "此案件需要補件後重新送出"}
                          </p>
                          <p className="text-sm text-pink-600 mt-1">
                            請確認已完成必要的修改或補件，然後點擊下方按鈕重新送出案件。
                          </p>
                        </div>
                      </div>

                      {/* 顯示最新的修改要求（如果有） */}
                      {selectedTask.approvalRecords && selectedTask.approvalRecords.length > 0 && (
                        (() => {
                          const latestRevision = selectedTask.approvalRecords.find(
                            (r: ApprovalRecord) => r.action === "request_revision" || r.action === "pending_documents"
                          );
                          if (latestRevision) {
                            return (
                              <div className="bg-white border border-pink-100 rounded-lg p-3 text-sm">
                                <p className="font-medium text-gray-700 mb-2">審批意見：</p>
                                {latestRevision.revisionReason && (
                                  <p className="text-gray-600">原因類別：{latestRevision.revisionReason}</p>
                                )}
                                {latestRevision.revisionDetail && (
                                  <p className="text-gray-600 mt-1">修改說明：{latestRevision.revisionDetail}</p>
                                )}
                                {latestRevision.revisionDeadline && (
                                  <p className="text-gray-600 mt-1">
                                    期限：{new Date(latestRevision.revisionDeadline).toLocaleDateString("zh-TW")}
                                  </p>
                                )}
                                {latestRevision.comment && !latestRevision.revisionDetail && (
                                  <p className="text-gray-600">{latestRevision.comment}</p>
                                )}
                              </div>
                            );
                          }
                          return null;
                        })()
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          備註說明（選填）
                        </label>
                        <textarea
                          value={resubmitNotes}
                          onChange={(e) => setResubmitNotes(e.target.value)}
                          rows={3}
                          placeholder="說明您所做的修改或補件內容..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                        />
                      </div>

                      <button
                        onClick={handleResubmit}
                        disabled={resubmitting}
                        className="w-full px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      >
                        {resubmitting ? "送出中..." : "確認重新送出"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 觸發任務提示模態框 */}
        {showTriggerModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
              <div className="border-b px-6 py-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-2xl">⚡</span>
                  任務創建成功
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-gray-700">
                  根據您的選擇，系統建議您繼續創建以下關聯任務：
                </p>
                <div className="space-y-2">
                  {triggeredTaskTypes.map((type) => (
                    <div
                      key={type.id}
                      className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{type.label}</p>
                        {type.description && (
                          <p className="text-sm text-gray-600">{type.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          // 關閉提示模態框
                          setShowTriggerModal(false);
                          // 預填選類型和父任務 ID，並打開創建模態框
                          setCreateForm((prev) => ({
                            ...prev,
                            taskTypeId: Number(type.id),
                            applicantName: session?.user?.name || "",
                            parentTaskId: lastCreatedTaskId,
                          }));
                          setShowCreateModal(true);
                        }}
                        className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        創建
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 pt-4 border-t">
                  <button
                    onClick={async () => {
                      console.log("[稍後處理] 點擊，lastCreatedTaskId:", lastCreatedTaskId, "triggeredTaskTypes:", triggeredTaskTypes);
                      // 創建待處理提醒
                      if (lastCreatedTaskId && triggeredTaskTypes.length > 0) {
                        try {
                          const remindersData = triggeredTaskTypes.map((t) => ({
                            taskTypeId: Number(t.id),
                            taskTypeLabel: t.label,
                          }));
                          console.log("[稍後處理] 準備創建提醒:", remindersData);
                          await createReminders(lastCreatedTaskId, remindersData);
                          console.log("[稍後處理] 提醒創建成功");
                        } catch (e) {
                          console.error("[稍後處理] 創建提醒失敗:", e);
                        }
                      } else {
                        console.log("[稍後處理] 條件不符，跳過創建提醒");
                      }
                      setShowTriggerModal(false);
                      setTriggeredTaskTypes([]);
                      setLastCreatedTaskId(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    稍後處理
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

// 載入中的佔位組件
function AdminTasksLoading() {
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

// 使用 Suspense 包裹主組件以支援 useSearchParams
export default function AdminTasksPage() {
  return (
    <Suspense fallback={<AdminTasksLoading />}>
      <AdminTasksContent />
    </Suspense>
  );
}
