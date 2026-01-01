"use client";
import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";

// 導航按鈕為頁面結構性元素
export const navItems = [
  { id: "stories", label: "加盟主分享", icon: "forum" },
  { id: "main", label: "市場趨勢", icon: "trending_up" },
  { id: "details", label: "加盟詳情", icon: "description" },
  { id: "seminar", label: "報名加盟說明會", icon: "event" },
];

interface FranchiseNavButtonsProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export default function FranchiseNavButtons({ activeTab, onTabChange }: FranchiseNavButtonsProps) {
  const [isFixed, setIsFixed] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 檢查是否可以滾動
  const checkScrollability = () => {
    const container = scrollContainerRef.current;
    if (container) {
      setCanScrollLeft(container.scrollLeft > 0);
      setCanScrollRight(
        container.scrollLeft < container.scrollWidth - container.clientWidth - 1
      );
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      // Hero 區塊高度 + Header 高度
      const scrollThreshold = 600;
      setIsFixed(window.scrollY > scrollThreshold);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 監聽橫向滾動和視窗大小變化
  useEffect(() => {
    const container = scrollContainerRef.current;
    checkScrollability();

    const handleHorizontalScroll = () => checkScrollability();
    const handleResize = () => checkScrollability();

    container?.addEventListener("scroll", handleHorizontalScroll);
    window.addEventListener("resize", handleResize);

    return () => {
      container?.removeEventListener("scroll", handleHorizontalScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const handleClick = (id: string) => {
    onTabChange(id);
    // 滾動到對應區域
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 80; // 固定導航列高度
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
    }
  };

  return (
    <>
      {/* 佔位元素,避免內容跳動 */}
      {isFixed && <div className="h-[72px]" />}

      <section className={`${isFixed ? 'fixed top-0 left-0 right-0' : 'relative'} z-40 bg-white backdrop-blur-sm border-b border-gray-200 shadow-md transition-all duration-300`}>
        <div className="container mx-auto px-4 sm:px-6 py-4 relative">
          {/* 左側漸變提示 - 只在手機版且可左滑時顯示 */}
          {canScrollLeft && (
            <div className="sm:hidden absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none flex items-center justify-start pl-1">
              <motion.span
                className="material-symbols-outlined text-brand-primary text-sm"
                animate={{ x: [-2, 2, -2] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                chevron_left
              </motion.span>
            </div>
          )}

          {/* 右側漸變提示 - 只在手機版且可右滑時顯示 */}
          {canScrollRight && (
            <div className="sm:hidden absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none flex items-center justify-end pr-1">
              <motion.span
                className="material-symbols-outlined text-brand-primary text-sm"
                animate={{ x: [2, -2, 2] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                chevron_right
              </motion.span>
            </div>
          )}

          <div
            ref={scrollContainerRef}
            className="overflow-x-auto scrollbar-hide"
          >
            <div className="flex flex-nowrap gap-2 sm:gap-3 justify-start sm:justify-center min-w-max sm:min-w-0">
              {navItems.map((item, index) => (
                <motion.button
                  key={item.id}
                  onClick={() => handleClick(item.id)}
                  className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-6 py-2 sm:py-3 rounded-full font-medium transition-all duration-300 whitespace-nowrap ${
                    activeTab === item.id
                      ? "bg-brand-primary text-white shadow-lg sm:scale-105"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 sm:hover:scale-105"
                  }`}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="material-symbols-outlined text-xl hidden sm:inline">{item.icon}</span>
                  <span className="text-xs sm:text-base">{item.label}</span>
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
