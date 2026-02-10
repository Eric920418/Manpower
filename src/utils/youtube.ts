// 從 YouTube URL 提取影片 ID
export function getYoutubeVideoId(url: string): string {
  if (!url) return "";

  // 處理 watch?v= 格式
  if (url.includes("watch?v=")) {
    return url.split("watch?v=")[1]?.split("&")[0] || "";
  }

  // 處理 youtu.be/ 格式
  if (url.includes("youtu.be/")) {
    return url.split("youtu.be/")[1]?.split("?")[0] || "";
  }

  // 處理 embed/ 格式
  if (url.includes("embed/")) {
    return url.split("embed/")[1]?.split("?")[0] || "";
  }

  return "";
}
