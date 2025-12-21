"use client";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";

interface ImageZoomProps {
  src: string;
  alt: string;
  className?: string;
  aspectRatio?: string;
  overlayInfo?: {
    name: string;
    country: string;
    countryStyle: { bg: string; text: string };
    foreignId: string;
    age: number;
    education: string;
    height: number;
    weight: number;
  };
}

export default function ImageZoom({
  src,
  alt,
  className = "",
  aspectRatio = "aspect-[3/4]",
  overlayInfo,
}: ImageZoomProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      {/* 原始圖片容器 - 點擊放大 */}
      <div
        className={`relative w-full ${aspectRatio} bg-gradient-to-b from-pink-100 to-pink-50 cursor-pointer ${className}`}
        onClick={() => !imageError && setIsZoomed(true)}
      >
        {!imageError ? (
          <Image
            src={src}
            alt={alt}
            fill
            className="object-cover object-top"
            sizes="(max-width: 1024px) 100vw, 33vw"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <span className="material-symbols-outlined text-6xl text-gray-300">
              person
            </span>
          </div>
        )}
      </div>

      {/* 全螢幕放大預覽 - 使用 Portal，點擊關閉 */}
      {mounted &&
        isZoomed &&
        !imageError &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/90 flex items-center justify-center cursor-pointer"
            style={{ zIndex: 99999 }}
            onClick={() => setIsZoomed(false)}
          >
            <Image
              src={src}
              alt={alt}
              width={800}
              height={1067}
              className="max-w-[90vw] max-h-[90vh] w-auto h-auto object-contain"
              unoptimized
            />
            {/* 關閉提示 */}
            <div className="absolute top-4 right-4 text-white/70 flex items-center gap-2">
              <span className="text-sm">點擊任意處關閉</span>
              <span className="material-symbols-outlined">close</span>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
