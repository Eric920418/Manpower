"use client";
import React, { useState, useEffect, useCallback, useMemo, Suspense, useRef } from "react";
import { useSession } from "next-auth/react";
import { usePermission } from "@/hooks/usePermission";
import { useRouter, useSearchParams } from "next/navigation";
import AdminLayout from "@/components/Admin/AdminLayout";
import { useTaskReminder } from "@/components/Admin/TaskReminderProvider";
import { useToast } from "@/components/UI/Toast";
import { exportToExcel, formatDateForExcel } from "@/lib/exportExcel";

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

// 備註編輯記錄
interface RemarkRecord {
  userId: string;
  userName: string;
  content: string;
  timestamp: string;
}

// 基本資訊變更項目
interface BasicInfoChange {
  field: string;
  fieldLabel: string;
  oldValue: string | null;
  newValue: string | null;
}

// 基本資訊編輯記錄
interface BasicInfoRecord {
  userId: string;
  userName: string;
  changes: BasicInfoChange[];
  timestamp: string;
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
  // 負責人（用於完成確認）
  handlers: TaskUser[];
  // 複審確認
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewers: TaskUser[];
  notes: string | null;
  notesHistory: RemarkRecord[];
  remarks: string | null;
  remarksHistory: RemarkRecord[];
  basicInfoHistory: BasicInfoRecord[];
  attachments: AdminTaskAttachment[];
  approvalRecords: ApprovalRecord[];
  createdAt: string;
  updatedAt: string;
}

interface AdminTaskStats {
  total: number;
  pending: number;
  pendingDocuments: number;
  pendingReview: number;
  revisionRequested: number;
  approved: number;
  rejected: number;
  completed: number;
  reviewed: number;
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
  PENDING_DOCUMENTS: { label: "待補件", className: "bg-orange-100 text-orange-800" },
  PENDING_REVIEW: { label: "待複審", className: "bg-purple-100 text-purple-800" },
  REVISION_REQUESTED: { label: "要求修改", className: "bg-pink-100 text-pink-800" },
  APPROVED: { label: "已批准", className: "bg-green-100 text-green-800" },
  REJECTED: { label: "已退回", className: "bg-red-100 text-red-800" },
  COMPLETED: { label: "已完成", className: "bg-gray-100 text-gray-800" },
  REVIEWED: { label: "已複審", className: "bg-indigo-100 text-indigo-800" },
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
  const urlStatus = searchParams.get("status");

  // 狀態
  const [tasks, setTasks] = useState<AdminTask[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [stats, setStats] = useState<AdminTaskStats | null>(null);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [applicantFilter, setApplicantFilter] = useState<string>("all");
  const [handlerFilter, setHandlerFilter] = useState<string>("all");
  const [searchKeyword, setSearchKeyword] = useState<string>("");
  const [applicants, setApplicants] = useState<{ id: string; name: string | null; email: string }[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  // 我的待處理任務（獨立於篩選條件，用於提醒計算）
  const [myReminderTasks, setMyReminderTasks] = useState<AdminTask[]>([]);

  // 模態框狀態
  const [selectedTask, setSelectedTask] = useState<AdminTask | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // 創建表單狀態
  const [createForm, setCreateForm] = useState({
    taskTypeId: 0,
    title: "",
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

  // 完成確認狀態
  const [togglingCompleteId, setTogglingCompleteId] = useState<number | null>(null);

  // 複審確認狀態
  const [togglingReviewId, setTogglingReviewId] = useState<number | null>(null);

  // 待處理任務提醒面板狀態
  const [showReminderPanel, setShowReminderPanel] = useState(false);

  // 編輯模式狀態（用於「要求修改」狀態時編輯任務）
  const [isEditMode, setIsEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    deadline: "",
    deadlineText: "",
    notes: "",
  });
  const [editDeadlineType, setEditDeadlineType] = useState<"date" | "text">("date");
  const [editCustomAnswers, setEditCustomAnswers] = useState<Record<string, string | string[]>>({});
  const [editExplanationTexts, setEditExplanationTexts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // 備註編輯狀態（詳情彈窗內）
  const [editableRemarks, setEditableRemarks] = useState<string>("");
  const [savingRemarks, setSavingRemarks] = useState(false);

  // 審批記錄展開狀態（追蹤哪些輪次被展開）
  const [expandedApprovalRounds, setExpandedApprovalRounds] = useState<Set<number>>(new Set());

  // 排序狀態
  type SortField = "title" | "type" | "applicant" | "status" | "deadline" | "createdAt";
  type SortOrder = "asc" | "desc";
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // 狀態優先級（用於排序）
  const statusPriority: Record<string, number> = {
    PENDING: 1,
    PENDING_DOCUMENTS: 2,
    REVISION_REQUESTED: 3,
    PENDING_REVIEW: 4,
    APPROVED: 5,
    REJECTED: 6,
    COMPLETED: 7,
    REVIEWED: 8,
  };

  // 切換排序
  const handleSort = (field: SortField) => {
    // 排序變更時重置到第一頁
    setCurrentPage(1);

    if (sortField === field) {
      // 如果點擊同一欄位，切換排序順序
      if (sortOrder === "asc") {
        setSortOrder("desc");
      } else {
        // 第三次點擊取消排序
        setSortField(null);
        setSortOrder("asc");
      }
    } else {
      // 點擊不同欄位，設為新欄位升序
      setSortField(field);
      setSortOrder("asc");
    }
  };

  // 排序圖標
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    if (sortOrder === "asc") {
      return (
        <svg className="w-3 h-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      );
    }
    return (
      <svg className="w-3 h-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

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
            pendingDocuments
            pendingReview
            revisionRequested
            approved
            rejected
            completed
            reviewed
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

      // 獲取用戶列表（用於申請人篩選）- 設置較大的 pageSize 以獲取全部用戶
      const usersQuery = `
        query {
          users(pageSize: 1000) {
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
        query AdminTasks($page: Int, $pageSize: Int, $status: String, $taskTypeId: Int, $applicantId: String, $handlerId: String, $sortBy: String, $sortOrder: String) {
          adminTasks(page: $page, pageSize: $pageSize, status: $status, taskTypeId: $taskTypeId, applicantId: $applicantId, handlerId: $handlerId, sortBy: $sortBy, sortOrder: $sortOrder) {
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
              handlers {
                id
                name
                email
                role
              }
              payload
              notes
              notesHistory {
                userId
                userName
                content
                timestamp
              }
              remarks
              remarksHistory {
                userId
                userName
                content
                timestamp
              }
              basicInfoHistory {
                userId
                userName
                changes {
                  field
                  fieldLabel
                  oldValue
                  newValue
                }
                timestamp
              }
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

      // 獲取我的待處理任務（用於提醒計算，不受篩選條件影響）
      const myReminderTasksQuery = `
        query MyReminderTasks {
          adminTasks(pageSize: 1000) {
            items {
              id
              status
              applicant {
                id
              }
              processor {
                id
              }
              approver {
                id
              }
              handlers {
                id
              }
              reviewers {
                id
              }
              reviewedAt
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
      if (handlerFilter !== "all") variables.handlerId = handlerFilter;

      // 排序參數：將前端欄位名稱映射到後端欄位名稱
      if (sortField) {
        const sortFieldMapping: Record<string, string> = {
          title: "title",
          type: "taskType",      // 後端會按 taskType.label 排序
          applicant: "applicantName",
          status: "status",
          deadline: "deadline",
          createdAt: "applicationDate",  // 申請時間對應 applicationDate 欄位
        };
        variables.sortBy = sortFieldMapping[sortField] || "applicationDate";
        variables.sortOrder = sortOrder;
      }

      // 添加時間戳防止緩存
      const timestamp = Date.now();
      const [statsRes, taskTypesRes, usersRes, tasksRes, myReminderTasksRes] = await Promise.all([
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
        fetch(`/api/graphql?_t=${timestamp}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
          },
          credentials: "include",
          cache: "no-store",
          body: JSON.stringify({ query: myReminderTasksQuery }),
        }),
      ]);

      if (!statsRes.ok || !taskTypesRes.ok || !usersRes.ok || !tasksRes.ok || !myReminderTasksRes.ok) {
        throw new Error(`HTTP 錯誤: ${statsRes.status || taskTypesRes.status || usersRes.status || tasksRes.status || myReminderTasksRes.status}`);
      }

      const [statsData, taskTypesData, usersData, tasksData, myReminderTasksData] = await Promise.all([
        statsRes.json(),
        taskTypesRes.json(),
        usersRes.json(),
        tasksRes.json(),
        myReminderTasksRes.json(),
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
      if (myReminderTasksData.errors) {
        console.error("GraphQL MyReminderTasks Error:", myReminderTasksData.errors);
        throw new Error(myReminderTasksData.errors[0].message);
      }

      setStats(statsData.data.adminTaskStats);
      setTaskTypes(taskTypesData.data.taskTypes);
      setApplicants(usersData.data.users.users);
      setTasks(tasksData.data.adminTasks.items);
      setPageInfo(tasksData.data.adminTasks.pageInfo);
      setMyReminderTasks(myReminderTasksData.data.adminTasks.items);
    } catch (err) {
      console.error("載入資料失敗：", err);
      const errorMessage = err instanceof Error ? err.message : "未知錯誤";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, applicantFilter, handlerFilter, currentPage, sortField, sortOrder]);

  // 使用穩定的依賴項避免無限循環
  useEffect(() => {
    if (status === "authenticated" && hasAccess) {
      fetchData();
    }
  }, [status, hasAccess, fetchData]);

  // 處理 URL 的 status 參數（從通知跳轉過來時使用）
  useEffect(() => {
    if (urlStatus && urlStatus !== statusFilter) {
      setStatusFilter(urlStatus);
      setCurrentPage(1);
      // 清除 URL 參數，避免重複觸發
      router.replace("/admin/admin-tasks", { scroll: false });
    }
  }, [urlStatus, statusFilter, router]);

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
        setEditableRemarks(task.remarks || "");
        setShowDetailModal(true);
        // 清除 URL 參數
        router.replace("/admin/admin-tasks", { scroll: false });
      }
    }
  }, [urlViewTask, tasks, showDetailModal, router]);

  // 獲取當前選擇類型的問題（注意：GraphQL ID 可能是字符串）
  const selectedTaskType = taskTypes.find((t) => Number(t.id) === createForm.taskTypeId);
  const currentQuestions = selectedTaskType?.questions || [];

  // 處理任務分組（將關聯任務分組顯示，同時保持後端排序順序）
  const groupedTasks = useMemo(() => {
    // 先進行關鍵字過濾
    const keyword = searchKeyword.trim().toLowerCase();
    const filteredTasks = keyword
      ? tasks.filter((task) => {
          // 搜尋標題
          if (task.title?.toLowerCase().includes(keyword)) return true;
          // 搜尋任務編號
          if (task.taskNo?.toLowerCase().includes(keyword)) return true;
          // 搜尋類型
          if (task.taskType?.label?.toLowerCase().includes(keyword)) return true;
          // 搜尋申請人
          const applicantName = task.applicantName || task.applicant?.name || task.applicant?.email || "";
          if (applicantName.toLowerCase().includes(keyword)) return true;
          // 搜尋負責人
          if (task.handlers && task.handlers.length > 0) {
            const handlerNames = task.handlers.map(h => (h.name || h.email || "").toLowerCase()).join(" ");
            if (handlerNames.includes(keyword)) return true;
          }
          // 搜尋狀態
          const statusLabel = statusLabels[task.status]?.label || "";
          if (statusLabel.includes(keyword)) return true;
          // 搜尋備註
          if (task.notes?.toLowerCase().includes(keyword)) return true;
          return false;
        })
      : tasks;

    // 建立群組映射表：groupId -> 所有同組任務
    const groupMap = new Map<string, AdminTask[]>();
    for (const task of filteredTasks) {
      if (task.groupId) {
        const existing = groupMap.get(task.groupId) || [];
        existing.push(task);
        groupMap.set(task.groupId, existing);
      }
    }

    // 按照後端返回的順序處理，保持排序順序
    // 群組位置基於群組中第一個被遍歷到的任務
    const result: { type: "single" | "group"; task: AdminTask; children?: AdminTask[] }[] = [];
    const processedGroupIds = new Set<string>();

    for (const task of filteredTasks) {
      if (task.groupId) {
        // 如果這個群組已經處理過，跳過
        if (processedGroupIds.has(task.groupId)) {
          continue;
        }
        // 標記此群組已處理
        processedGroupIds.add(task.groupId);

        // 取得同組的所有任務
        const groupTasks = groupMap.get(task.groupId) || [task];

        // 群組內按創建時間排序，最早的作為主任務（用於顯示）
        const sortedGroupTasks = [...groupTasks].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        const mainTask = sortedGroupTasks[0];
        const childTasks = sortedGroupTasks.slice(1);

        result.push({
          type: groupTasks.length > 1 ? "group" : "single",
          task: mainTask,
          children: childTasks.length > 0 ? childTasks : undefined,
        });
      } else {
        // 獨立任務，直接添加
        result.push({ type: "single", task });
      }
    }

    return result;
  }, [tasks, searchKeyword]);

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

  // 自動展開已完成主任務的群組（讓使用者知道有後續任務）
  // 使用 useRef 追蹤已自動展開的群組，避免重複展開
  const autoExpandedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const groupsToExpand: string[] = [];
    for (const item of groupedTasks) {
      if (
        item.type === "group" &&
        item.task.groupId &&
        item.children &&
        item.children.length > 0
      ) {
        // 主任務已完成或已複審
        const mainTaskCompleted = item.task.status === "COMPLETED" || item.task.status === "REVIEWED";
        // 檢查是否有未完成的子任務
        const hasIncompleteChild = item.children.some(
          (child) => child.status !== "COMPLETED" && child.status !== "REVIEWED"
        );
        // 如果主任務已完成且有未完成子任務，且尚未自動展開過，則自動展開
        if (mainTaskCompleted && hasIncompleteChild && !autoExpandedRef.current.has(item.task.groupId)) {
          groupsToExpand.push(item.task.groupId);
          autoExpandedRef.current.add(item.task.groupId);
        }
      }
    }
    if (groupsToExpand.length > 0) {
      setExpandedGroups((prev) => {
        const next = new Set(prev);
        for (const groupId of groupsToExpand) {
          next.add(groupId);
        }
        return next;
      });
    }
  }, [groupedTasks]);

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

    // 驗證完成限期（必填）
    if (deadlineType === "date" && !createForm.deadline) {
      alert("請選擇完成限期");
      return;
    }
    if (deadlineType === "text" && !createForm.deadlineText.trim()) {
      alert("請輸入完成限期");
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

      // 將 datetime-local 的值轉換為 ISO 格式（保留本地時區）
      const convertToISOWithTimezone = (localDatetime: string | null): string | null => {
        if (!localDatetime) return null;
        // datetime-local 格式是 "YYYY-MM-DDTHH:mm"
        // 創建本地 Date 對象（會使用瀏覽器的時區）
        const date = new Date(localDatetime);
        // 轉換為 ISO 格式，這會保留正確的時區資訊
        return date.toISOString();
      };

      // 根據期限類型決定發送的值
      const deadlineValue = deadlineType === "date"
        ? convertToISOWithTimezone(createForm.deadline)
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
          applicantName: session?.user?.name || null,
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

  // 開啟編輯模式（用於「要求修改」狀態時編輯任務）
  const openEditMode = () => {
    if (!selectedTask) return;

    // 將 ISO 日期轉換為本地 datetime-local 格式
    const toLocalDatetimeString = (isoString: string): string => {
      const date = new Date(isoString);
      // 獲取本地時間的各個部分
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    // 初始化表單數據
    setEditForm({
      title: selectedTask.title || "",
      deadline: selectedTask.deadline
        ? toLocalDatetimeString(selectedTask.deadline)
        : "",
      deadlineText: (selectedTask.payload?.deadlineText as string) || "",
      notes: selectedTask.notes || "",
    });

    // 判斷期限類型
    if (selectedTask.deadline) {
      setEditDeadlineType("date");
    } else if (selectedTask.payload?.deadlineText) {
      setEditDeadlineType("text");
    } else {
      setEditDeadlineType("date");
    }

    // 初始化自訂問題答案
    const answers = (selectedTask.payload?.customAnswers as Record<string, string | string[]>) || {};
    setEditCustomAnswers(answers);

    // 初始化補充說明文字
    const explanations = (selectedTask.payload?.explanationTexts as Record<string, string>) || {};
    setEditExplanationTexts(explanations);

    setIsEditMode(true);
  };

  // 取消編輯
  const cancelEditMode = () => {
    setIsEditMode(false);
    setEditForm({
      title: "",
      deadline: "",
      deadlineText: "",
      notes: "",
    });
    setEditCustomAnswers({});
    setEditExplanationTexts({});
  };

  // 保存編輯
  const handleSaveEdit = async () => {
    if (!selectedTask) return;

    // 驗證必填欄位
    if (!editForm.title.trim()) {
      alert("請輸入任務標題");
      return;
    }

    setSaving(true);
    try {
      const mutation = `
        mutation UpdateAdminTask($input: UpdateAdminTaskInput!) {
          updateAdminTask(input: $input) {
            id
            taskNo
            title
            status
            deadline
            notes
            applicantName
            payload
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
            applicant {
              id
              name
              email
              role
            }
            processor {
              id
              name
              email
              role
            }
            approver {
              id
              name
              email
              role
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
              }
              createdAt
            }
            createdAt
            updatedAt
          }
        }
      `;

      // 將 datetime-local 的值轉換為 ISO 格式（保留本地時區）
      const convertToISOWithTimezone = (localDatetime: string | null): string | null => {
        if (!localDatetime) return null;
        // datetime-local 格式是 "YYYY-MM-DDTHH:mm"
        // 創建本地 Date 對象（會使用瀏覽器的時區）
        const date = new Date(localDatetime);
        // 轉換為 ISO 格式，這會保留正確的時區資訊
        return date.toISOString();
      };

      // 構建 payload
      const newPayload = {
        ...(selectedTask.payload || {}),
        customAnswers: editCustomAnswers,
        explanationTexts: editExplanationTexts,
        deadlineText: editDeadlineType === "text" ? editForm.deadlineText : null,
      };

      const variables = {
        input: {
          id: typeof selectedTask.id === "string" ? parseInt(selectedTask.id, 10) : selectedTask.id,
          title: editForm.title,
          deadline: editDeadlineType === "date" && editForm.deadline ? convertToISOWithTimezone(editForm.deadline) : null,
          notes: editForm.notes || null,
          applicantName: selectedTask.applicantName || null,
          payload: newPayload,
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

      // 保存成功後，自動重新送出案件（將狀態改為待處理）
      const resubmitMutation = `
        mutation ResubmitTask($input: ResubmitTaskInput!) {
          resubmitTask(input: $input) {
            id
            taskNo
            title
            status
            deadline
            notes
            applicantName
            payload
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
                explanations {
                  answer
                  prompt
                }
              }
            }
            applicant {
              id
              name
              email
              role
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
              }
              createdAt
            }
            createdAt
            updatedAt
          }
        }
      `;

      const resubmitRes = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          query: resubmitMutation,
          variables: {
            input: {
              taskId: typeof selectedTask.id === "string" ? parseInt(selectedTask.id, 10) : selectedTask.id,
              // 不傳 notes 參數，避免覆蓋細節欄位
            },
          },
        }),
      });

      const resubmitData = await resubmitRes.json();

      if (resubmitData.errors) {
        throw new Error(resubmitData.errors[0].message);
      }

      // 更新本地狀態（使用重新送出後的資料）
      const updatedTask = resubmitData.data.resubmitTask;
      setSelectedTask(updatedTask as AdminTask);

      // 更新列表中的任務
      setTasks(prevTasks =>
        prevTasks.map(t =>
          t.id === updatedTask.id ? { ...t, ...updatedTask } : t
        )
      );

      alert("任務已更新並重新送出審批！");
      setIsEditMode(false);
      setShowDetailModal(false);
      fetchData(); // 刷新列表
    } catch (error) {
      console.error("更新任務失敗：", error);
      alert(`更新失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
    } finally {
      setSaving(false);
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

  // 處理完成確認打勾
  const handleToggleCompleteCheck = async (task: AdminTask, checked: boolean) => {
    setTogglingCompleteId(task.id);
    try {
      const mutation = `
        mutation ToggleCompleteCheck($taskId: Int!, $checked: Boolean!) {
          toggleCompleteCheck(taskId: $taskId, checked: $checked) {
            id
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

      // 更新本地狀態
      const oldStatus = task.status;
      const newStatus = data.data.toggleCompleteCheck.status;

      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? {
                ...t,
                status: newStatus,
                completedAt: data.data.toggleCompleteCheck.completedAt,
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

          // 增加新狀態計數
          if (newStatus === "APPROVED") updated.approved = updated.approved + 1;
          else if (newStatus === "COMPLETED") updated.completed = updated.completed + 1;

          return updated;
        });
      }
    } catch (error) {
      console.error("完成確認失敗：", error);
      alert(`操作失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
    } finally {
      setTogglingCompleteId(null);
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
          else if (oldStatus === "REVIEWED") updated.reviewed = Math.max(0, updated.reviewed - 1);
          else if (oldStatus === "PENDING") updated.pending = Math.max(0, updated.pending - 1);

          // 增加新狀態計數
          if (newStatus === "APPROVED") updated.approved = updated.approved + 1;
          else if (newStatus === "COMPLETED") updated.completed = updated.completed + 1;
          else if (newStatus === "REVIEWED") updated.reviewed = updated.reviewed + 1;
          else if (newStatus === "PENDING") updated.pending = updated.pending + 1;

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

  // 更新任務備註（負責人或複審人可操作，複審後不可編輯）
  const handleUpdateRemarks = async (task: AdminTask) => {
    setSavingRemarks(true);
    try {
      const mutation = `
        mutation UpdateTaskRemarks($taskId: Int!, $remarks: String!) {
          updateTaskRemarks(taskId: $taskId, remarks: $remarks) {
            id
            remarks
            remarksHistory {
              userId
              userName
              content
              timestamp
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
          variables: { taskId: Number(task.id), remarks: editableRemarks },
        }),
      });

      const data = await res.json();

      if (data.errors) {
        throw new Error(data.errors[0].message);
      }

      const updatedTaskData = data.data.updateTaskRemarks;

      // 更新本地狀態
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? { ...t, remarks: updatedTaskData.remarks, remarksHistory: updatedTaskData.remarksHistory }
            : t
        )
      );

      // 更新 selectedTask
      if (selectedTask && selectedTask.id === task.id) {
        setSelectedTask({
          ...selectedTask,
          remarks: updatedTaskData.remarks,
          remarksHistory: updatedTaskData.remarksHistory
        });
      }

      addToast({ type: "success", title: "備註已更新" });
    } catch (error) {
      console.error("更新備註失敗：", error);
      addToast({ type: "error", title: `更新失敗：${error instanceof Error ? error.message : "未知錯誤"}` });
    } finally {
      setSavingRemarks(false);
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

  // 計算待處理任務數量（根據用戶在案件中的角色）
  // 使用 myReminderTasks（獨立於篩選條件）來計算，確保提醒數量不受篩選影響
  const currentUserId = session?.user?.id;

  // 待處理：用戶是負責人（僅檢查 assignments 表中的 HANDLER）
  const myPendingTasks = myReminderTasks.filter(t =>
    t.status === "PENDING" &&
    t.handlers?.some(h => h.id === currentUserId)
  ).length;

  // 待補件：用戶是申請人
  const myPendingDocsTasks = myReminderTasks.filter(t =>
    t.status === "PENDING_DOCUMENTS" &&
    t.applicant?.id === currentUserId
  ).length;

  // 要求修改：用戶是申請人
  const myRevisionTasks = myReminderTasks.filter(t =>
    t.status === "REVISION_REQUESTED" &&
    t.applicant?.id === currentUserId
  ).length;

  // 待複審：用戶是複審人
  const myPendingReviewTasks = myReminderTasks.filter(t =>
    t.status === "PENDING_REVIEW" &&
    t.reviewers?.some(r => r.id === currentUserId)
  ).length;

  const totalPendingCount = myPendingTasks + myPendingDocsTasks + myRevisionTasks + myPendingReviewTasks;

  // 導出 Excel - 獲取全部資料
  const handleExportExcel = async () => {
    if (!stats || stats.total === 0) {
      alert("沒有資料可以導出");
      return;
    }

    setExporting(true);
    try {
      // 獲取所有資料（不分頁）
      const query = `
        query AdminTasks($status: String, $taskTypeId: Int, $applicantId: String, $handlerId: String, $search: String) {
          adminTasks(status: $status, taskTypeId: $taskTypeId, applicantId: $applicantId, handlerId: $handlerId, search: $search, pageSize: 99999) {
            items {
              id
              taskNo
              title
              status
              deadline
              createdAt
              taskType { id code label }
              applicant { id name email role }
              handlers { id name email role }
            }
          }
        }
      `;

      const response = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          query,
          variables: {
            status: statusFilter !== "all" ? statusFilter : undefined,
            taskTypeId: typeFilter !== "all" ? parseInt(typeFilter) : undefined,
            applicantId: applicantFilter !== "all" ? applicantFilter : undefined,
            handlerId: handlerFilter !== "all" ? handlerFilter : undefined,
            search: searchKeyword || undefined,
          },
        }),
      });

      const result = await response.json();
      if (result.errors) throw new Error(result.errors[0].message);

      const allTasks = result.data.adminTasks.items;

      if (allTasks.length === 0) {
        alert("沒有資料可以導出");
        return;
      }

      exportToExcel({
        filename: "行政任務列表",
        sheetName: "任務",
        columns: [
          { key: "taskNo", header: "案件編號", width: 15 },
          { key: "title", header: "標題", width: 30 },
          { key: "taskType", header: "案件類型", width: 15, format: (value) => value?.label || "" },
          { key: "status", header: "狀態", width: 12, format: (value) => statusLabels[value]?.label || value },
          { key: "applicant", header: "申請人", width: 15, format: (value) => value?.name || value?.email || "" },
          { key: "handlers", header: "負責人", width: 20, format: (value) => value?.map((u: TaskUser) => u.name || u.email).join(", ") || "" },
          { key: "deadline", header: "期限", width: 18, format: (value) => formatDateForExcel(value) },
          { key: "createdAt", header: "建立時間", width: 18, format: (value) => formatDateForExcel(value) },
        ],
        data: allTasks,
      });
    } catch (error) {
      console.error("導出失敗:", error);
      alert("導出失敗，請稍後再試");
    } finally {
      setExporting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-full overflow-x-hidden">
        {/* 頂部工具列 */}
        <div className="mb-4 md:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* 左側：待處理任務提醒 */}
          <div className="relative">
            <button
              onClick={() => setShowReminderPanel(!showReminderPanel)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${
                totalPendingCount > 0
                  ? "bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100"
                  : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
              }`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <span className="font-medium">待處理任務</span>
              {totalPendingCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 text-sm font-bold bg-red-500 text-white rounded-full">
                  {totalPendingCount}
                </span>
              )}
              <svg
                className={`w-4 h-4 transition-transform ${
                  showReminderPanel ? "rotate-180" : ""
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* 下拉面板 */}
            {showReminderPanel && (
              <div className="absolute left-0 top-full mt-2 w-80 md:w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                <div className="p-3 bg-gray-50 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-800">
                    需要您處理的任務
                  </h3>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  {/* 待處理：用戶是負責人/處理人 */}
                  {myPendingTasks > 0 && (
                    <div className="border-b border-gray-100">
                      <button
                        onClick={() => {
                          // 清除所有篩選器，只保留狀態篩選和負責人為當前用戶
                          setStatusFilter("PENDING");
                          setTypeFilter("all");
                          setApplicantFilter("all");
                          setHandlerFilter(currentUserId || "all");
                          setCurrentPage(1);
                          setShowReminderPanel(false);
                        }}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-yellow-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                          <span className="text-gray-700">待處理</span>
                          <span className="text-xs text-gray-400">
                            （您是負責人）
                          </span>
                        </div>
                        <span className="px-2.5 py-1 text-sm font-semibold bg-yellow-100 text-yellow-800 rounded-full">
                          {myPendingTasks}
                        </span>
                      </button>
                    </div>
                  )}
                  {/* 待補件：用戶是申請人 */}
                  {myPendingDocsTasks > 0 && (
                    <div className="border-b border-gray-100">
                      <button
                        onClick={() => {
                          // 清除所有篩選器，只保留狀態篩選和申請人為當前用戶
                          setStatusFilter("PENDING_DOCUMENTS");
                          setTypeFilter("all");
                          setApplicantFilter(currentUserId || "all");
                          setHandlerFilter("all");
                          setCurrentPage(1);
                          setShowReminderPanel(false);
                        }}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-orange-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                          <span className="text-gray-700">待補件</span>
                          <span className="text-xs text-gray-400">
                            （您是申請人）
                          </span>
                        </div>
                        <span className="px-2.5 py-1 text-sm font-semibold bg-orange-100 text-orange-800 rounded-full">
                          {myPendingDocsTasks}
                        </span>
                      </button>
                    </div>
                  )}
                  {/* 待複審：用戶是複審人 */}
                  {myPendingReviewTasks > 0 && (
                    <div className="border-b border-gray-100">
                      <button
                        onClick={() => {
                          // 清除所有篩選器，只保留狀態篩選
                          setStatusFilter("PENDING_REVIEW");
                          setTypeFilter("all");
                          setApplicantFilter("all");
                          setHandlerFilter("all");
                          setCurrentPage(1);
                          setShowReminderPanel(false);
                        }}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-purple-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                          <span className="text-gray-700">待複審</span>
                          <span className="text-xs text-gray-400">
                            （您是複審人）
                          </span>
                        </div>
                        <span className="px-2.5 py-1 text-sm font-semibold bg-purple-100 text-purple-800 rounded-full">
                          {myPendingReviewTasks}
                        </span>
                      </button>
                    </div>
                  )}
                  {/* 要求修改：用戶是申請人 */}
                  {myRevisionTasks > 0 && (
                    <div className="border-b border-gray-100">
                      <button
                        onClick={() => {
                          // 清除所有篩選器，只保留狀態篩選和申請人為當前用戶
                          setStatusFilter("REVISION_REQUESTED");
                          setTypeFilter("all");
                          setApplicantFilter(currentUserId || "all");
                          setHandlerFilter("all");
                          setCurrentPage(1);
                          setShowReminderPanel(false);
                        }}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-pink-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-3 h-3 rounded-full bg-pink-500"></span>
                          <span className="text-gray-700">要求修改</span>
                          <span className="text-xs text-gray-400">
                            （您是申請人）
                          </span>
                        </div>
                        <span className="px-2.5 py-1 text-sm font-semibold bg-pink-100 text-pink-800 rounded-full">
                          {myRevisionTasks}
                        </span>
                      </button>
                    </div>
                  )}
                  {/* 無待處理任務 */}
                  {totalPendingCount === 0 && (
                    <div className="px-4 py-8 text-center text-gray-500">
                      <svg
                        className="w-12 h-12 mx-auto mb-3 text-gray-300"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p>目前沒有待處理的任務</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 右側：搜尋和新增 */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            {/* 關鍵字搜尋 */}
            <div className="relative">
              <input
                type="text"
                placeholder="搜尋標題、編號、申請人..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full sm:w-64 pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {searchKeyword && (
                <button
                  onClick={() => setSearchKeyword("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleExportExcel}
                disabled={!stats || stats.total === 0 || exporting}
                className="w-full sm:w-auto px-4 py-3 md:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors flex items-center justify-center gap-2 min-h-[48px] md:min-h-0 text-base md:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting ? "導出中..." : "導出 Excel"}
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="w-full sm:w-auto px-4 py-3 md:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors flex items-center justify-center gap-2 min-h-[48px] md:min-h-0 text-base md:text-sm font-medium"
              >
                <span>+</span>
                新增申請
              </button>
            </div>
          </div>
        </div>

        {/* 統計卡片 - 可點擊快速篩選 */}
        {stats && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-10 gap-2 md:gap-3 mb-4 md:mb-8">
            {/* 待處理 */}
            <button
              onClick={() => { setStatusFilter("PENDING"); setCurrentPage(1); }}
              className={`bg-white rounded-xl shadow-md p-2 md:p-4 border-l-4 border-yellow-500 text-left transition-all hover:shadow-lg hover:scale-[1.02] ${statusFilter === "PENDING" ? "ring-2 ring-yellow-500 ring-offset-1" : ""}`}
            >
              <p className="text-xs md:text-sm text-gray-600 mb-0.5 md:mb-1">待處理</p>
              <p className="text-lg md:text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </button>
            {/* 待補件 */}
            <button
              onClick={() => { setStatusFilter("PENDING_DOCUMENTS"); setCurrentPage(1); }}
              className={`bg-white rounded-xl shadow-md p-2 md:p-4 border-l-4 border-orange-400 text-left transition-all hover:shadow-lg hover:scale-[1.02] ${statusFilter === "PENDING_DOCUMENTS" ? "ring-2 ring-orange-400 ring-offset-1" : ""}`}
            >
              <p className="text-xs md:text-sm text-gray-600 mb-0.5 md:mb-1">待補件</p>
              <p className="text-lg md:text-2xl font-bold text-orange-500">{stats.pendingDocuments}</p>
            </button>
            {/* 要求修改 */}
            <button
              onClick={() => { setStatusFilter("REVISION_REQUESTED"); setCurrentPage(1); }}
              className={`bg-white rounded-xl shadow-md p-2 md:p-4 border-l-4 border-pink-500 text-left transition-all hover:shadow-lg hover:scale-[1.02] ${statusFilter === "REVISION_REQUESTED" ? "ring-2 ring-pink-500 ring-offset-1" : ""}`}
            >
              <p className="text-xs md:text-sm text-gray-600 mb-0.5 md:mb-1">要求修改</p>
              <p className="text-lg md:text-2xl font-bold text-pink-600">{stats.revisionRequested}</p>
            </button>
            {/* 已批准 */}
            <button
              onClick={() => { setStatusFilter("APPROVED"); setCurrentPage(1); }}
              className={`bg-white rounded-xl shadow-md p-2 md:p-4 border-l-4 border-green-500 text-left transition-all hover:shadow-lg hover:scale-[1.02] ${statusFilter === "APPROVED" ? "ring-2 ring-green-500 ring-offset-1" : ""}`}
            >
              <p className="text-xs md:text-sm text-gray-600 mb-0.5 md:mb-1">已批准</p>
              <p className="text-lg md:text-2xl font-bold text-green-600">{stats.approved}</p>
            </button>
            {/* 已退回 */}
            <button
              onClick={() => { setStatusFilter("REJECTED"); setCurrentPage(1); }}
              className={`bg-white rounded-xl shadow-md p-2 md:p-4 border-l-4 border-red-500 text-left transition-all hover:shadow-lg hover:scale-[1.02] ${statusFilter === "REJECTED" ? "ring-2 ring-red-500 ring-offset-1" : ""}`}
            >
              <p className="text-xs md:text-sm text-gray-600 mb-0.5 md:mb-1">已退回</p>
              <p className="text-lg md:text-2xl font-bold text-red-600">{stats.rejected}</p>
            </button>
            {/* 已完成 */}
            <button
              onClick={() => { setStatusFilter("COMPLETED"); setCurrentPage(1); }}
              className={`bg-white rounded-xl shadow-md p-2 md:p-4 border-l-4 border-gray-500 text-left transition-all hover:shadow-lg hover:scale-[1.02] ${statusFilter === "COMPLETED" ? "ring-2 ring-gray-500 ring-offset-1" : ""}`}
            >
              <p className="text-xs md:text-sm text-gray-600 mb-0.5 md:mb-1">已完成</p>
              <p className="text-lg md:text-2xl font-bold text-gray-600">{stats.completed}</p>
            </button>
            {/* 待複審 */}
            <button
              onClick={() => { setStatusFilter("PENDING_REVIEW"); setCurrentPage(1); }}
              className={`bg-white rounded-xl shadow-md p-2 md:p-4 border-l-4 border-cyan-500 text-left transition-all hover:shadow-lg hover:scale-[1.02] ${statusFilter === "PENDING_REVIEW" ? "ring-2 ring-cyan-500 ring-offset-1" : ""}`}
            >
              <p className="text-xs md:text-sm text-gray-600 mb-0.5 md:mb-1">待複審</p>
              <p className="text-lg md:text-2xl font-bold text-cyan-600">{stats.pendingReview}</p>
            </button>
            {/* 已複審 */}
            <button
              onClick={() => { setStatusFilter("REVIEWED"); setCurrentPage(1); }}
              className={`bg-white rounded-xl shadow-md p-2 md:p-4 border-l-4 border-indigo-500 text-left transition-all hover:shadow-lg hover:scale-[1.02] ${statusFilter === "REVIEWED" ? "ring-2 ring-indigo-500 ring-offset-1" : ""}`}
            >
              <p className="text-xs md:text-sm text-gray-600 mb-0.5 md:mb-1">已複審</p>
              <p className="text-lg md:text-2xl font-bold text-indigo-600">{stats.reviewed}</p>
            </button>
            {/* 總計 */}
            <button
              onClick={() => { setStatusFilter("all"); setCurrentPage(1); }}
              className={`bg-blue-50 rounded-xl shadow-md p-2 md:p-4 border-l-4 border-blue-500 text-left transition-all hover:shadow-lg hover:scale-[1.02] ${statusFilter === "all" ? "ring-2 ring-blue-500 ring-offset-1" : ""}`}
            >
              <p className="text-xs md:text-sm text-blue-600 mb-0.5 md:mb-1">= 總計</p>
              <p className="text-lg md:text-2xl font-bold text-blue-700">{stats.total}</p>
            </button>
            {/* 逾期 - 特殊樣式：虛線邊框 + 淺紫色背景，表示這是交叉統計 */}
            <button
              onClick={() => { setStatusFilter("OVERDUE"); setCurrentPage(1); }}
              className={`bg-purple-50 rounded-xl shadow-md p-2 md:p-4 border-2 border-dashed border-purple-400 text-left transition-all hover:shadow-lg hover:scale-[1.02] ${statusFilter === "OVERDUE" ? "ring-2 ring-purple-500 ring-offset-1" : ""}`}
            >
              <p className="text-xs md:text-sm text-purple-600 mb-0.5 md:mb-1">⚠ 逾期</p>
              <p className="text-lg md:text-2xl font-bold text-purple-600">{stats.overdue}</p>
            </button>
          </div>
        )}

        {/* 篩選器 */}
        <div className="bg-white rounded-xl shadow-md p-3 md:p-4 mb-4 md:mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
            {/* 狀態篩選 */}
            <div>
              <label className="block text-xs md:text-sm text-gray-600 mb-1">
                狀態
              </label>
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
                <option value="PENDING_DOCUMENTS">待補件</option>
                <option value="REVISION_REQUESTED">要求修改</option>
                <option value="APPROVED">已批准</option>
                <option value="REJECTED">已退回</option>
                <option value="COMPLETED">已完成</option>
                <option value="PENDING_REVIEW">待複審</option>
                <option value="REVIEWED">已複審</option>
                <option value="OVERDUE">逾期</option>
              </select>
            </div>

            {/* 類型篩選 */}
            <div>
              <label className="block text-xs md:text-sm text-gray-600 mb-1">
                類型
              </label>
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
              <label className="block text-xs md:text-sm text-gray-600 mb-1">
                申請人
              </label>
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

            {/* 負責人篩選 */}
            <div>
              <label className="block text-xs md:text-sm text-gray-600 mb-1">
                負責人
              </label>
              <select
                value={handlerFilter}
                onChange={(e) => {
                  setHandlerFilter(e.target.value);
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
          <div className="bg-white rounded-xl shadow-md overflow-x-auto">
            {/* 手機版卡片視圖 */}
            <div className="md:hidden divide-y divide-gray-200">
              {groupedTasks.map((item) => (
                <div key={`mobile-${item.task.id}`} className="p-3">
                  {/* 標題列：展開按鈕 + 標題 + 狀態 */}
                  <div className="flex items-center gap-2 mb-2">
                    {item.type === "group" &&
                      item.children &&
                      item.children.length > 0 &&
                      (() => {
                        const mainTaskCompleted =
                          item.task.status === "COMPLETED" ||
                          item.task.status === "REVIEWED";
                        const hasIncompleteChild = item.children?.some(
                          (child) =>
                            child.status !== "COMPLETED" &&
                            child.status !== "REVIEWED"
                        );
                        const shouldHighlight =
                          mainTaskCompleted && hasIncompleteChild;
                        return (
                          <button
                            onClick={() =>
                              item.task.groupId &&
                              toggleGroup(item.task.groupId)
                            }
                            className={`p-1.5 rounded transition-colors flex-shrink-0 ${
                              shouldHighlight
                                ? "bg-orange-100 text-orange-600 hover:bg-orange-200 animate-pulse"
                                : "hover:bg-gray-200 text-gray-500"
                            }`}
                            title={
                              shouldHighlight
                                ? "有後續任務待處理，點擊展開查看"
                                : "點擊展開/收起關聯任務"
                            }
                          >
                            {item.task.groupId &&
                            expandedGroups.has(item.task.groupId)
                              ? "▼"
                              : "▶"}
                          </button>
                        );
                      })()}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-900 line-clamp-2">
                        {item.task.title}
                      </span>
                    </div>
                    <div className="flex-shrink-0">
                      {getStatusBadge(item.task.status)}
                    </div>
                  </div>

                  {/* 資訊區：類型、申請人、負責人、期限 */}
                  <div className="space-y-1 text-xs text-gray-600 mb-2">
                    <div className="flex items-center justify-between">
                      <span className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded">
                        {item.task.taskType?.label || "未知"}
                      </span>
                      <span>
                        申請人：
                        {item.task.applicantName ||
                          item.task.applicant?.name ||
                          "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">負責人：</span>
                      <span className="truncate max-w-[180px]">
                        {item.task.handlers && item.task.handlers.length > 0
                          ? item.task.handlers
                              .map((h) => h.name || h.email)
                              .join(", ")
                          : "-"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">期限：</span>
                      {(() => {
                        const deadline = item.task.deadline;
                        const deadlineText = item.task.payload
                          ?.deadlineText as string;
                        if (!deadline && !deadlineText)
                          return <span className="text-gray-400">-</span>;
                        if (deadlineText && !deadline)
                          return <span>{deadlineText}</span>;
                        const urgency = getDeadlineUrgency(deadline);
                        return (
                          <span
                            className={`px-1.5 py-0.5 rounded text-xs ${getDeadlineStyle(
                              urgency
                            )}`}
                          >
                            {formatDeadlineDate(deadline)}
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  {/* 群組標記 */}
                  {item.type === "group" &&
                    item.children &&
                    item.children.length > 0 &&
                    (() => {
                      const mainTaskCompleted =
                        item.task.status === "COMPLETED" ||
                        item.task.status === "REVIEWED";
                      const hasIncompleteChild = item.children?.some(
                        (child) =>
                          child.status !== "COMPLETED" &&
                          child.status !== "REVIEWED"
                      );
                      const shouldHighlight =
                        mainTaskCompleted && hasIncompleteChild;
                      return (
                        <div
                          className={`text-xs font-medium mb-2 ${
                            shouldHighlight
                              ? "text-orange-600"
                              : "text-blue-600"
                          }`}
                        >
                          📎 {item.children.length + 1} 個關聯
                          {shouldHighlight && (
                            <span className="ml-1 text-orange-500">
                              ⚠️ 有待處理
                            </span>
                          )}
                        </div>
                      );
                    })()}

                  {/* 完成確認 & 複審確認 checkbox */}
                  {(() => {
                    const isHandler = item.task.handlers?.some(
                      (h) => h.id === session?.user?.id
                    );
                    const isReviewer = item.task.reviewers?.some(
                      (r) => r.id === session?.user?.id
                    );
                    const isSuperAdmin = userRole === "SUPER_ADMIN";
                    const isCompleteChecked =
                      item.task.status === "COMPLETED" ||
                      item.task.status === "REVIEWED" ||
                      item.task.status === "PENDING_REVIEW";
                    const isCompleteLoading =
                      togglingCompleteId === item.task.id;
                    const canToggleComplete =
                      item.task.status === "APPROVED" ||
                      item.task.status === "COMPLETED" ||
                      item.task.status === "PENDING_REVIEW";
                    const canCompleteCheck =
                      (isHandler || isSuperAdmin) && canToggleComplete;
                    const hasHandlers =
                      item.task.handlers && item.task.handlers.length > 0;

                    const isReviewChecked = !!item.task.reviewedAt;
                    const isReviewLoading = togglingReviewId === item.task.id;
                    const canReviewStatus =
                      item.task.status === "PENDING_REVIEW" ||
                      item.task.status === "COMPLETED" ||
                      item.task.status === "REVIEWED";
                    const canReviewCheck =
                      (isReviewer || isSuperAdmin) && canReviewStatus;
                    const hasReviewers =
                      item.task.reviewers && item.task.reviewers.length > 0;

                    // 只有當有負責人或複審人時才顯示此區域
                    if (!hasHandlers && !hasReviewers) return null;

                    return (
                      <div className="flex items-center gap-4 py-2 mb-2 border-t border-gray-100">
                        {/* 完成確認 */}
                        {hasHandlers && (
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isCompleteChecked}
                              disabled={!canCompleteCheck || isCompleteLoading}
                              onChange={(e) =>
                                handleToggleCompleteCheck(
                                  item.task,
                                  e.target.checked
                                )
                              }
                              className={`w-5 h-5 rounded border-2 ${
                                canCompleteCheck
                                  ? "cursor-pointer text-green-600 border-green-300 focus:ring-green-500"
                                  : "cursor-not-allowed text-gray-400 border-gray-300"
                              } ${isCompleteLoading ? "opacity-50" : ""}`}
                            />
                            <span
                              className={`text-xs ${
                                canCompleteCheck
                                  ? "text-gray-700"
                                  : "text-gray-400"
                              }`}
                            >
                              完成確認
                            </span>
                          </label>
                        )}
                        {/* 複審確認 */}
                        {hasReviewers && (
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isReviewChecked}
                              disabled={!canReviewCheck || isReviewLoading}
                              onChange={(e) =>
                                handleToggleReviewCheck(
                                  item.task,
                                  e.target.checked
                                )
                              }
                              className={`w-5 h-5 rounded border-2 ${
                                canReviewCheck
                                  ? "cursor-pointer text-purple-600 border-purple-300 focus:ring-purple-500"
                                  : "cursor-not-allowed text-gray-400 border-gray-300"
                              } ${isReviewLoading ? "opacity-50" : ""}`}
                            />
                            <span
                              className={`text-xs ${
                                canReviewCheck
                                  ? "text-gray-700"
                                  : "text-gray-400"
                              }`}
                            >
                              複審確認
                            </span>
                          </label>
                        )}
                      </div>
                    );
                  })()}

                  {/* 操作按鈕 */}
                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => {
                        setSelectedTask(item.task);
                        setEditableRemarks(item.task.remarks || "");
                        setApprovalProcessorName(item.task.processorName || "");
                        setShowDetailModal(true);
                      }}
                      className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg min-h-[40px]"
                    >
                      查看詳情
                    </button>
                    {can("admin_task:delete") && (
                      <button
                        onClick={() => handleDeleteTask(item.task.id)}
                        disabled={deleting}
                        className="px-3 py-2 text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 active:bg-red-100 rounded-lg min-h-[40px] disabled:opacity-50"
                      >
                        刪除
                      </button>
                    )}
                  </div>

                  {/* 展開的子任務 */}
                  {item.type === "group" &&
                    item.task.groupId &&
                    expandedGroups.has(item.task.groupId) &&
                    item.children?.map((childTask) => {
                      const fullChildTask = tasks.find(
                        (t) => t.id === childTask.id
                      ) as AdminTask | undefined;
                      return (
                        <div
                          key={`mobile-child-${childTask.id}`}
                          className="mt-2 ml-3 p-2 bg-gray-50 rounded-lg border-l-2 border-gray-300"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-gray-700 line-clamp-1 flex-1">
                              {childTask.title}
                            </span>
                            {getStatusBadge(childTask.status)}
                          </div>
                          {/* 子任務完成確認 & 複審確認 checkbox */}
                          {fullChildTask &&
                            (() => {
                              const isHandler = fullChildTask.handlers?.some(
                                (h) => h.id === session?.user?.id
                              );
                              const isReviewer = fullChildTask.reviewers?.some(
                                (r) => r.id === session?.user?.id
                              );
                              const isSuperAdmin = userRole === "SUPER_ADMIN";
                              const isCompleteChecked =
                                fullChildTask.status === "COMPLETED" ||
                                fullChildTask.status === "REVIEWED" ||
                                fullChildTask.status === "PENDING_REVIEW";
                              const isCompleteLoading =
                                togglingCompleteId === fullChildTask.id;
                              const canToggleComplete =
                                fullChildTask.status === "APPROVED" ||
                                fullChildTask.status === "COMPLETED" ||
                                fullChildTask.status === "PENDING_REVIEW";
                              const canCompleteCheck =
                                (isHandler || isSuperAdmin) &&
                                canToggleComplete;
                              const hasHandlers =
                                fullChildTask.handlers &&
                                fullChildTask.handlers.length > 0;

                              const isReviewChecked =
                                !!fullChildTask.reviewedAt;
                              const isReviewLoading =
                                togglingReviewId === fullChildTask.id;
                              const canReviewStatus =
                                fullChildTask.status === "PENDING_REVIEW" ||
                                fullChildTask.status === "COMPLETED" ||
                                fullChildTask.status === "REVIEWED";
                              const canReviewCheck =
                                (isReviewer || isSuperAdmin) &&
                                canReviewStatus;
                              const hasReviewers =
                                fullChildTask.reviewers &&
                                fullChildTask.reviewers.length > 0;

                              if (!hasHandlers && !hasReviewers) return null;

                              return (
                                <div className="flex items-center gap-3 py-1 my-1 border-t border-gray-200">
                                  {hasHandlers && (
                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={isCompleteChecked}
                                        disabled={
                                          !canCompleteCheck || isCompleteLoading
                                        }
                                        onChange={(e) =>
                                          handleToggleCompleteCheck(
                                            fullChildTask,
                                            e.target.checked
                                          )
                                        }
                                        className={`w-4 h-4 rounded border-2 ${
                                          canCompleteCheck
                                            ? "cursor-pointer text-green-600 border-green-300 focus:ring-green-500"
                                            : "cursor-not-allowed text-gray-400 border-gray-300"
                                        } ${
                                          isCompleteLoading ? "opacity-50" : ""
                                        }`}
                                      />
                                      <span
                                        className={`text-xs ${
                                          canCompleteCheck
                                            ? "text-gray-700"
                                            : "text-gray-400"
                                        }`}
                                      >
                                        完成
                                      </span>
                                    </label>
                                  )}
                                  {hasReviewers && (
                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={isReviewChecked}
                                        disabled={
                                          !canReviewCheck || isReviewLoading
                                        }
                                        onChange={(e) =>
                                          handleToggleReviewCheck(
                                            fullChildTask,
                                            e.target.checked
                                          )
                                        }
                                        className={`w-4 h-4 rounded border-2 ${
                                          canReviewCheck
                                            ? "cursor-pointer text-purple-600 border-purple-300 focus:ring-purple-500"
                                            : "cursor-not-allowed text-gray-400 border-gray-300"
                                        } ${
                                          isReviewLoading ? "opacity-50" : ""
                                        }`}
                                      />
                                      <span
                                        className={`text-xs ${
                                          canReviewCheck
                                            ? "text-gray-700"
                                            : "text-gray-400"
                                        }`}
                                      >
                                        複審
                                      </span>
                                    </label>
                                  )}
                                </div>
                              );
                            })()}
                          <button
                            onClick={() => {
                              if (fullChildTask) {
                                setSelectedTask(fullChildTask);
                                setEditableRemarks(fullChildTask.remarks || "");
                                setApprovalProcessorName(
                                  fullChildTask.processorName || ""
                                );
                                setShowDetailModal(true);
                              }
                            }}
                            className="text-xs text-blue-600 active:text-blue-800 py-1"
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
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort("title")}
                    >
                      <div className="flex items-center gap-1">
                        標題
                        <SortIcon field="title" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort("type")}
                    >
                      <div className="flex items-center gap-1">
                        類型
                        <SortIcon field="type" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort("applicant")}
                    >
                      <div className="flex items-center gap-1">
                        申請人
                        <SortIcon field="applicant" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                      負責人
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort("status")}
                    >
                      <div className="flex items-center gap-1">
                        狀態
                        <SortIcon field="status" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort("deadline")}
                    >
                      <div className="flex items-center gap-1">
                        完成期限
                        <SortIcon field="deadline" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort("createdAt")}
                    >
                      <div className="flex items-center gap-1">
                        申請時間
                        <SortIcon field="createdAt" />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                      完成
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
                        className={`hover:bg-gray-50 ${
                          item.type === "group" ? "bg-blue-50/50" : ""
                        }`}
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            {/* 展開/收起按鈕（僅群組顯示） */}
                            {item.type === "group" &&
                              item.children &&
                              item.children.length > 0 &&
                              (() => {
                                const mainTaskCompleted =
                                  item.task.status === "COMPLETED" ||
                                  item.task.status === "REVIEWED";
                                const hasIncompleteChild = item.children?.some(
                                  (child) =>
                                    child.status !== "COMPLETED" &&
                                    child.status !== "REVIEWED"
                                );
                                const shouldHighlight =
                                  mainTaskCompleted && hasIncompleteChild;
                                return (
                                  <button
                                    onClick={() =>
                                      item.task.groupId &&
                                      toggleGroup(item.task.groupId)
                                    }
                                    className={`p-1 rounded transition-colors ${
                                      shouldHighlight
                                        ? "bg-orange-100 text-orange-600 hover:bg-orange-200 animate-pulse"
                                        : "hover:bg-gray-200 text-gray-500"
                                    }`}
                                    title={
                                      shouldHighlight
                                        ? "有後續任務待處理，點擊展開查看"
                                        : "點擊展開/收起關聯任務"
                                    }
                                  >
                                    {item.task.groupId &&
                                    expandedGroups.has(item.task.groupId)
                                      ? "▼"
                                      : "▶"}
                                  </button>
                                );
                              })()}
                            <div>
                              <div className="text-sm font-medium text-gray-900 max-w-[180px] truncate">
                                {item.task.title}
                              </div>
                              {/* 群組標記 */}
                              {item.type === "group" &&
                                item.children &&
                                item.children.length > 0 &&
                                (() => {
                                  const mainTaskCompleted =
                                    item.task.status === "COMPLETED" ||
                                    item.task.status === "REVIEWED";
                                  const hasIncompleteChild =
                                    item.children?.some(
                                      (child) =>
                                        child.status !== "COMPLETED" &&
                                        child.status !== "REVIEWED"
                                    );
                                  const shouldHighlight =
                                    mainTaskCompleted && hasIncompleteChild;
                                  return (
                                    <span
                                      className={`text-xs font-medium ${
                                        shouldHighlight
                                          ? "text-orange-600"
                                          : "text-blue-600"
                                      }`}
                                    >
                                      📎 {item.children.length + 1} 個關聯
                                      {shouldHighlight && (
                                        <span className="ml-1 text-orange-500">
                                          ⚠️ 有待處理
                                        </span>
                                      )}
                                    </span>
                                  );
                                })()}
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
                          <div className="text-sm text-gray-900 max-w-[100px] truncate">
                            {item.task.handlers &&
                            item.task.handlers.length > 0 ? (
                              item.task.handlers
                                .map((h) => h.name || h.email)
                                .join(", ")
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {getStatusBadge(item.task.status)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {(() => {
                            const deadline = item.task.deadline;
                            const deadlineText = item.task.payload
                              ?.deadlineText as string;
                            if (!deadline && !deadlineText) {
                              return (
                                <span className="text-sm text-gray-400">-</span>
                              );
                            }
                            if (deadlineText && !deadline) {
                              return (
                                <span className="text-sm text-gray-600">
                                  {deadlineText}
                                </span>
                              );
                            }
                            const urgency = getDeadlineUrgency(deadline);
                            return (
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${getDeadlineStyle(
                                  urgency
                                )}`}
                              >
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
                          {/* 完成確認 checkbox */}
                          {(() => {
                            const isHandler = item.task.handlers?.some(
                              (h) => h.id === session?.user?.id
                            );
                            const isSuperAdmin = userRole === "SUPER_ADMIN";
                            const isCompleteChecked =
                              item.task.status === "COMPLETED" ||
                              item.task.status === "REVIEWED" ||
                              item.task.status === "PENDING_REVIEW";
                            const isCompleteLoading =
                              togglingCompleteId === item.task.id;
                            // 只有已批准、待複審或已完成狀態才能操作 checkbox
                            const canToggleComplete =
                              item.task.status === "APPROVED" ||
                              item.task.status === "COMPLETED" ||
                              item.task.status === "PENDING_REVIEW";
                            const canCompleteCheck =
                              (isHandler || isSuperAdmin) &&
                              canToggleComplete;

                            // 沒有負責人時不顯示
                            if (
                              !item.task.handlers ||
                              item.task.handlers.length === 0
                            ) {
                              return <span className="text-gray-300">-</span>;
                            }

                            // 顯示 checkbox
                            return (
                              <div className="flex items-center justify-center">
                                <input
                                  type="checkbox"
                                  checked={isCompleteChecked}
                                  disabled={
                                    !canCompleteCheck || isCompleteLoading
                                  }
                                  onChange={(e) =>
                                    handleToggleCompleteCheck(
                                      item.task,
                                      e.target.checked
                                    )
                                  }
                                  className={`w-5 h-5 rounded border-2 ${
                                    canCompleteCheck
                                      ? "cursor-pointer text-green-600 border-green-300 focus:ring-green-500"
                                      : "cursor-not-allowed text-gray-400 border-gray-300"
                                  } ${isCompleteLoading ? "opacity-50" : ""}`}
                                  title={
                                    !canToggleComplete
                                      ? "只有已批准狀態才能標記完成"
                                      : canCompleteCheck
                                      ? isCompleteChecked
                                        ? "點擊取消完成標記"
                                        : "點擊標記為完成"
                                      : "只有負責人可以操作"
                                  }
                                />
                              </div>
                            );
                          })()}
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
                            // 只有待複審、已完成或已複審狀態才能操作 checkbox
                            const canReviewStatus =
                              item.task.status === "PENDING_REVIEW" ||
                              item.task.status === "COMPLETED" ||
                              item.task.status === "REVIEWED";
                            const canCheck =
                              (isReviewer || isSuperAdmin) &&
                              canReviewStatus;

                            // 沒有複審人時不顯示
                            if (
                              !item.task.reviewers ||
                              item.task.reviewers.length === 0
                            ) {
                              return <span className="text-gray-300">-</span>;
                            }

                            // 顯示 checkbox（有複審人就顯示，但只有已完成狀態才能操作）
                            return (
                              <div className="flex items-center justify-center">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  disabled={!canCheck || isLoading}
                                  onChange={(e) =>
                                    handleToggleReviewCheck(
                                      item.task,
                                      e.target.checked
                                    )
                                  }
                                  className={`w-5 h-5 rounded border-2 ${
                                    canCheck
                                      ? "cursor-pointer text-purple-600 border-purple-300 focus:ring-purple-500"
                                      : "cursor-not-allowed text-gray-400 border-gray-300"
                                  } ${isLoading ? "opacity-50" : ""}`}
                                  title={
                                    !canReviewStatus
                                      ? "只有待複審或已完成狀態才能複審"
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
                                setEditableRemarks(item.task.remarks || "");
                                setApprovalProcessorName(
                                  item.task.processorName || ""
                                );
                                setShowDetailModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                            >
                              詳情
                            </button>
                            {can("admin_task:delete") && (
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
                          const fullChildTask = tasks.find(
                            (t) => t.id === childTask.id
                          ) as AdminTask | undefined;
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
                                <div className="text-sm text-gray-600 max-w-[100px] truncate">
                                  {fullChildTask?.handlers &&
                                  fullChildTask.handlers.length > 0 ? (
                                    fullChildTask.handlers
                                      .map((h) => h.name || h.email)
                                      .join(", ")
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {getStatusBadge(childTask.status)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {(() => {
                                  const deadline = fullChildTask?.deadline;
                                  const deadlineText = fullChildTask?.payload
                                    ?.deadlineText as string;
                                  if (!deadline && !deadlineText) {
                                    return (
                                      <span className="text-sm text-gray-400">
                                        -
                                      </span>
                                    );
                                  }
                                  if (deadlineText && !deadline) {
                                    return (
                                      <span className="text-sm text-gray-500">
                                        {deadlineText}
                                      </span>
                                    );
                                  }
                                  const urgency = getDeadlineUrgency(
                                    deadline ?? null
                                  );
                                  return (
                                    <span
                                      className={`px-2 py-1 rounded text-xs font-medium ${getDeadlineStyle(
                                        urgency
                                      )}`}
                                    >
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
                                {/* 子任務完成確認 checkbox */}
                                {(() => {
                                  if (!fullChildTask)
                                    return (
                                      <span className="text-gray-300">-</span>
                                    );
                                  const isHandler =
                                    fullChildTask.handlers?.some(
                                      (h) => h.id === session?.user?.id
                                    );
                                  const isSuperAdmin =
                                    userRole === "SUPER_ADMIN";
                                  const isCompleteChecked =
                                    fullChildTask.status === "COMPLETED" ||
                                    fullChildTask.status === "REVIEWED" ||
                                    fullChildTask.status === "PENDING_REVIEW";
                                  const isCompleteLoading =
                                    togglingCompleteId === fullChildTask.id;
                                  const canToggleComplete =
                                    fullChildTask.status === "APPROVED" ||
                                    fullChildTask.status === "COMPLETED" ||
                                    fullChildTask.status === "PENDING_REVIEW";
                                  const canCompleteCheck =
                                    (isHandler || isSuperAdmin) &&
                                    canToggleComplete;

                                  if (
                                    !fullChildTask.handlers ||
                                    fullChildTask.handlers.length === 0
                                  ) {
                                    return (
                                      <span className="text-gray-300">-</span>
                                    );
                                  }

                                  return (
                                    <div className="flex items-center justify-center">
                                      <input
                                        type="checkbox"
                                        checked={isCompleteChecked}
                                        disabled={
                                          !canCompleteCheck || isCompleteLoading
                                        }
                                        onChange={(e) =>
                                          handleToggleCompleteCheck(
                                            fullChildTask,
                                            e.target.checked
                                          )
                                        }
                                        className={`w-5 h-5 rounded border-2 ${
                                          canCompleteCheck
                                            ? "cursor-pointer text-green-600 border-green-300 focus:ring-green-500"
                                            : "cursor-not-allowed text-gray-400 border-gray-300"
                                        } ${
                                          isCompleteLoading ? "opacity-50" : ""
                                        }`}
                                        title={
                                          !canToggleComplete
                                            ? "只有已批准狀態才能標記完成"
                                            : canCompleteCheck
                                            ? isCompleteChecked
                                              ? "點擊取消完成標記"
                                              : "點擊標記為完成"
                                            : "只有負責人可以操作"
                                        }
                                      />
                                    </div>
                                  );
                                })()}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-center">
                                {/* 子任務複審確認 checkbox */}
                                {(() => {
                                  if (!fullChildTask)
                                    return (
                                      <span className="text-gray-300">-</span>
                                    );
                                  const isReviewer =
                                    fullChildTask.reviewers?.some(
                                      (r) => r.id === session?.user?.id
                                    );
                                  const isSuperAdmin =
                                    userRole === "SUPER_ADMIN";
                                  const isChecked = !!fullChildTask.reviewedAt;
                                  const isLoading =
                                    togglingReviewId === fullChildTask.id;
                                  // 只有待複審、已完成或已複審狀態才能操作 checkbox
                                  const canReviewStatus =
                                    fullChildTask.status === "PENDING_REVIEW" ||
                                    fullChildTask.status === "COMPLETED" ||
                                    fullChildTask.status === "REVIEWED";
                                  const canCheck =
                                    (isReviewer || isSuperAdmin) &&
                                    canReviewStatus;

                                  if (
                                    !fullChildTask.reviewers ||
                                    fullChildTask.reviewers.length === 0
                                  ) {
                                    return (
                                      <span className="text-gray-300">-</span>
                                    );
                                  }

                                  return (
                                    <div className="flex items-center justify-center">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        disabled={!canCheck || isLoading}
                                        onChange={(e) =>
                                          handleToggleReviewCheck(
                                            fullChildTask,
                                            e.target.checked
                                          )
                                        }
                                        className={`w-5 h-5 rounded border-2 ${
                                          canCheck
                                            ? "cursor-pointer text-purple-600 border-purple-300 focus:ring-purple-500"
                                            : "cursor-not-allowed text-gray-400 border-gray-300"
                                        } ${isLoading ? "opacity-50" : ""}`}
                                        title={
                                          !canReviewStatus
                                            ? "只有待複審或已完成狀態才能複審"
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
                                        setEditableRemarks(
                                          fullChildTask.remarks || ""
                                        );
                                        setApprovalProcessorName(
                                          fullChildTask.processorName || ""
                                        );
                                        setShowDetailModal(true);
                                      }
                                    }}
                                    className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                                  >
                                    詳情
                                  </button>
                                  {can("admin_task:delete") && (
                                    <button
                                      onClick={() =>
                                        handleDeleteTask(childTask.id)
                                      }
                                      disabled={deleting}
                                      className="text-red-600 hover:text-red-800 font-medium text-sm disabled:opacity-50"
                                    >
                                      刪除
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
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
                <div className="flex items-center gap-2 order-1 md:order-2 w-full md:w-auto justify-center flex-wrap">
                  {/* 上一頁按鈕 */}
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 md:py-1.5 border rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 min-h-[44px] md:min-h-0"
                  >
                    上一頁
                  </button>

                  {/* 頁碼按鈕 - 桌面版 */}
                  <div className="hidden md:flex items-center gap-1">
                    {(() => {
                      const pages: (number | string)[] = [];
                      const totalPages = pageInfo.totalPages;
                      const current = currentPage;

                      if (totalPages <= 7) {
                        // 少於等於 7 頁，顯示所有頁碼
                        for (let i = 1; i <= totalPages; i++) {
                          pages.push(i);
                        }
                      } else {
                        // 超過 7 頁，顯示首尾頁和當前頁附近
                        pages.push(1);

                        if (current > 3) {
                          pages.push("...");
                        }

                        const start = Math.max(2, current - 1);
                        const end = Math.min(totalPages - 1, current + 1);

                        for (let i = start; i <= end; i++) {
                          if (!pages.includes(i)) {
                            pages.push(i);
                          }
                        }

                        if (current < totalPages - 2) {
                          pages.push("...");
                        }

                        if (!pages.includes(totalPages)) {
                          pages.push(totalPages);
                        }
                      }

                      return pages.map((page, index) =>
                        page === "..." ? (
                          <span
                            key={`ellipsis-${index}`}
                            className="px-2 text-gray-400"
                          >
                            ...
                          </span>
                        ) : (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page as number)}
                            className={`min-w-[36px] px-3 py-1.5 border rounded-lg text-sm font-medium transition-colors ${
                              currentPage === page
                                ? "bg-blue-600 text-white border-blue-600"
                                : "hover:bg-gray-50"
                            }`}
                          >
                            {page}
                          </button>
                        )
                      );
                    })()}
                  </div>

                  {/* 頁碼下拉選單 - 行動版和桌面版皆可用 */}
                  <select
                    value={currentPage}
                    onChange={(e) => setCurrentPage(Number(e.target.value))}
                    className="md:ml-2 px-3 py-2 md:py-1.5 border rounded-lg text-sm font-medium bg-white hover:bg-gray-50 cursor-pointer min-h-[44px] md:min-h-0"
                  >
                    {Array.from(
                      { length: pageInfo.totalPages },
                      (_, i) => i + 1
                    ).map((page) => (
                      <option key={page} value={page}>
                        第 {page} 頁
                      </option>
                    ))}
                  </select>

                  {/* 下一頁按鈕 */}
                  <button
                    onClick={() =>
                      setCurrentPage((p) =>
                        Math.min(pageInfo.totalPages, p + 1)
                      )
                    }
                    disabled={currentPage === pageInfo.totalPages}
                    className="px-3 py-2 md:py-1.5 border rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 min-h-[44px] md:min-h-0"
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
                      placeholder={
                        selectedTaskType?.titlePlaceholder || "請輸入任務標題"
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* 完成限期 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      完成限期 <span className="text-red-500">*</span>
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
                          {question.type === "RADIO" &&
                            customAnswers[question.id] &&
                            (() => {
                              const selectedAnswer = customAnswers[
                                question.id
                              ] as string;
                              const explanation = question.explanations?.find(
                                (e) => e.answer === selectedAnswer
                              );
                              if (!explanation) return null;
                              const explanationKey = `${question.id}_${selectedAnswer}`;
                              return (
                                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                  <label className="block text-sm font-medium text-blue-800 mb-2">
                                    📝 {explanation.prompt}
                                  </label>
                                  <textarea
                                    value={
                                      explanationTexts[explanationKey] || ""
                                    }
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
                  onClick={() => {
                    setShowDetailModal(false);
                    setIsEditMode(false);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* 編輯按鈕（只在要求修改狀態且是申請人時顯示） */}
                {selectedTask.applicant?.id === session?.user?.id &&
                  selectedTask.status === "REVISION_REQUESTED" &&
                  !isEditMode && (
                    <div className="flex justify-end">
                      <button
                        onClick={openEditMode}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        編輯任務
                      </button>
                    </div>
                  )}

                {/* 編輯表單（編輯模式時顯示） */}
                {isEditMode ? (
                  <div className="space-y-6">
                    {/* 編輯模式標題 */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-blue-800">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                        <span className="font-medium">
                          編輯模式 - 請修改後重新送出審批
                        </span>
                      </div>
                    </div>

                    {/* 基本資訊編輯 */}
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-4">
                        基本資訊
                      </h3>
                      <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                        {/* 類型（唯讀） */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            類型
                          </label>
                          <p className="px-3 py-2 bg-gray-100 rounded-lg text-gray-600">
                            {selectedTask.taskType?.label || "未知類型"}
                          </p>
                        </div>

                        {/* 標題 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            任務標題 <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={editForm.title}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                title: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        {/* 完成限期 */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            完成限期
                          </label>
                          <div className="flex gap-2 mb-2">
                            <button
                              type="button"
                              onClick={() => setEditDeadlineType("date")}
                              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                                editDeadlineType === "date"
                                  ? "bg-blue-600 text-white"
                                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              }`}
                            >
                              選擇日期
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditDeadlineType("text")}
                              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                                editDeadlineType === "text"
                                  ? "bg-blue-600 text-white"
                                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              }`}
                            >
                              輸入文字
                            </button>
                          </div>
                          {editDeadlineType === "date" ? (
                            <input
                              type="datetime-local"
                              value={editForm.deadline}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  deadline: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            <input
                              type="text"
                              value={editForm.deadlineText}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  deadlineText: e.target.value,
                                })
                              }
                              placeholder="例如：待定、盡快、下週前..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 細節編輯 */}
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-4">
                        細節
                      </h3>
                      <textarea
                        value={editForm.notes}
                        onChange={(e) =>
                          setEditForm({ ...editForm, notes: e.target.value })
                        }
                        rows={4}
                        placeholder="請輸入細節..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                    </div>

                    {/* 自訂問題答案編輯 */}
                    {selectedTask.taskType?.questions &&
                      selectedTask.taskType.questions.length > 0 && (
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 mb-4">
                            類型問題回答
                          </h3>
                          <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                            {selectedTask.taskType.questions.map(
                              (question: Question, index: number) => (
                                <div key={question.id} className="space-y-2">
                                  <label className="block text-sm font-medium text-gray-700">
                                    {index + 1}. {question.label}
                                    {question.required && (
                                      <span className="text-red-500 ml-1">
                                        *
                                      </span>
                                    )}
                                  </label>

                                  {/* 文字回答 */}
                                  {question.type === "TEXT" && (
                                    <input
                                      type="text"
                                      value={
                                        (editCustomAnswers[
                                          question.id
                                        ] as string) || ""
                                      }
                                      onChange={(e) =>
                                        setEditCustomAnswers({
                                          ...editCustomAnswers,
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
                                      {question.options.map(
                                        (option, optIndex) => (
                                          <label
                                            key={optIndex}
                                            className="flex items-center gap-2 cursor-pointer"
                                          >
                                            <input
                                              type="radio"
                                              name={`edit_question_${question.id}`}
                                              value={option}
                                              checked={
                                                editCustomAnswers[
                                                  question.id
                                                ] === option
                                              }
                                              onChange={(e) =>
                                                setEditCustomAnswers({
                                                  ...editCustomAnswers,
                                                  [question.id]: e.target.value,
                                                })
                                              }
                                              className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm text-gray-700">
                                              {option}
                                            </span>
                                          </label>
                                        )
                                      )}
                                    </div>
                                  )}

                                  {/* 補充說明輸入 */}
                                  {question.type === "RADIO" &&
                                    editCustomAnswers[question.id] &&
                                    (() => {
                                      const selectedAnswer = editCustomAnswers[
                                        question.id
                                      ] as string;
                                      const explanation =
                                        question.explanations?.find(
                                          (e) => e.answer === selectedAnswer
                                        );
                                      if (!explanation) return null;
                                      const explanationKey = `${question.id}_${selectedAnswer}`;
                                      return (
                                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                          <label className="block text-sm font-medium text-blue-800 mb-2">
                                            {explanation.prompt}
                                          </label>
                                          <textarea
                                            value={
                                              editExplanationTexts[
                                                explanationKey
                                              ] || ""
                                            }
                                            onChange={(e) =>
                                              setEditExplanationTexts({
                                                ...editExplanationTexts,
                                                [explanationKey]:
                                                  e.target.value,
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
                                      {question.options.map(
                                        (option, optIndex) => {
                                          const currentValues =
                                            (editCustomAnswers[
                                              question.id
                                            ] as string[]) || [];
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
                                                    newValues =
                                                      currentValues.filter(
                                                        (v) => v !== option
                                                      );
                                                  }
                                                  setEditCustomAnswers({
                                                    ...editCustomAnswers,
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
                                        }
                                      )}
                                    </div>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                    {/* 編輯操作按鈕 */}
                    <div className="flex gap-3 pt-4 border-t">
                      <button
                        onClick={cancelEditMode}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                      >
                        取消編輯
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        disabled={saving}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? "保存中..." : "保存修改"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* 基本資訊（顯示模式） */}
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
                            {selectedTask.handlers &&
                            selectedTask.handlers.length > 0
                              ? selectedTask.handlers
                                  .map((h) => h.name || h.email)
                                  .join("、")
                              : selectedTask.processorName ||
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
                              : (selectedTask.payload
                                  ?.deadlineText as string) || "-"}
                          </p>
                        </div>
                        {selectedTask.completedAt && (
                          <div>
                            <p className="text-xs text-gray-600 mb-1">
                              已完成時間
                            </p>
                            <p className="text-sm text-gray-900">
                              {formatDate(selectedTask.completedAt)}
                            </p>
                          </div>
                        )}
                        {selectedTask.reviewedAt && (
                          <div>
                            <p className="text-xs text-gray-600 mb-1">
                              已複審時間
                            </p>
                            <p className="text-sm text-gray-900">
                              {formatDate(selectedTask.reviewedAt)}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* 基本資訊編輯記錄 */}
                      {selectedTask.basicInfoHistory && selectedTask.basicInfoHistory.length > 0 && (
                        <div className="mt-3 border-t border-gray-200 pt-3">
                          <p className="text-xs font-medium text-gray-600 mb-2">編輯記錄</p>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {selectedTask.basicInfoHistory.map((record, index) => (
                              <div key={index} className="text-xs bg-white p-3 rounded border border-gray-100">
                                <div className="flex items-center justify-between text-gray-500 mb-2">
                                  <span className="font-medium text-gray-700">{record.userName}</span>
                                  <span>{new Date(record.timestamp).toLocaleString("zh-TW")}</span>
                                </div>
                                <div className="space-y-1">
                                  {record.changes.map((change, changeIndex) => (
                                    <div key={changeIndex} className="flex items-start gap-2">
                                      <span className="text-gray-500 whitespace-nowrap">{change.fieldLabel}：</span>
                                      <div className="flex items-center gap-1 flex-wrap">
                                        <span className="text-red-600 line-through">
                                          {change.oldValue || "(空)"}
                                        </span>
                                        <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
                                        <span className="text-green-600">
                                          {change.newValue || "(空)"}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 細節（顯示模式） */}
                    {(selectedTask.notes || (selectedTask.notesHistory && selectedTask.notesHistory.length > 0)) && (
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-4">
                          細節
                        </h3>
                        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {selectedTask.notes || <span className="text-gray-400">尚無細節</span>}
                          </p>

                          {/* 細節編輯記錄 */}
                          {selectedTask.notesHistory && selectedTask.notesHistory.length > 0 && (
                            <div className="border-t border-gray-200 pt-3">
                              <p className="text-xs font-medium text-gray-600 mb-2">編輯記錄</p>
                              <div className="space-y-2 max-h-40 overflow-y-auto">
                                {selectedTask.notesHistory.map((record, index) => (
                                  <div key={index} className="text-xs bg-white p-2 rounded border border-gray-100">
                                    <div className="flex items-center justify-between text-gray-500 mb-1">
                                      <span className="font-medium text-gray-700">{record.userName}</span>
                                      <span>{new Date(record.timestamp).toLocaleString("zh-TW")}</span>
                                    </div>
                                    <p className="text-gray-600 whitespace-pre-wrap">{record.content}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 備註編輯區（有新增申請權限即可編輯，複審後唯讀） */}
                    {(() => {
                      // 可編輯條件：有 admin_task:create 權限 且 尚未複審完成
                      const canEditRemarks =
                        can("admin_task:create") && !selectedTask.reviewedAt;

                      return (
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            備註
                            {selectedTask.reviewedAt && (
                              <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                已複審，唯讀模式
                              </span>
                            )}
                          </h3>
                          <div className="bg-blue-50 p-4 rounded-lg space-y-4">
                            {/* 備註輸入區 */}
                            {canEditRemarks ? (
                              <>
                                <textarea
                                  value={editableRemarks}
                                  onChange={(e) =>
                                    setEditableRemarks(e.target.value)
                                  }
                                  rows={4}
                                  placeholder="請輸入備註..."
                                  className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white"
                                />
                                <div className="flex justify-end">
                                  <button
                                    onClick={() =>
                                      handleUpdateRemarks(selectedTask)
                                    }
                                    disabled={
                                      savingRemarks ||
                                      editableRemarks ===
                                        (selectedTask.remarks || "")
                                    }
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                                  >
                                    {savingRemarks ? "保存中..." : "保存備註"}
                                  </button>
                                </div>
                              </>
                            ) : (
                              <div className="bg-white p-3 rounded-lg border border-blue-200">
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                  {editableRemarks || (
                                    <span className="text-gray-400">
                                      尚無備註
                                    </span>
                                  )}
                                </p>
                              </div>
                            )}

                            {/* 編輯記錄 */}
                            {selectedTask.remarksHistory && selectedTask.remarksHistory.length > 0 && (
                              <div className="border-t border-blue-200 pt-3">
                                <p className="text-xs font-medium text-gray-600 mb-2">編輯記錄</p>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                  {selectedTask.remarksHistory.map((record, index) => (
                                    <div key={index} className="text-xs bg-white p-2 rounded border border-gray-100">
                                      <div className="flex items-center justify-between text-gray-500 mb-1">
                                        <span className="font-medium text-gray-700">{record.userName}</span>
                                        <span>{new Date(record.timestamp).toLocaleString("zh-TW")}</span>
                                      </div>
                                      <p className="text-gray-600 whitespace-pre-wrap">{record.content}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* 自訂問題答案（顯示模式） */}
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
                                  (Array.isArray(answer) &&
                                    answer.length === 0) ||
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

                    {/* 審批記錄（分組摺疊） */}
                    {selectedTask.approvalRecords.length > 0 && (
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-4">
                          審批記錄
                        </h3>
                        {(() => {
                          // 先按時間排序（從舊到新）
                          const sortedRecords = [...selectedTask.approvalRecords].sort(
                            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                          );

                          // 將審批記錄分組：每次 resubmit 開啟新一輪
                          const rounds: ApprovalRecord[][] = [];
                          let currentRound: ApprovalRecord[] = [];

                          sortedRecords.forEach((record) => {
                            if (record.action === "resubmit" && currentRound.length > 0) {
                              // resubmit 開啟新一輪
                              rounds.push(currentRound);
                              currentRound = [record];
                            } else {
                              currentRound.push(record);
                            }
                          });
                          if (currentRound.length > 0) {
                            rounds.push(currentRound);
                          }

                          // 取得輪次的最後一筆記錄作為摘要
                          const getRoundSummary = (round: ApprovalRecord[]) => {
                            const lastRecord = round[round.length - 1];
                            const firstRecord = round[0];
                            const actionLabel: Record<string, string> = {
                              approve: "批准",
                              reject: "退回",
                              pending_documents: "待補件",
                              request_revision: "要求修改",
                              resubmit: "重新送出",
                            };
                            return {
                              lastAction: actionLabel[lastRecord.action] || lastRecord.action,
                              lastDate: lastRecord.createdAt,
                              firstDate: firstRecord.createdAt,
                              isResubmit: firstRecord.action === "resubmit",
                            };
                          };

                          return (
                            <div className="space-y-2">
                              {rounds.map((round, roundIndex) => {
                                const isExpanded = expandedApprovalRounds.has(roundIndex);
                                const summary = getRoundSummary(round);
                                const toggleExpand = () => {
                                  setExpandedApprovalRounds((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(roundIndex)) {
                                      next.delete(roundIndex);
                                    } else {
                                      next.add(roundIndex);
                                    }
                                    return next;
                                  });
                                };

                                return (
                                  <div key={roundIndex} className="border border-gray-200 rounded-lg overflow-hidden">
                                    {/* 摺疊標題 */}
                                    <button
                                      onClick={toggleExpand}
                                      className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-left"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="text-gray-400">{isExpanded ? "▼" : "▶"}</span>
                                        <span className="text-sm font-medium text-gray-700">
                                          第 {roundIndex + 1} 輪
                                          {summary.isResubmit && roundIndex > 0 && " (重新送出)"}
                                        </span>
                                        <span className={`px-2 py-0.5 text-xs rounded font-medium ${
                                          summary.lastAction === "批准" ? "bg-green-100 text-green-800" :
                                          summary.lastAction === "退回" ? "bg-red-100 text-red-800" :
                                          summary.lastAction === "待補件" ? "bg-orange-100 text-orange-800" :
                                          summary.lastAction === "要求修改" ? "bg-yellow-100 text-yellow-800" :
                                          "bg-blue-100 text-blue-800"
                                        }`}>
                                          {summary.lastAction}
                                        </span>
                                      </div>
                                      <span className="text-xs text-gray-500">
                                        {formatDate(summary.firstDate)}
                                      </span>
                                    </button>

                                    {/* 展開內容 */}
                                    {isExpanded && (
                                      <div className="p-4 space-y-3 bg-white">
                                        {round.map((record) => (
                                          <div key={record.id} className="bg-gray-50 p-3 rounded-lg">
                                            <div className="flex items-start justify-between">
                                              <div>
                                                <span className={`px-2 py-1 text-xs rounded font-medium ${
                                                  record.action === "approve" ? "bg-green-100 text-green-800" :
                                                  record.action === "reject" ? "bg-red-100 text-red-800" :
                                                  record.action === "pending_documents" ? "bg-orange-100 text-orange-800" :
                                                  record.action === "resubmit" ? "bg-blue-100 text-blue-800" :
                                                  "bg-yellow-100 text-yellow-800"
                                                }`}>
                                                  {record.action === "approve" ? "批准" :
                                                   record.action === "reject" ? "退回" :
                                                   record.action === "pending_documents" ? "待補件" :
                                                   record.action === "resubmit" ? "重新送出" :
                                                   "要求修改"}
                                                </span>
                                                <span className="ml-2 text-sm text-gray-600">
                                                  {record.approver?.name || record.approver?.email}
                                                </span>
                                              </div>
                                              <span className="text-xs text-gray-500">
                                                {formatDate(record.createdAt)}
                                              </span>
                                            </div>
                                            {record.comment && (
                                              <p className="mt-2 text-sm text-gray-700">{record.comment}</p>
                                            )}
                                            {/* 要求修改詳情 */}
                                            {record.action === "request_revision" &&
                                              (record.revisionReason || record.revisionDetail || record.revisionDeadline) && (
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
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* 審批操作（僅待處理/待補件狀態且有審批權限才顯示） */}
                    {can("admin_task:approve") &&
                      (selectedTask.status === "PENDING" ||
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
                                    修改原因類別{" "}
                                    <span className="text-red-500">*</span>
                                  </label>
                                  <select
                                    value={revisionReason}
                                    onChange={(e) =>
                                      setRevisionReason(e.target.value)
                                    }
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                  >
                                    <option value="">請選擇原因類別</option>
                                    <option value="資料不完整">
                                      資料不完整
                                    </option>
                                    <option value="格式錯誤">格式錯誤</option>
                                    <option value="內容有誤">內容有誤</option>
                                    <option value="缺少附件">缺少附件</option>
                                    <option value="需補充說明">
                                      需補充說明
                                    </option>
                                    <option value="其他">其他</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    具體修改說明{" "}
                                    <span className="text-red-500">*</span>
                                  </label>
                                  <textarea
                                    value={revisionDetail}
                                    onChange={(e) =>
                                      setRevisionDetail(e.target.value)
                                    }
                                    rows={3}
                                    placeholder="請詳細說明需要修改的內容..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 resize-none"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    修改期限{" "}
                                    <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="date"
                                    value={revisionDeadline}
                                    onChange={(e) =>
                                      setRevisionDeadline(e.target.value)
                                    }
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
                                onChange={(e) =>
                                  setApprovalComment(e.target.value)
                                }
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
                                (approvalAction === "request_revision" &&
                                  (!revisionReason ||
                                    !revisionDetail ||
                                    !revisionDeadline))
                              }
                              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {approving ? "處理中..." : "確認審批"}
                            </button>
                          </div>
                        </div>
                      )}

                    {/* 完成確認 & 複審確認區塊 */}
                    {(() => {
                      const isHandler = selectedTask.handlers?.some(
                        (h) => h.id === session?.user?.id
                      );
                      const isReviewer = selectedTask.reviewers?.some(
                        (r) => r.id === session?.user?.id
                      );
                      const isSuperAdmin = userRole === "SUPER_ADMIN";
                      const hasHandlers = selectedTask.handlers && selectedTask.handlers.length > 0;
                      const hasReviewers = selectedTask.reviewers && selectedTask.reviewers.length > 0;

                      // 完成確認狀態
                      const isCompleteChecked =
                        selectedTask.status === "COMPLETED" ||
                        selectedTask.status === "REVIEWED" ||
                        selectedTask.status === "PENDING_REVIEW";
                      const canToggleComplete =
                        selectedTask.status === "APPROVED" ||
                        selectedTask.status === "COMPLETED" ||
                        selectedTask.status === "PENDING_REVIEW";
                      const canCompleteCheck =
                        canToggleComplete && (isHandler || isSuperAdmin);
                      const isCompleteLoading = togglingCompleteId === selectedTask.id;

                      // 複審確認狀態
                      const isReviewChecked = !!selectedTask.reviewedAt;
                      const canReviewStatus =
                        selectedTask.status === "PENDING_REVIEW" ||
                        selectedTask.status === "COMPLETED" ||
                        selectedTask.status === "REVIEWED";
                      const canReviewCheck =
                        canReviewStatus && (isReviewer || isSuperAdmin);
                      const isReviewLoading = togglingReviewId === selectedTask.id;

                      // 只有當有負責人或複審人時才顯示此區域
                      if (!hasHandlers && !hasReviewers) return null;

                      return (
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 mb-4">
                            確認狀態
                          </h3>
                          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                            {/* 完成確認 */}
                            {hasHandlers && (
                              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                                <div className="flex items-center gap-3">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={isCompleteChecked}
                                      disabled={!canCompleteCheck || isCompleteLoading}
                                      onChange={(e) =>
                                        handleToggleCompleteCheck(
                                          selectedTask,
                                          e.target.checked
                                        )
                                      }
                                      className={`w-5 h-5 rounded border-2 ${
                                        isCompleteChecked
                                          ? "bg-green-500 border-green-500"
                                          : "border-gray-300"
                                      } ${
                                        canCompleteCheck
                                          ? "cursor-pointer"
                                          : "cursor-not-allowed opacity-50"
                                      }`}
                                    />
                                    <span
                                      className={`text-sm font-medium ${
                                        canCompleteCheck
                                          ? "text-gray-700"
                                          : "text-gray-400"
                                      }`}
                                    >
                                      完成確認
                                    </span>
                                  </label>
                                  {isCompleteLoading && (
                                    <span className="text-xs text-gray-500">處理中...</span>
                                  )}
                                </div>
                                {selectedTask.completedAt && (
                                  <div className="text-right">
                                    <p className="text-xs text-gray-500">打勾時間</p>
                                    <p className="text-sm text-green-600 font-medium">
                                      {new Date(selectedTask.completedAt).toLocaleString("zh-TW")}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* 複審確認 */}
                            {hasReviewers && (
                              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                                <div className="flex items-center gap-3">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={isReviewChecked}
                                      disabled={!canReviewCheck || isReviewLoading}
                                      onChange={(e) =>
                                        handleToggleReviewCheck(
                                          selectedTask,
                                          e.target.checked
                                        )
                                      }
                                      className={`w-5 h-5 rounded border-2 ${
                                        isReviewChecked
                                          ? "bg-purple-500 border-purple-500"
                                          : "border-gray-300"
                                      } ${
                                        canReviewCheck
                                          ? "cursor-pointer"
                                          : "cursor-not-allowed opacity-50"
                                      }`}
                                    />
                                    <span
                                      className={`text-sm font-medium ${
                                        canReviewCheck
                                          ? "text-gray-700"
                                          : "text-gray-400"
                                      }`}
                                    >
                                      複審確認
                                    </span>
                                  </label>
                                  {isReviewLoading && (
                                    <span className="text-xs text-gray-500">處理中...</span>
                                  )}
                                </div>
                                {selectedTask.reviewedAt && (
                                  <div className="text-right">
                                    <p className="text-xs text-gray-500">打勾時間</p>
                                    <p className="text-sm text-purple-600 font-medium">
                                      {new Date(selectedTask.reviewedAt).toLocaleString("zh-TW")}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

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
                            {selectedTask.approvalRecords &&
                              selectedTask.approvalRecords.length > 0 &&
                              (() => {
                                const latestRevision =
                                  selectedTask.approvalRecords.find(
                                    (r: ApprovalRecord) =>
                                      r.action === "request_revision" ||
                                      r.action === "pending_documents"
                                  );
                                if (latestRevision) {
                                  return (
                                    <div className="bg-white border border-pink-100 rounded-lg p-3 text-sm">
                                      <p className="font-medium text-gray-700 mb-2">
                                        審批意見：
                                      </p>
                                      {latestRevision.revisionReason && (
                                        <p className="text-gray-600">
                                          原因類別：
                                          {latestRevision.revisionReason}
                                        </p>
                                      )}
                                      {latestRevision.revisionDetail && (
                                        <p className="text-gray-600 mt-1">
                                          修改說明：
                                          {latestRevision.revisionDetail}
                                        </p>
                                      )}
                                      {latestRevision.revisionDeadline && (
                                        <p className="text-gray-600 mt-1">
                                          期限：
                                          {new Date(
                                            latestRevision.revisionDeadline
                                          ).toLocaleDateString("zh-TW")}
                                        </p>
                                      )}
                                      {latestRevision.comment &&
                                        !latestRevision.revisionDetail && (
                                          <p className="text-gray-600">
                                            {latestRevision.comment}
                                          </p>
                                        )}
                                    </div>
                                  );
                                }
                                return null;
                              })()}

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                備註說明（選填）
                              </label>
                              <textarea
                                value={resubmitNotes}
                                onChange={(e) =>
                                  setResubmitNotes(e.target.value)
                                }
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
                  </>
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
                        <p className="font-medium text-gray-900">
                          {type.label}
                        </p>
                        {type.description && (
                          <p className="text-sm text-gray-600">
                            {type.description}
                          </p>
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
                      console.log(
                        "[稍後處理] 點擊，lastCreatedTaskId:",
                        lastCreatedTaskId,
                        "triggeredTaskTypes:",
                        triggeredTaskTypes
                      );
                      // 創建待處理提醒
                      if (lastCreatedTaskId && triggeredTaskTypes.length > 0) {
                        try {
                          const remindersData = triggeredTaskTypes.map((t) => ({
                            taskTypeId: Number(t.id),
                            taskTypeLabel: t.label,
                          }));
                          console.log(
                            "[稍後處理] 準備創建提醒:",
                            remindersData
                          );
                          await createReminders(
                            lastCreatedTaskId,
                            remindersData
                          );
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
