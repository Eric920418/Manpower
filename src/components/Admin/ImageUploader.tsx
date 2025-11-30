"use client";

import React, { useState } from "react";

interface UploadResponse {
  imageUrl: string;
  // 如果有其他欄位，也可以在這裡定義
}

interface ImageUploaderProps {
  onImageUpload: (data: UploadResponse) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageUpload,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  // 當檔案選擇改變時
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    // 建立 FormData 並附加檔案
    const formData = new FormData();
    formData.append("image", file);

    try {
      // 呼叫 API 上傳檔案
      const res = await fetch("/api/uploadImage", {
        method: "POST",
        body: formData,
      });
      setIsLoading(true);
      if (!res.ok) {
        console.error("上傳失敗");
        return;
      }

      const data = await res.json();
      // 將 fileUrl 轉換為 imageUrl 以符合期待的格式
      onImageUpload({ imageUrl: data.fileUrl });
    } catch (error) {
      console.error("上傳錯誤:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {isLoading && (
        <div className="bg-white p-5 rounded-lg flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-t-4 border-t-blue-500 border-gray-200 rounded-full animate-spin mb-3"></div>
          <p className="text-gray-700">資料處理中，請稍候...</p>
        </div>
      )}
      <div className="mt-[32px]">
        <label className="block text-sm font-medium text-gray-700">
          支援 JPG、PNG、GIF、WebP 格式，檔案大小請勿超過 5MB
        </label>
        <input
          className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 mt-[1rem]"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
};
