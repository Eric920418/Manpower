"use client";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef, useState } from "react";
import { getYoutubeVideoId } from "@/utils/youtube";

interface SharingVideo {
  id: string;
  title: string;
  videoType?: "youtube" | "local"; // 影片來源類型
  youtubeUrl: string;
  localVideoUrl?: string; // 本地影片 URL
  description: string;
  franchiseeName: string;
  location: string;
}

interface FranchiseeSharingData {
  title?: string;
  subtitle?: string;
  videos?: SharingVideo[];
}

interface FranchiseeSharingProps {
  data?: FranchiseeSharingData;
}

export default function FranchiseeSharing({ data }: FranchiseeSharingProps) {
  const title = data?.title || "加盟主分享";
  const subtitle = data?.subtitle || "聽聽我們的加盟夥伴怎麼說";
  // 保留所有影片，即使 youtubeUrl 為空
  const videos = data?.videos || [];

  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [activeVideo, setActiveVideo] = useState<number>(0);

  // 如果完全沒有影片資料，不顯示此區塊
  if (!data?.videos || videos.length === 0) {
    return null;
  }

  return (
    <section id="sharing" className="py-24 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          ref={ref}
        >
          <h2 className="text-3xl md:text-5xl font-bold text-gray-800 mb-4">
            {title}
          </h2>
          <p className="text-gray-600 text-lg">{subtitle}</p>
        </motion.div>

        <div className="max-w-6xl mx-auto">
          {/* 主要影片顯示區 */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 50 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden shadow-2xl bg-gray-900">
              {/* 本地影片播放 */}
              {videos[activeVideo]?.videoType === "local" && videos[activeVideo]?.localVideoUrl ? (
                <video
                  key={videos[activeVideo]?.localVideoUrl}
                  src={videos[activeVideo]?.localVideoUrl}
                  controls
                  className="absolute inset-0 w-full h-full object-contain"
                  preload="metadata"
                  playsInline
                >
                  您的瀏覽器不支援影片播放
                </video>
              ) : getYoutubeVideoId(videos[activeVideo]?.youtubeUrl || "") ? (
                /* YouTube 影片播放 */
                <iframe
                  key={videos[activeVideo]?.youtubeUrl}
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${getYoutubeVideoId(videos[activeVideo]?.youtubeUrl || "")}`}
                  title={videos[activeVideo]?.title || "加盟主分享影片"}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/60">
                  <span className="material-symbols-outlined text-6xl mb-4">play_circle</span>
                  <p className="text-lg">影片準備中</p>
                </div>
              )}
            </div>

            {/* 當前影片資訊 */}
            {videos[activeVideo] && (
              <motion.div
                className="mt-6 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                key={activeVideo}
              >
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  {videos[activeVideo].title}
                </h3>
                {(videos[activeVideo].franchiseeName || videos[activeVideo].location) && (
                  <div className="flex items-center justify-center gap-4 text-gray-600 mb-3">
                    {videos[activeVideo].franchiseeName && (
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-brand-primary">person</span>
                        {videos[activeVideo].franchiseeName}
                      </span>
                    )}
                    {videos[activeVideo].location && (
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-brand-primary">location_on</span>
                        {videos[activeVideo].location}
                      </span>
                    )}
                  </div>
                )}
                {videos[activeVideo].description && (
                  <p className="text-gray-600 max-w-2xl mx-auto">
                    {videos[activeVideo].description}
                  </p>
                )}
              </motion.div>
            )}
          </motion.div>

          {/* 影片選擇列表（多於一個影片時顯示） */}
          {videos.length > 1 && (
            <motion.div
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              {videos.map((video, index) => {
                const videoId = getYoutubeVideoId(video.youtubeUrl);
                const isLocalVideo = video.videoType === "local" && video.localVideoUrl;
                return (
                  <motion.button
                    key={video.id || index}
                    onClick={() => setActiveVideo(index)}
                    className={`relative aspect-video rounded-xl overflow-hidden shadow-lg transition-all duration-300 ${
                      activeVideo === index
                        ? "ring-4 ring-brand-primary scale-105"
                        : "hover:scale-102 hover:shadow-xl"
                    }`}
                    whileHover={{ scale: activeVideo === index ? 1.05 : 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* 影片縮圖 */}
                    {isLocalVideo ? (
                      /* 本地影片使用 video 標籤的 poster 或預覽 */
                      <div className="w-full h-full bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
                        <span className="material-symbols-outlined text-4xl text-white/80">movie</span>
                      </div>
                    ) : videoId ? (
                      /* YouTube 縮圖 */
                      <img
                        src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                        <span className="material-symbols-outlined text-4xl text-white/40">videocam</span>
                      </div>
                    )}

                    {/* 播放圖標覆蓋層 */}
                    <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
                      activeVideo === index
                        ? "bg-brand-primary/20"
                        : "bg-black/30 hover:bg-black/20"
                    }`}>
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        activeVideo === index
                          ? "bg-brand-primary"
                          : "bg-white/90"
                      }`}>
                        <span className={`material-symbols-outlined text-2xl ${
                          activeVideo === index
                            ? "text-white"
                            : "text-brand-primary"
                        }`}>
                          {activeVideo === index ? "pause" : "play_arrow"}
                        </span>
                      </div>
                    </div>

                    {/* 本地影片標籤 */}
                    {isLocalVideo && (
                      <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                        本地影片
                      </div>
                    )}

                    {/* 影片標題 */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                      <p className="text-white text-sm font-medium line-clamp-2">
                        {video.title}
                      </p>
                      {video.franchiseeName && (
                        <p className="text-white/70 text-xs mt-1">
                          {video.franchiseeName}
                        </p>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
