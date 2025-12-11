"use client";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";

interface AvatarZoomProps {
  src: string;
  alt: string;
  size?: number;
  badge?: string;
  className?: string;
  ringColor?: string;
}

export default function AvatarZoom({
  src,
  alt,
  size = 128,
  badge,
  className = "",
  ringColor = "ring-white/30"
}: AvatarZoomProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [imgSrc, setImgSrc] = useState(src);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      {/* 原始頭像 */}
      <div className={`relative ${className}`}>
        <div
          className="relative cursor-pointer"
          style={{ width: size, height: size }}
          onMouseEnter={() => setIsZoomed(true)}
          onMouseLeave={() => setIsZoomed(false)}
        >
          <div
            className={`w-full h-full rounded-full ring-4 ${ringColor} shadow-lg overflow-hidden`}
          >
            <Image
              src={imgSrc}
              alt={alt}
              width={size}
              height={size}
              className="w-full h-full object-cover"
              unoptimized
              onError={() => setImgSrc("/placeholder-avatar.png")}
            />
          </div>
        </div>
        {badge && (
          <div className="absolute -bottom-2 -right-2 bg-white text-brand-primary px-3 py-1 rounded-full text-sm font-bold shadow-md">
            {badge}
          </div>
        )}
      </div>

      {/* 放大預覽 - 使用 Portal 渲染到 body，確保浮在整個頁面上 */}
      {mounted && isZoomed && createPortal(
        <div
          className="fixed top-0 left-0 w-screen h-screen bg-black flex items-center justify-center pointer-events-none"
          style={{ zIndex: 99999 }}
        >
          <Image
            src={imgSrc}
            alt={alt}
            width={800}
            height={800}
            className="max-w-[80vw] max-h-[80vh] w-auto h-auto object-contain"
            unoptimized
          />
        </div>,
        document.body
      )}
    </>
  );
}
