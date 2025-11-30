/**
 * 簡化且安全的favicon更新工具函數
 * 避免與React的DOM管理產生衝突
 */
export const updateFavicon = (faviconUrl: string): void => {
  if (!faviconUrl || faviconUrl.trim() === "") return;
  
  // 使用更簡單的方法：只更新現有的favicon或創建新的
  // 不主動刪除現有的favicon，避免React DOM衝突
  
  // 添加緩存破壞參數
  const timestamp = new Date().getTime();
  const faviconWithTimestamp = `${faviconUrl}?v=${timestamp}`;
  
  // 查找現有的主要favicon
  const existingFavicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
  
  if (existingFavicon) {
    // 如果存在，更新href
    existingFavicon.href = faviconWithTimestamp;
  } else {
    // 如果不存在，創建新的
    const link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/x-icon";
    link.href = faviconWithTimestamp;
    
    if (document.head) {
      document.head.appendChild(link);
    }
  }
  
  // 也處理shortcut icon
  const existingShortcut = document.querySelector('link[rel="shortcut icon"]') as HTMLLinkElement;
  
  if (existingShortcut) {
    existingShortcut.href = faviconWithTimestamp;
  } else {
    const shortcutLink = document.createElement("link");
    shortcutLink.rel = "shortcut icon";
    shortcutLink.type = "image/x-icon";
    shortcutLink.href = faviconWithTimestamp;
    
    if (document.head) {
      document.head.appendChild(shortcutLink);
    }
  }
  
  // 強制瀏覽器重新載入favicon的安全方法
  // 通過改變href觸發瀏覽器重新載入
  setTimeout(() => {
    const allFavicons = document.querySelectorAll('link[rel*="icon"]') as NodeListOf<HTMLLinkElement>;
    allFavicons.forEach(favicon => {
      if (favicon.href && favicon.href.includes(faviconUrl)) {
        // 暫時改變href然後改回來，觸發重新載入
        const originalHref = favicon.href;
        favicon.href = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        setTimeout(() => {
          favicon.href = originalHref;
        }, 10);
      }
    });
  }, 50);
};

/**
 * 清理favicon更新狀態的函數
 * 用於在組件卸載或頁面卸載時重置狀態
 */
export const cleanupFaviconUpdater = (): void => {
  // 簡化版本不需要清理狀態
}; 