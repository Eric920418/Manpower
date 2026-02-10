"use client";

import React, { useState } from "react";

interface UploadResponse {
  videoUrl: string;
  fileName: string;
  fileSizeInfo: string;
}

interface VideoUploaderProps {
  onVideoUpload: (data: UploadResponse) => void;
  currentVideoUrl?: string;
}

export const VideoUploader: React.FC<VideoUploaderProps> = ({
  onVideoUpload,
  currentVideoUrl,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [error, setError] = useState<string>("");

  // 當檔案選擇改變時
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    // 檢查檔案大小（前端初步檢查）
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      setError(`檔案大小不能超過 500MB，目前檔案大小為 ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
      return;
    }

    // 建立 FormData 並附加檔案
    const formData = new FormData();
    formData.append("video", file);

    setIsLoading(true);
    setError("");
    setUploadProgress("正在上傳影片...");

    try {
      // 呼叫 API 上傳檔案
      const res = await fetch("/api/uploadVideo", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        setError(errorData.error || "上傳失敗");
        return;
      }

      const data = await res.json();
      setUploadProgress("上傳完成！");

      // 回傳上傳結果
      onVideoUpload({
        videoUrl: data.fileUrl,
        fileName: data.fileName,
        fileSizeInfo: data.fileSizeInfo,
      });
    } catch (err) {
      console.error("上傳錯誤:", err);
      setError("上傳過程中發生錯誤，請稍後再試");
    } finally {
      setIsLoading(false);
      setTimeout(() => setUploadProgress(""), 3000);
    }
  };

  return (
    <div>
      {isLoading && (
        <div className="bg-blue-50 p-4 rounded-lg flex items-center gap-3 mb-3">
          <div className="w-6 h-6 border-3 border-t-3 border-t-blue-500 border-gray-200 rounded-full animate-spin"></div>
          <p className="text-blue-700">{uploadProgress || "處理中..."}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 p-4 rounded-lg mb-3">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {!isLoading && uploadProgress && (
        <div className="bg-green-50 p-4 rounded-lg mb-3">
          <p className="text-green-700">{uploadProgress}</p>
        </div>
      )}

      {currentVideoUrl && (
        <div className="mb-3">
          <p className="text-sm text-gray-600 mb-2">目前影片：</p>
          <video
            src={currentVideoUrl}
            controls
            className="w-full max-w-md rounded-lg"
            preload="metadata"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          支援 MP4、WebM、OGG、MOV、AVI、MKV 格式，檔案大小請勿超過 500MB
        </label>
        <input
          className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600"
          type="file"
          accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo,video/x-matroska,.mp4,.webm,.ogg,.mov,.avi,.mkv"
          onChange={handleFileChange}
          disabled={isLoading}
        />
      </div>
    </div>
  );
};
