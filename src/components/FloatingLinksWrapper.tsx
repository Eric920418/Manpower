"use client";

import { usePathname } from "next/navigation";
import { FloatingLinksWidget } from "./FloatingLinks";

export const FloatingLinksWrapper = () => {
  const pathname = usePathname();

  // 不在 admin 頁面顯示懸浮連結
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  return <FloatingLinksWidget />;
};

export default FloatingLinksWrapper;
