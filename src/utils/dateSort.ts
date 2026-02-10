// 解析多種日期格式為 Date 物件
export function parseArticleDate(dateStr: string): Date {
  if (!dateStr) return new Date(0);

  // ISO 格式: 2024-01-15
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
  }

  // 中文格式: 2023年12月14日
  const cnMatch = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (cnMatch) {
    return new Date(Number(cnMatch[1]), Number(cnMatch[2]) - 1, Number(cnMatch[3]));
  }

  // 英文格式: December 24, 2025 / August 07, 2025
  const enMatch = dateStr.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (enMatch) {
    const d = new Date(`${enMatch[1]} ${enMatch[2]}, ${enMatch[3]}`);
    if (!isNaN(d.getTime())) return d;
  }

  // 其他格式嘗試直接解析
  const fallback = new Date(dateStr);
  return isNaN(fallback.getTime()) ? new Date(0) : fallback;
}

// 依日期降序排列（新→舊）
export function sortByDateDesc<T extends { date: string }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => parseArticleDate(b.date).getTime() - parseArticleDate(a.date).getTime()
  );
}
