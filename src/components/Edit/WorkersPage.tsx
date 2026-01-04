"use client";
import { gql } from "graphql-tag";
import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { ImageUploader } from "@/components/Admin/ImageUploader";
import { useSession } from "next-auth/react";
import { graphqlRequest } from "@/utils/graphqlClient";
import { exportToExcel } from "@/lib/exportExcel";

const UPDATE_PAGE = gql`
  mutation UpdateWorkersPage($input: UpdateWorkersPageInput!) {
    updateWorkersPage(input: $input) {
      hero
      filterOptions
      workers
      ctaSection
    }
  }
`;

const query = `
  query workersPage {
    workersPage {
      hero
      filterOptions
      workers
      ctaSection
    }
  }
`;

interface Worker {
  id: string;
  name: string;
  foreignId: string;
  age: number;
  gender: string;
  country: string;
  photo: string;
  experience: string;
  education: string;
  height: number;
  weight: number;
  skills: string[];
  languages: string[];
  availability: string;
  category: string;
  sourceType: string;
  description: string;
}

interface PageData {
  hero: {
    title: string;
    description: string;
    image: string;
  };
  filterOptions: {
    categories: string[];
    countries: string[];
    genders: string[];
    sourceTypes: string[];
  };
  workers: Worker[];
  ctaSection: {
    title: string;
    description: string;
    buttonText: string;
    buttonLink: string;
  };
}

type ViewMode = "list" | "settings";
type SortField = "name" | "age" | "country" | "category" | "sourceType";
type SortOrder = "asc" | "desc";

const emptyWorker: Worker = {
  id: "",
  name: "",
  foreignId: "",
  age: 25,
  gender: "男",
  country: "",
  photo: "",
  experience: "",
  education: "",
  height: 0,
  weight: 0,
  skills: [],
  languages: [],
  availability: "",
  category: "",
  sourceType: "國外引進工",
  description: "",
};

export const WorkersPage = () => {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [pageData, setPageData] = useState<PageData>({
    hero: { title: "", description: "", image: "" },
    filterOptions: { categories: [], countries: [], genders: [], sourceTypes: [] },
    workers: [],
    ctaSection: { title: "", description: "", buttonText: "", buttonLink: "" },
  });

  // 列表相關狀態
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterCountry, setFilterCountry] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [filterSourceType, setFilterSourceType] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // 選取和批次操作
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 編輯模態框
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [isNewWorker, setIsNewWorker] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
        const { data } = await res.json();

        if (data?.workersPage[0]) {
          setPageData(data.workersPage[0]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // 篩選和排序後的資料
  const filteredWorkers = useMemo(() => {
    let result = [...pageData.workers];

    // 搜尋
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      result = result.filter(
        (w) =>
          w.name.toLowerCase().includes(keyword) ||
          w.foreignId?.toLowerCase().includes(keyword) ||
          w.description?.toLowerCase().includes(keyword) ||
          w.experience?.toLowerCase().includes(keyword)
      );
    }

    // 篩選
    if (filterCategory) {
      result = result.filter((w) => w.category === filterCategory);
    }
    if (filterCountry) {
      result = result.filter((w) => w.country === filterCountry);
    }
    if (filterGender) {
      result = result.filter((w) => w.gender === filterGender);
    }
    if (filterSourceType) {
      result = result.filter((w) => w.sourceType === filterSourceType);
    }

    // 排序
    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [pageData.workers, searchKeyword, filterCategory, filterCountry, filterGender, filterSourceType, sortField, sortOrder]);

  // 分頁資料
  const paginatedWorkers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredWorkers.slice(start, start + itemsPerPage);
  }, [filteredWorkers, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredWorkers.length / itemsPerPage);

  // 全選/取消全選當前頁
  const toggleSelectAll = () => {
    const currentPageIds = paginatedWorkers.map((w) => w.id);
    const allSelected = currentPageIds.every((id) => selectedIds.has(id));

    if (allSelected) {
      const newSelected = new Set(selectedIds);
      currentPageIds.forEach((id) => newSelected.delete(id));
      setSelectedIds(newSelected);
    } else {
      const newSelected = new Set(selectedIds);
      currentPageIds.forEach((id) => newSelected.add(id));
      setSelectedIds(newSelected);
    }
  };

  // 單選
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // 批次刪除
  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`確定要刪除選取的 ${selectedIds.size} 筆資料嗎？`)) return;

    const newWorkers = pageData.workers.filter((w) => !selectedIds.has(w.id));
    const newPageData = { ...pageData, workers: newWorkers };

    setIsSaving(true);
    try {
      const response = await graphqlRequest(
        UPDATE_PAGE.loc?.source.body || "",
        { input: newPageData },
        session
      );
      if (response.errors) {
        alert("刪除失敗：" + JSON.stringify(response.errors));
      } else {
        setPageData(newPageData);
        setSelectedIds(new Set());
        alert("刪除成功");
      }
    } catch (err) {
      alert("刪除失敗：" + err);
    } finally {
      setIsSaving(false);
    }
  };

  // 開啟新增模態框
  const openAddModal = () => {
    setEditingWorker({
      ...emptyWorker,
      id: `worker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    });
    setIsNewWorker(true);
    setIsModalOpen(true);
  };

  // 開啟編輯模態框
  const openEditModal = (worker: Worker) => {
    setEditingWorker({ ...worker });
    setIsNewWorker(false);
    setIsModalOpen(true);
  };

  // 儲存單筆編輯
  const handleSaveWorker = async () => {
    if (!editingWorker) return;

    let newWorkers: Worker[];
    if (isNewWorker) {
      newWorkers = [...pageData.workers, editingWorker];
    } else {
      newWorkers = pageData.workers.map((w) =>
        w.id === editingWorker.id ? editingWorker : w
      );
    }

    const newPageData = { ...pageData, workers: newWorkers };

    setIsSaving(true);
    try {
      const response = await graphqlRequest(
        UPDATE_PAGE.loc?.source.body || "",
        { input: newPageData },
        session
      );
      if (response.errors) {
        alert("儲存失敗：" + JSON.stringify(response.errors));
      } else {
        setPageData(newPageData);
        setIsModalOpen(false);
        setEditingWorker(null);
        alert(isNewWorker ? "新增成功" : "更新成功");
      }
    } catch (err) {
      alert("儲存失敗：" + err);
    } finally {
      setIsSaving(false);
    }
  };

  // 刪除單筆
  const handleDeleteWorker = async (id: string) => {
    if (!confirm("確定要刪除此移工資料嗎？")) return;

    const newWorkers = pageData.workers.filter((w) => w.id !== id);
    const newPageData = { ...pageData, workers: newWorkers };

    setIsSaving(true);
    try {
      const response = await graphqlRequest(
        UPDATE_PAGE.loc?.source.body || "",
        { input: newPageData },
        session
      );
      if (response.errors) {
        alert("刪除失敗：" + JSON.stringify(response.errors));
      } else {
        setPageData(newPageData);
        alert("刪除成功");
      }
    } catch (err) {
      alert("刪除失敗：" + err);
    } finally {
      setIsSaving(false);
    }
  };

  // 儲存篩選選項設定
  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const response = await graphqlRequest(
        UPDATE_PAGE.loc?.source.body || "",
        { input: pageData },
        session
      );
      if (response.errors) {
        alert("更新失敗：" + JSON.stringify(response.errors));
      } else {
        alert("更新成功");
      }
    } catch (err) {
      alert("更新失敗：" + err);
    } finally {
      setIsSaving(false);
    }
  };

  // 排序處理
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="ml-1">{sortOrder === "asc" ? "↑" : "↓"}</span>;
  };

  // 重置篩選
  const resetFilters = () => {
    setSearchKeyword("");
    setFilterCategory("");
    setFilterCountry("");
    setFilterGender("");
    setFilterSourceType("");
    setCurrentPage(1);
  };

  // 導出 Excel - 導出所有移工資料（根據目前篩選條件）
  const handleExportExcel = async () => {
    if (filteredWorkers.length === 0) {
      alert("沒有資料可以導出");
      return;
    }

    setExporting(true);
    try {
      exportToExcel({
        filename: "移工資料列表",
        sheetName: "移工",
        columns: [
          { key: "name", header: "姓名", width: 15 },
          { key: "foreignId", header: "外國人編號", width: 15 },
          { key: "age", header: "年齡", width: 8 },
          { key: "gender", header: "性別", width: 8 },
          { key: "country", header: "國家", width: 12 },
          { key: "category", header: "職業類別", width: 12 },
          { key: "sourceType", header: "來源類型", width: 12 },
          { key: "education", header: "學歷", width: 12 },
          { key: "height", header: "身高(cm)", width: 10 },
          { key: "weight", header: "體重(kg)", width: 10 },
          { key: "experience", header: "工作經驗", width: 20 },
          { key: "availability", header: "可上工時間", width: 15 },
          { key: "skills", header: "技能", width: 25, format: (value) => Array.isArray(value) ? value.join(", ") : "" },
          { key: "languages", header: "語言能力", width: 20, format: (value) => Array.isArray(value) ? value.join(", ") : "" },
          { key: "description", header: "個人描述", width: 30 },
        ],
        data: filteredWorkers,
      });
    } catch (error) {
      console.error("導出失敗:", error);
      alert("導出失敗，請稍後再試");
    } finally {
      setExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-t-4 border-t-blue-500 border-gray-200 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      {/* 載入遮罩 */}
      {isSaving && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-5 rounded-lg flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-t-4 border-t-blue-500 border-gray-200 rounded-full animate-spin mb-3"></div>
            <p className="text-gray-700">資料處理中，請稍候...</p>
          </div>
        </div>
      )}

      <div className="text-3xl font-bold mb-6">移工資料管理</div>

      {/* Tab 切換 */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setViewMode("list")}
          className={`px-4 py-2 font-medium -mb-px ${
            viewMode === "list"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          移工列表
        </button>
        <button
          onClick={() => setViewMode("settings")}
          className={`px-4 py-2 font-medium -mb-px ${
            viewMode === "settings"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          篩選選項設定
        </button>
      </div>

      {viewMode === "list" ? (
        <>
          {/* 篩選區塊 */}
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium mb-1">搜尋</label>
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => {
                    setSearchKeyword(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="搜尋姓名、外國人編號、描述..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">職業類別</label>
                <select
                  value={filterCategory}
                  onChange={(e) => {
                    setFilterCategory(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">全部類別</option>
                  {pageData.filterOptions.categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">國家</label>
                <select
                  value={filterCountry}
                  onChange={(e) => {
                    setFilterCountry(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">全部國家</option>
                  {pageData.filterOptions.countries.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">性別</label>
                <select
                  value={filterGender}
                  onChange={(e) => {
                    setFilterGender(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">全部性別</option>
                  {pageData.filterOptions.genders.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">來源類型</label>
                <select
                  value={filterSourceType}
                  onChange={(e) => {
                    setFilterSourceType(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">全部來源</option>
                  {(pageData.filterOptions.sourceTypes || []).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={resetFilters}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                清除篩選
              </button>
            </div>
          </div>

          {/* 操作列 */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <span className="text-gray-600">
                共 {filteredWorkers.length} 筆資料
                {selectedIds.size > 0 && ` (已選取 ${selectedIds.size} 筆)`}
              </span>
              {selectedIds.size > 0 && (
                <button
                  onClick={handleBatchDelete}
                  className="px-3 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                >
                  批次刪除
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleExportExcel}
                disabled={filteredWorkers.length === 0 || exporting}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting ? "導出中..." : "導出 Excel"}
              </button>
              <button
                onClick={openAddModal}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-base">add</span>
                新增移工
              </button>
            </div>
          </div>

          {/* 列表 */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {paginatedWorkers.length === 0 ? (
              <div className="p-8 text-center text-gray-500">沒有找到任何移工資料</div>
            ) : (
              <>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left w-10">
                        <input
                          type="checkbox"
                          checked={
                            paginatedWorkers.length > 0 &&
                            paginatedWorkers.every((w) => selectedIds.has(w.id))
                          }
                          onChange={toggleSelectAll}
                          className="w-4 h-4"
                        />
                      </th>
                      <th className="px-4 py-3 text-left w-16">照片</th>
                      <th
                        className="px-4 py-3 text-left text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("name")}
                      >
                        姓名 <SortIcon field="name" />
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">外國人編號</th>
                      <th
                        className="px-4 py-3 text-left text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("age")}
                      >
                        年齡 <SortIcon field="age" />
                      </th>
                      <th
                        className="px-4 py-3 text-left text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("country")}
                      >
                        國家 <SortIcon field="country" />
                      </th>
                      <th
                        className="px-4 py-3 text-left text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("category")}
                      >
                        職業類別 <SortIcon field="category" />
                      </th>
                      <th
                        className="px-4 py-3 text-left text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort("sourceType")}
                      >
                        來源類型 <SortIcon field="sourceType" />
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedWorkers.map((worker) => (
                      <tr key={worker.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(worker.id)}
                            onChange={() => toggleSelect(worker.id)}
                            className="w-4 h-4"
                          />
                        </td>
                        <td className="px-4 py-3">
                          {worker.photo ? (
                            <Image
                              src={worker.photo}
                              alt={worker.name}
                              width={40}
                              height={40}
                              className="rounded-full object-cover w-10 h-10"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                              <span className="material-symbols-outlined text-gray-400">person</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium">{worker.name || "-"}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{worker.foreignId || "-"}</td>
                        <td className="px-4 py-3">{worker.age || "-"}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                            {worker.country || "-"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 rounded text-sm">
                            {worker.category || "-"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded text-sm ${
                              worker.sourceType === "國內轉出工"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {worker.sourceType || "-"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => openEditModal(worker)}
                              className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"
                              title="編輯"
                            >
                              <span className="material-symbols-outlined text-base">edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteWorker(worker.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                              title="刪除"
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
                {totalPages > 1 && (
                  <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      共 {filteredWorkers.length} 筆，第 {currentPage} / {totalPages} 頁
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage <= 1}
                        className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-100"
                      >
                        首頁
                      </button>
                      <button
                        onClick={() => setCurrentPage((prev) => prev - 1)}
                        disabled={currentPage <= 1}
                        className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-100"
                      >
                        上一頁
                      </button>
                      <span className="px-3 py-1">
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage((prev) => prev + 1)}
                        disabled={currentPage >= totalPages}
                        className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-100"
                      >
                        下一頁
                      </button>
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage >= totalPages}
                        className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 hover:bg-gray-100"
                      >
                        末頁
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      ) : (
        /* 篩選選項設定頁面 */
        <div className="space-y-6">
          <div className="bg-purple-50 p-6 rounded-lg border-2 border-purple-200">
            <h2 className="text-2xl font-bold mb-4 text-purple-900">篩選選項設定</h2>
            <p className="text-sm text-purple-700 mb-4">設定前台頁面的篩選下拉選單選項</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">職業類別 (逗號分隔)</label>
                <input
                  type="text"
                  value={pageData.filterOptions.categories.join(", ")}
                  onChange={(e) =>
                    setPageData((prev) => ({
                      ...prev,
                      filterOptions: {
                        ...prev.filterOptions,
                        categories: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                      },
                    }))
                  }
                  className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
                  placeholder="製造業, 營建業, 服務業"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">國家 (逗號分隔)</label>
                <input
                  type="text"
                  value={pageData.filterOptions.countries.join(", ")}
                  onChange={(e) =>
                    setPageData((prev) => ({
                      ...prev,
                      filterOptions: {
                        ...prev.filterOptions,
                        countries: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                      },
                    }))
                  }
                  className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
                  placeholder="菲律賓, 越南, 印尼"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">性別 (逗號分隔)</label>
                <input
                  type="text"
                  value={pageData.filterOptions.genders.join(", ")}
                  onChange={(e) =>
                    setPageData((prev) => ({
                      ...prev,
                      filterOptions: {
                        ...prev.filterOptions,
                        genders: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                      },
                    }))
                  }
                  className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
                  placeholder="男, 女"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">來源類型 (逗號分隔)</label>
                <input
                  type="text"
                  value={(pageData.filterOptions.sourceTypes || []).join(", ")}
                  onChange={(e) =>
                    setPageData((prev) => ({
                      ...prev,
                      filterOptions: {
                        ...prev.filterOptions,
                        sourceTypes: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                      },
                    }))
                  }
                  className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
                  placeholder="國內轉出工, 國外引進工"
                />
              </div>
            </div>
          </div>

          {/* 儲存按鈕 */}
          <div className="sticky bottom-4">
            <button
              onClick={handleSaveSettings}
              className="w-full bg-green-500 text-white px-6 py-4 rounded-lg text-lg font-semibold hover:bg-green-600 shadow-xl"
            >
              儲存篩選選項
            </button>
          </div>
        </div>
      )}

      {/* 編輯模態框 */}
      {isModalOpen && editingWorker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">
                {isNewWorker ? "新增移工" : `編輯移工 - ${editingWorker.name || "未命名"}`}
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingWorker(null);
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    姓名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingWorker.name}
                    onChange={(e) =>
                      setEditingWorker({ ...editingWorker, name: e.target.value })
                    }
                    className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">外國人編號</label>
                  <input
                    type="text"
                    value={editingWorker.foreignId || ""}
                    onChange={(e) =>
                      setEditingWorker({ ...editingWorker, foreignId: e.target.value })
                    }
                    className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                    placeholder="例: A123456789"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">年齡</label>
                  <input
                    type="number"
                    value={editingWorker.age}
                    onChange={(e) =>
                      setEditingWorker({ ...editingWorker, age: parseInt(e.target.value) || 0 })
                    }
                    className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">學歷</label>
                  <input
                    type="text"
                    value={editingWorker.education || ""}
                    onChange={(e) =>
                      setEditingWorker({ ...editingWorker, education: e.target.value })
                    }
                    className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                    placeholder="例: 高中、大學"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">身高 (cm)</label>
                  <input
                    type="number"
                    value={editingWorker.height || ""}
                    onChange={(e) =>
                      setEditingWorker({ ...editingWorker, height: parseInt(e.target.value) || 0 })
                    }
                    className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                    placeholder="例: 170"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">體重 (kg)</label>
                  <input
                    type="number"
                    value={editingWorker.weight || ""}
                    onChange={(e) =>
                      setEditingWorker({ ...editingWorker, weight: parseInt(e.target.value) || 0 })
                    }
                    className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                    placeholder="例: 65"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">性別</label>
                  <select
                    value={editingWorker.gender}
                    onChange={(e) =>
                      setEditingWorker({ ...editingWorker, gender: e.target.value })
                    }
                    className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                  >
                    {pageData.filterOptions.genders.length > 0 ? (
                      pageData.filterOptions.genders.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="男">男</option>
                        <option value="女">女</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">國家</label>
                  <select
                    value={editingWorker.country}
                    onChange={(e) =>
                      setEditingWorker({ ...editingWorker, country: e.target.value })
                    }
                    className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                  >
                    <option value="">請選擇</option>
                    {pageData.filterOptions.countries.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">職業類別</label>
                  <select
                    value={editingWorker.category}
                    onChange={(e) =>
                      setEditingWorker({ ...editingWorker, category: e.target.value })
                    }
                    className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                  >
                    <option value="">請選擇</option>
                    {pageData.filterOptions.categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">工作經驗</label>
                  <input
                    type="text"
                    value={editingWorker.experience}
                    onChange={(e) =>
                      setEditingWorker({ ...editingWorker, experience: e.target.value })
                    }
                    className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                    placeholder="例: 5年工廠經驗"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">可上工時間</label>
                  <input
                    type="text"
                    value={editingWorker.availability}
                    onChange={(e) =>
                      setEditingWorker({ ...editingWorker, availability: e.target.value })
                    }
                    className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                    placeholder="例: 即時可上工"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">來源類型</label>
                  <select
                    value={editingWorker.sourceType || "國外引進工"}
                    onChange={(e) =>
                      setEditingWorker({ ...editingWorker, sourceType: e.target.value })
                    }
                    className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                  >
                    {(pageData.filterOptions.sourceTypes || []).length > 0 ? (
                      (pageData.filterOptions.sourceTypes || []).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="國內轉出工">國內轉出工</option>
                        <option value="國外引進工">國外引進工</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">個人描述</label>
                <textarea
                  value={editingWorker.description}
                  onChange={(e) =>
                    setEditingWorker({ ...editingWorker, description: e.target.value })
                  }
                  rows={3}
                  className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">技能 (逗號分隔)</label>
                <input
                  type="text"
                  value={(editingWorker.skills || []).join(", ")}
                  onChange={(e) =>
                    setEditingWorker({
                      ...editingWorker,
                      skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                  placeholder="品質檢驗, 機械操作, 團隊合作"
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">語言能力 (逗號分隔)</label>
                <input
                  type="text"
                  value={(editingWorker.languages || []).join(", ")}
                  onChange={(e) =>
                    setEditingWorker({
                      ...editingWorker,
                      languages: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                  placeholder="中文, 英文, 他加祿語"
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">照片</label>
                {editingWorker.photo && (
                  <div className="mb-2 flex items-center gap-4">
                    <Image
                      src={editingWorker.photo}
                      alt={editingWorker.name}
                      width={100}
                      height={100}
                      className="rounded-lg object-cover"
                    />
                    <button
                      onClick={() => setEditingWorker({ ...editingWorker, photo: "" })}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      移除照片
                    </button>
                  </div>
                )}
                <ImageUploader
                  onImageUpload={(data) => {
                    setEditingWorker({ ...editingWorker, photo: data.imageUrl });
                  }}
                />
              </div>

              <div className="text-xs text-gray-500 mt-4 bg-gray-50 px-3 py-2 rounded">
                系統 ID: {editingWorker.id}
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingWorker(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSaveWorker}
                disabled={!editingWorker.name}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isNewWorker ? "新增" : "儲存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
