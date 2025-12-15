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
      {/* 原始圖片容器 */}
      <div
        className={`relative w-full ${aspectRatio} bg-gradient-to-b from-pink-100 to-pink-50 cursor-pointer ${className}`}
        onMouseEnter={() => setIsZoomed(true)}
        onMouseLeave={() => setIsZoomed(false)}
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

      {/* 全螢幕放大預覽 - 使用 Portal */}
      {mounted &&
        isZoomed &&
        !imageError &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/90 flex items-center justify-center pointer-events-none"
            style={{ zIndex: 99999 }}
          >
            <div className="relative max-w-[90vw] max-h-[90vh]">
              <Image
                src={src}
                alt={alt}
                width={800}
                height={1067}
                className="max-w-[90vw] max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
                unoptimized
              />
              {/* 資訊覆蓋層 */}
              {overlayInfo && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 rounded-b-lg">
                  <h3 className="text-white text-2xl font-bold mb-2">
                    {overlayInfo.name}
                  </h3>
                  <div className="flex flex-wrap gap-4 text-white/90 text-sm">
                    <span
                      className={`${overlayInfo.countryStyle.bg} ${overlayInfo.countryStyle.text} px-3 py-1 rounded font-bold`}
                    >
                      {overlayInfo.country}
                    </span>
                    <span>編號：{overlayInfo.foreignId}</span>
                    <span>年齡：{overlayInfo.age}歲</span>
                    <span>學歷：{overlayInfo.education}</span>
                    <span>
                      {overlayInfo.height}cm / {overlayInfo.weight}kg
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
