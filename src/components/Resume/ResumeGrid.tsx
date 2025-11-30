"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ResumeCard, { Resume } from "./ResumeCard";
import SearchBar from "./SearchBar";
import FilterBar from "./FilterBar";
import Pagination from "./Pagination";

// 從後台 API 獲取的移工資料介面
interface Worker {
  id: string;
  name: string;
  age: number;
  gender: string;
  country: string;
  photo: string;
  experience: string;
  skills: string[];
  languages: string[];
  availability: string;
  category: string;
  description: string;
}

// 將 Worker 轉換為 Resume 格式
const convertWorkerToResume = (worker: Worker): Resume => {
  return {
    id: worker.id,
    name: worker.name,
    title: worker.category || "專業人才",
    experience: worker.experience || `${worker.age}歲`,
    location: worker.country,
    country: worker.country,
    photo: worker.photo || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
    skills: worker.skills || [],
  };
};

export default function ResumeGrid() {
  const router = useRouter();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [filteredResumes, setFilteredResumes] = useState<Resume[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const MAX_SELECTION = 15; // 最多選擇 15 人

  // 從 API 獲取移工資料
  useEffect(() => {
    const fetchWorkers = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const query = `
          query workersPage {
            workersPage {
              workers
            }
          }
        `;

        const response = await fetch("/api/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.errors) {
          throw new Error(result.errors[0]?.message || "GraphQL 查詢錯誤");
        }

        const workersData = result.data?.workersPage?.[0]?.workers || [];
        const convertedResumes = workersData.map(convertWorkerToResume);

        setResumes(convertedResumes);
        setFilteredResumes(convertedResumes);
      } catch (err) {
        console.error("獲取移工資料失敗:", err);
        setError(err instanceof Error ? err.message : "未知錯誤");
        setResumes([]);
        setFilteredResumes([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkers();
  }, []);
  const itemsPerPage = 12;
  const totalPages = Math.ceil(filteredResumes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentResumes = filteredResumes.slice(startIndex, endIndex);

  const handleSearch = (keyword: string) => {
    if (!keyword.trim()) {
      setFilteredResumes(resumes);
      return;
    }

    const filtered = resumes.filter(
      (resume) =>
        resume.name.toLowerCase().includes(keyword.toLowerCase()) ||
        resume.title.toLowerCase().includes(keyword.toLowerCase()) ||
        resume.skills.some((skill) =>
          skill.toLowerCase().includes(keyword.toLowerCase())
        ) ||
        resume.location.toLowerCase().includes(keyword.toLowerCase()) ||
        resume.country.toLowerCase().includes(keyword.toLowerCase())
    );

    setFilteredResumes(filtered);
    setCurrentPage(1);
  };

  const handleFilterChange = (filters: {
    industry?: string;
    experience?: string;
    country?: string;
    language?: string;
  }) => {
    let filtered = [...resumes];

    // 國家篩選 (使用中文名稱匹配)
    if (filters.country) {
      const countryMap: { [key: string]: string[] } = {
        philippines: ["菲律賓", "philippines"],
        vietnam: ["越南", "vietnam"],
        indonesia: ["印尼", "indonesia"],
        thailand: ["泰國", "thailand"],
        india: ["印度", "india"],
      };

      const matchCountries = countryMap[filters.country] || [];
      filtered = filtered.filter((resume) =>
        matchCountries.some((c) =>
          resume.country.toLowerCase().includes(c.toLowerCase())
        )
      );
    }

    // 產業類別篩選 (使用 title 欄位)
    if (filters.industry) {
      const industryMap: { [key: string]: string[] } = {
        manufacturing: ["製造", "工廠", "廠工", "CNC", "焊"],
        construction: ["營造", "建築", "工頭", "營建"],
        agriculture: ["農業", "農", "收割", "牲畜"],
        service: ["服務", "接待", "客房", "清潔", "幫傭", "護理"],
        technology: ["科技", "技術", "工程"],
      };

      const matchKeywords = industryMap[filters.industry] || [];
      filtered = filtered.filter((resume) =>
        matchKeywords.some((keyword) =>
          resume.title.toLowerCase().includes(keyword.toLowerCase())
        )
      );
    }

    // 經驗年資篩選
    if (filters.experience) {
      filtered = filtered.filter((resume) => {
        const exp = resume.experience.toLowerCase();
        if (filters.experience === "1-2") {
          return exp.includes("1") || exp.includes("2");
        } else if (filters.experience === "3-5") {
          return exp.includes("3") || exp.includes("4") || exp.includes("5");
        } else if (filters.experience === "5-10") {
          return (
            exp.includes("5") ||
            exp.includes("6") ||
            exp.includes("7") ||
            exp.includes("8") ||
            exp.includes("9") ||
            (exp.includes("10") && !exp.includes("10+") && !exp.includes("10 年以上"))
          );
        } else if (filters.experience === "10+") {
          return exp.includes("10+") || exp.includes("10 年以上") || exp.includes("12");
        }
        return true;
      });
    }

    // 語言能力篩選
    if (filters.language) {
      const languageMap: { [key: string]: string[] } = {
        chinese: ["中文", "華語", "國語"],
        english: ["英文", "英語", "english"],
        japanese: ["日文", "日語", "japanese"],
        korean: ["韓文", "韓語", "korean"],
      };

      const matchLanguages = languageMap[filters.language] || [];
      filtered = filtered.filter((resume) =>
        matchLanguages.some((lang) =>
          resume.skills.some((skill) =>
            skill.toLowerCase().includes(lang.toLowerCase())
          )
        )
      );
    }

    setFilteredResumes(filtered);
    setCurrentPage(1); // 重設到第一頁
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);

    const sorted = [...filteredResumes];

    if (value === "newest") {
      // 最新加入 (依照 ID 反向排序,假設 ID 越大越新)
      sorted.reverse();
    } else if (value === "experience") {
      // 經驗年資排序 (從多到少)
      sorted.sort((a, b) => {
        // 提取數字
        const getYears = (exp: string): number => {
          const match = exp.match(/\d+/);
          return match ? parseInt(match[0]) : 0;
        };
        return getYears(b.experience) - getYears(a.experience);
      });
    } else if (value === "name") {
      // 姓名排序 (A-Z)
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    }

    setFilteredResumes(sorted);
  };

  const handleSelect = (id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        if (newSet.size >= MAX_SELECTION) {
          alert(`最多只能選擇 ${MAX_SELECTION} 位求職者`);
          return prev;
        }
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  // 全選功能（保留以供未來使用）
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSelectAll = () => {
    if (selectedIds.size === currentResumes.length) {
      setSelectedIds(new Set());
    } else {
      const newSet = new Set<string>();
      currentResumes.slice(0, MAX_SELECTION).forEach((resume) => {
        newSet.add(resume.id);
      });
      setSelectedIds(newSet);
    }
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleSubmitRequest = () => {
    if (selectedIds.size === 0) {
      alert('請至少選擇一位求職者');
      return;
    }

    // 獲取選中的完整履歷資料
    const selectedResumesData = filteredResumes.filter((resume) =>
      selectedIds.has(resume.id)
    );

    // 將完整的履歷資料儲存到 sessionStorage
    sessionStorage.setItem(
      'selectedResumesData',
      JSON.stringify(selectedResumesData)
    );

    // 導航到需求表單頁面
    router.push('/resume/request');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 載入中狀態 */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-text-secondary text-lg">正在載入移工資料...</p>
        </div>
      )}

      {/* 錯誤狀態 */}
      {error && !isLoading && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-red-500 text-3xl">error</span>
            <div>
              <h3 className="text-red-800 font-bold text-lg mb-2">載入資料失敗</h3>
              <p className="text-red-600 mb-3">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
              >
                重新載入
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 資料內容 */}
      {!isLoading && !error && (
        <>
  

      {/* 搜索欄 */}
      <div className="mb-6">
        <SearchBar onSearch={handleSearch} />
      </div>

      {/* 篩選器 */}
      <div className="mb-6">
        <FilterBar onFilterChange={handleFilterChange} />
      </div>

      {/* 選擇工具列 */}
      {selectedIds.size > 0 && (
        <div className="mb-6 bg-brand-primary/10 border-2 border-brand-primary rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="material-symbols-outlined text-brand-primary text-2xl">
              check_circle
            </span>
            <div>
              <p className="text-brand-secondary font-bold text-lg">
                已選擇 {selectedIds.size} 位求職者
              </p>
              <p className="text-text-secondary text-sm">
                最多可選擇 {MAX_SELECTION} 位
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleClearSelection}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-border bg-white text-text-secondary hover:bg-gray-50 hover:border-gray-400 transition-all font-medium"
            >
              <span className="material-symbols-outlined text-base">close</span>
              清除選擇
            </button>
            <button
              onClick={handleSubmitRequest}
              className="flex items-center gap-2 px-6 py-2 rounded-lg bg-brand-primary text-text-on-brand hover:bg-brand-accent hover:scale-105 transition-all font-bold shadow-lg"
            >
              <span className="material-symbols-outlined text-base">send</span>
              提交人力需求
            </button>
          </div>
        </div>
      )}

      {/* 工具列 */}
      <div className="flex flex-wrap justify-between items-center gap-2 py-3 border-b border-t border-border mb-8">
        <p className="text-sm text-text-secondary">
          顯示{" "}
          <span className="font-bold text-text-primary">
            {currentResumes.length}
          </span>{" "}
          筆，共{" "}
          <span className="font-bold text-text-primary">
            {filteredResumes.length}
          </span>{" "}
          位求職者
        </p>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary">排序：</span>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value)}
              className="flex h-9 items-center justify-center gap-x-2 rounded-lg bg-white pl-4 pr-10 shadow-sm border border-border hover:border-brand-primary transition-colors text-brand-secondary text-sm font-medium appearance-none cursor-pointer"
            >
              <option value="newest">最新加入</option>
              <option value="experience">經驗年資</option>
              <option value="name">姓名排序</option>
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none text-base">
              expand_more
            </span>
          </div>

          <div className="h-8 border-l border-border mx-2"></div>

          {/* 視圖切換 */}
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-lg transition-all ${
              viewMode === "grid"
                ? "bg-brand-primary/20 text-brand-primary"
                : "text-text-secondary hover:bg-gray-100"
            }`}
            title="網格視圖"
          >
            <span className="material-symbols-outlined">grid_view</span>
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded-lg transition-all ${
              viewMode === "list"
                ? "bg-brand-primary/20 text-brand-primary"
                : "text-text-secondary hover:bg-gray-100"
            }`}
            title="列表視圖"
          >
            <span className="material-symbols-outlined">view_list</span>
          </button>
        </div>
      </div>

      {/* 履歷卡片網格 */}
      {currentResumes.length === 0 ? (
        <div className="text-center py-16">
          <span className="material-symbols-outlined text-6xl text-text-secondary mb-4">
            person_search
          </span>
          <p className="text-xl text-text-primary font-semibold mb-2">
            找不到符合條件的求職者
          </p>
          <p className="text-text-secondary">
            請嘗試調整搜索關鍵字或篩選條件
          </p>
        </div>
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              : "flex flex-col gap-4"
          }
        >
          {currentResumes.map((resume) => (
            <ResumeCard
              key={resume.id}
              resume={resume}
              isSelected={selectedIds.has(resume.id)}
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}

      {/* 分頁 */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}
        </>
      )}
    </div>
  );
}
