"use client";

import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/Admin/AdminLayout";

interface ContactSubmission {
  id: number;
  questionType: string;
  questionLabel: string | null;
  name: string;
  email: string;
  phone: string;
  message: string;
  status: string;
  notes: string | null;
  repliedAt: string | null;
  createdAt: string;
}

interface QuestionType {
  id: string;
  label: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const statusLabels: Record<string, string> = {
  pending: "待處理",
  read: "已讀",
  replied: "已回覆",
  archived: "已封存",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  read: "bg-blue-100 text-blue-800",
  replied: "bg-green-100 text-green-800",
  archived: "bg-gray-100 text-gray-800",
};

export default function ContactSubmissionsPage() {
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [filterStatus, setFilterStatus] = useState("");
  const [filterQuestionType, setFilterQuestionType] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<ContactSubmission | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSubmissions = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", pagination.page.toString());
      params.set("limit", pagination.limit.toString());
      if (filterStatus) params.set("status", filterStatus);
      if (filterQuestionType) params.set("questionType", filterQuestionType);
      if (searchKeyword) params.set("search", searchKeyword);

      const res = await fetch(`/api/contact-submission?${params.toString()}`);
      const data = await res.json();
      setSubmissions(data.submissions || []);
      setPagination(data.pagination || pagination);
    } catch (error) {
      console.error("載入失敗:", error);
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, filterStatus, filterQuestionType, searchKeyword]);

  const fetchQuestionTypes = async () => {
    try {
      const query = `
        query contactPage {
          contactPage {
            questionTypes
          }
        }
      `;
      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const { data } = await res.json();
      if (data?.contactPage[0]?.questionTypes) {
        setQuestionTypes(data.contactPage[0].questionTypes);
      }
    } catch (error) {
      console.error("載入問題類型失敗:", error);
    }
  };

  useEffect(() => {
    fetchQuestionTypes();
  }, []);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const updateStatus = async (id: number, status: string) => {
    try {
      await fetch(`/api/contact-submission/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchSubmissions();
      if (selectedSubmission?.id === id) {
        setSelectedSubmission((prev) => prev ? { ...prev, status } : null);
      }
    } catch (error) {
      console.error("更新失敗:", error);
    }
  };

  const deleteSubmission = async (id: number) => {
    if (!confirm("確定要刪除此提交記錄嗎？")) return;
    try {
      await fetch(`/api/contact-submission/${id}`, {
        method: "DELETE",
      });
      fetchSubmissions();
      if (selectedSubmission?.id === id) {
        setSelectedSubmission(null);
      }
    } catch (error) {
      console.error("刪除失敗:", error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="text-3xl font-bold mb-6">聯絡表單管理</div>

        {/* 篩選區塊 */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium mb-1">狀態</label>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">全部狀態</option>
                <option value="pending">待處理</option>
                <option value="read">已讀</option>
                <option value="replied">已回覆</option>
                <option value="archived">已封存</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">問題類型</label>
              <select
                value={filterQuestionType}
                onChange={(e) => {
                  setFilterQuestionType(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">全部類型</option>
                {questionTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">搜尋</label>
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setPagination((prev) => ({ ...prev, page: 1 }));
                    fetchSubmissions();
                  }
                }}
                placeholder="搜尋姓名、Email、電話..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <button
              onClick={() => {
                setPagination((prev) => ({ ...prev, page: 1 }));
                fetchSubmissions();
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              搜尋
            </button>
          </div>
        </div>

        <div className="flex gap-6">
          {/* 列表 */}
          <div className="flex-1 bg-white rounded-lg shadow overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">載入中...</div>
            ) : submissions.length === 0 ? (
              <div className="p-8 text-center text-gray-500">沒有找到任何提交記錄</div>
            ) : (
              <>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">問題類型</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">姓名</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">聯絡方式</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">狀態</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">提交時間</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {submissions.map((submission) => (
                      <tr
                        key={submission.id}
                        className={`hover:bg-gray-50 cursor-pointer ${
                          selectedSubmission?.id === submission.id ? "bg-blue-50" : ""
                        }`}
                        onClick={() => {
                          setSelectedSubmission(submission);
                          if (submission.status === "pending") {
                            updateStatus(submission.id, "read");
                          }
                        }}
                      >
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded text-sm">
                            <span className="material-symbols-outlined text-base">category</span>
                            {submission.questionLabel || submission.questionType}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium">{submission.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <div>{submission.email}</div>
                          <div>{submission.phone}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-sm ${statusColors[submission.status]}`}>
                            {statusLabels[submission.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {formatDate(submission.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <select
                              value={submission.status}
                              onChange={(e) => {
                                e.stopPropagation();
                                updateStatus(submission.id, e.target.value);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="text-sm px-2 py-1 border border-gray-300 rounded"
                            >
                              <option value="pending">待處理</option>
                              <option value="read">已讀</option>
                              <option value="replied">已回覆</option>
                              <option value="archived">已封存</option>
                            </select>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteSubmission(submission.id);
                              }}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                            >
                              <span className="material-symbols-outlined text-base">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* 分頁 */}
                {pagination.totalPages > 1 && (
                  <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      共 {pagination.total} 筆，第 {pagination.page} / {pagination.totalPages} 頁
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                        disabled={pagination.page <= 1}
                        className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
                      >
                        上一頁
                      </button>
                      <button
                        onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                        disabled={pagination.page >= pagination.totalPages}
                        className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
                      >
                        下一頁
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* 詳細資訊側邊欄 */}
          {selectedSubmission && (
            <div className="w-96 bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold">詳細資訊</h3>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-500">問題類型</label>
                  <p className="font-medium">
                    {selectedSubmission.questionLabel || selectedSubmission.questionType}
                  </p>
                </div>

                <div>
                  <label className="text-sm text-gray-500">姓名</label>
                  <p className="font-medium">{selectedSubmission.name}</p>
                </div>

                <div>
                  <label className="text-sm text-gray-500">電子信箱</label>
                  <p className="font-medium">
                    <a href={`mailto:${selectedSubmission.email}`} className="text-blue-600 hover:underline">
                      {selectedSubmission.email}
                    </a>
                  </p>
                </div>

                <div>
                  <label className="text-sm text-gray-500">聯絡電話</label>
                  <p className="font-medium">
                    <a href={`tel:${selectedSubmission.phone}`} className="text-blue-600 hover:underline">
                      {selectedSubmission.phone}
                    </a>
                  </p>
                </div>

                <div>
                  <label className="text-sm text-gray-500">訊息內容</label>
                  <p className="mt-1 p-3 bg-gray-50 rounded-lg whitespace-pre-wrap">
                    {selectedSubmission.message}
                  </p>
                </div>

                <div>
                  <label className="text-sm text-gray-500">提交時間</label>
                  <p className="font-medium">{formatDate(selectedSubmission.createdAt)}</p>
                </div>

                {selectedSubmission.repliedAt && (
                  <div>
                    <label className="text-sm text-gray-500">回覆時間</label>
                    <p className="font-medium">{formatDate(selectedSubmission.repliedAt)}</p>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <div className="flex gap-2">
                    <a
                      href={`mailto:${selectedSubmission.email}`}
                      className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2"
                      onClick={() => updateStatus(selectedSubmission.id, "replied")}
                    >
                      <span className="material-symbols-outlined text-base">mail</span>
                      回覆郵件
                    </a>
                    <a
                      href={`tel:${selectedSubmission.phone}`}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-base">call</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
