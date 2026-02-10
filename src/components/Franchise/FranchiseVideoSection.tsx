"use client";

interface VideoSectionData {
  enabled?: boolean;
  title?: string;
  subtitle?: string;
  youtubeUrl?: string;
}

interface FranchiseVideoSectionProps {
  data?: VideoSectionData;
}

// 從 YouTube URL 提取影片 ID
function extractYoutubeId(url: string): string | null {
  if (!url) return null;

  // 支援多種 YouTube URL 格式
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/,
    /youtube\.com\/shorts\/([^&\s?]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

export default function FranchiseVideoSection({ data }: FranchiseVideoSectionProps) {
  // 如果未啟用或沒有 YouTube URL，則不顯示
  if (!data?.enabled || !data?.youtubeUrl) {
    return null;
  }

  const videoId = extractYoutubeId(data.youtubeUrl);

  if (!videoId) {
    return null;
  }

  return (
    <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* 標題區塊 */}
        {(data.title || data.subtitle) && (
          <div className="text-center mb-10">
            {data.title && (
              <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                {data.title}
              </h2>
            )}
            {data.subtitle && (
              <p className="mt-4 text-lg text-gray-600">
                {data.subtitle}
              </p>
            )}
          </div>
        )}

        {/* YouTube 影片嵌入 */}
        <div className="relative w-full max-w-4xl mx-auto">
          <div className="relative pb-[56.25%] h-0 overflow-hidden rounded-2xl shadow-2xl">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?rel=0`}
              title={data.title || "YouTube 影片"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute top-0 left-0 w-full h-full border-0"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
