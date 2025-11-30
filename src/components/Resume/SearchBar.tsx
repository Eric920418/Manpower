"use client";
import { useState } from "react";

interface SearchBarProps {
  onSearch: (keyword: string) => void;
}

export default function SearchBar({ onSearch }: SearchBarProps) {
  const [keyword, setKeyword] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(keyword);
  };

  return (
    <form onSubmit={handleSearch} className="relative">
      <label className="flex flex-col min-w-40 h-12 w-full">
        <div className="flex w-full flex-1 items-stretch rounded-xl h-full">
          <div className="text-brand-secondary flex bg-white items-center justify-center pl-4 rounded-l-xl border border-r-0 border-border hover:border-brand-primary transition-colors">
            <span className="material-symbols-outlined">search</span>
          </div>
          <input
            className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-r-xl text-text-primary focus:outline-0 focus:ring-2 focus:ring-brand-primary border border-l-0 border-border hover:border-brand-primary bg-white h-full placeholder:text-text-secondary px-4 text-base font-normal transition-colors"
            placeholder="搜尋關鍵字（例如：「認證焊工」、「5年以上經驗」）"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <button
            type="submit"
            className="ml-2 px-6 bg-brand-primary text-text-on-brand rounded-xl font-bold hover:bg-brand-accent transition-colors"
          >
            搜尋
          </button>
        </div>
      </label>
    </form>
  );
}
