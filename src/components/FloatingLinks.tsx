"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface FloatingLink {
  id: string;
  icon: string;
  label: string;
  url: string;
  isActive: boolean;
  order: number;
}

interface FloatingLinksData {
  enabled: boolean;
  position: string;
  links: FloatingLink[];
}

const query = `
  query floatingLinks {
    floatingLinks {
      enabled
      position
      links
    }
  }
`;

export const FloatingLinksWidget = () => {
  const [data, setData] = useState<FloatingLinksData | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showTopButton, setShowTopButton] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
        const result = await res.json();

        if (result.data?.floatingLinks[0]) {
          setData(result.data.floatingLinks[0]);
        }
      } catch (error) {
        console.error("Failed to load floating links:", error);
      } finally {
        setIsLoaded(true);
      }
    };

    fetchData();
  }, []);

  // 監聽滾動，決定是否顯示 Top 按鈕
  useEffect(() => {
    const handleScroll = () => {
      setShowTopButton(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 不顯示：尚未載入、未啟用、沒有連結
  if (!isLoaded || !data?.enabled || !data.links || data.links.length === 0) {
    return null;
  }

  const activeLinks = data.links.filter((link) => link.isActive);

  if (activeLinks.length === 0) {
    return null;
  }

  const positionClass = data.position === "left" ? "left-4" : "right-4";

  return (
    <div
      className={`fixed bottom-6 ${positionClass} z-50 flex flex-col gap-3`}
      style={{ zIndex: 9999 }}
    >
      {activeLinks.map((link) => (
        <a
          key={link.id}
          href={link.url}
          target={link.url.startsWith("tel:") || link.url.startsWith("mailto:") ? "_self" : "_blank"}
          rel="noopener noreferrer"
          title={link.label}
          className="group relative w-14 h-14 bg-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center border border-gray-100 hover:scale-110"
        >
          {link.icon ? (
            <Image
              src={link.icon}
              alt={link.label}
              width={36}
              height={36}
              className="rounded"
            />
          ) : (
            <span className="text-gray-400 text-sm">{link.label.charAt(0)}</span>
          )}

          {/* Tooltip */}
          <span
            className={`absolute ${
              data.position === "left" ? "left-full ml-2" : "right-full mr-2"
            } whitespace-nowrap bg-gray-900 text-white text-sm px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none`}
          >
            {link.label}
          </span>
        </a>
      ))}

      {/* 回到頂部按鈕 */}
      <button
        onClick={scrollToTop}
        title="回到頂部"
        className={`group relative w-14 h-14 bg-gray-800 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center border border-gray-700 hover:scale-110 hover:bg-gray-700 ${
          showTopButton ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        <svg
          className="w-6 h-6 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 10l7-7m0 0l7 7m-7-7v18"
          />
        </svg>

        {/* Tooltip */}
        <span
          className={`absolute ${
            data.position === "left" ? "left-full ml-2" : "right-full mr-2"
          } whitespace-nowrap bg-gray-900 text-white text-sm px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none`}
        >
          回到頂部
        </span>
      </button>
    </div>
  );
};

export default FloatingLinksWidget;
