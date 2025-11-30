"use client";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const showPages = 5; // 顯示的頁碼數量

    if (totalPages <= showPages) {
      // 如果總頁數小於等於顯示數量，顯示所有頁碼
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 總是顯示第一頁
      pages.push(1);

      if (currentPage > 3) {
        pages.push("...");
      }

      // 顯示當前頁及其前後頁
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("...");
      }

      // 總是顯示最後一頁
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <nav className="flex items-center justify-between border-t border-border px-4 sm:px-0 mt-12 pt-6">
      {/* 上一頁 */}
      <div className="flex w-0 flex-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`inline-flex items-center rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
            currentPage === 1
              ? "border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed"
              : "border-border bg-white text-text-primary hover:bg-brand-primary/10 hover:border-brand-primary hover:text-brand-secondary"
          }`}
        >
          <span className="material-symbols-outlined mr-3 h-5 w-5">
            arrow_back
          </span>
          上一頁
        </button>
      </div>

      {/* 頁碼 */}
      <div className="hidden md:flex gap-2">
        {getPageNumbers().map((page, index) => {
          if (page === "...") {
            return (
              <span
                key={`ellipsis-${index}`}
                className="inline-flex items-center px-4 pt-4 text-sm font-medium text-text-secondary"
              >
                ...
              </span>
            );
          }

          const pageNum = page as number;
          const isActive = pageNum === currentPage;

          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`inline-flex items-center border-t-2 px-4 pt-4 text-sm font-medium transition-all ${
                isActive
                  ? "border-brand-primary text-brand-primary font-bold"
                  : "border-transparent text-text-secondary hover:border-brand-primary/50 hover:text-brand-secondary"
              }`}
            >
              {pageNum}
            </button>
          );
        })}
      </div>

      {/* 移動端頁碼顯示 */}
      <div className="md:hidden flex items-center gap-2 text-sm text-text-secondary">
        <span className="font-medium text-brand-secondary">{currentPage}</span>
        <span>/</span>
        <span>{totalPages}</span>
      </div>

      {/* 下一頁 */}
      <div className="flex w-0 flex-1 justify-end">
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`inline-flex items-center rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
            currentPage === totalPages
              ? "border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed"
              : "border-border bg-white text-text-primary hover:bg-brand-primary/10 hover:border-brand-primary hover:text-brand-secondary"
          }`}
        >
          下一頁
          <span className="material-symbols-outlined ml-3 h-5 w-5">
            arrow_forward
          </span>
        </button>
      </div>
    </nav>
  );
}
