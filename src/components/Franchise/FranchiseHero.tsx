"use client";
import { motion } from "framer-motion";

interface HeroData {
  title?: string;
  backgroundImage?: string;
}

interface FranchiseHeroProps {
  data?: HeroData;
}

export default function FranchiseHero({ data }: FranchiseHeroProps) {
  const title = data?.title || "創業加盟";
  const backgroundImage = data?.backgroundImage || "https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=80&w=2000";

  return (
    <section className="relative h-[400px] md:h-[500px] w-full overflow-hidden mt-20">
      {/* 背景圖片 */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('${backgroundImage}')`,
        }}
      />

      {/* 深色遮罩 */}
      <div className="absolute inset-0 bg-gradient-to-r from-brand-secondary/90 to-brand-primary/80" />

      {/* 內容 */}
      <div className="relative z-10 flex h-full items-center justify-center">
        <div className="container mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
              {title}
            </h1>
            <div className="h-1 w-24 bg-white mx-auto rounded-full" />
          </motion.div>
        </div>
      </div>

      {/* 麵包屑導航 */}
      <motion.div
        className="absolute bottom-6 left-6 z-10 flex items-center gap-2 text-sm text-white/90"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      >
        <span className="material-symbols-outlined text-base">home</span>
        <span>/</span>
        <span>{title}</span>
      </motion.div>
    </section>
  );
}
