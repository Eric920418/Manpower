"use client";
import { motion } from "framer-motion";

interface Props {
  title: string;
  description: string;
}

export default function NewsHero({ title, description }: Props) {
  return (
    <section className="relative bg-gradient-to-br from-brand-secondary to-brand-primary pt-32 pb-20">
      <div className="container mx-auto px-6">
        <motion.div
          className="text-center max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            {title}
          </h1>
          <p className="text-lg md:text-xl text-white/90">
            {description}
          </p>
        </motion.div>
      </div>

      <div className="absolute -bottom-1 left-0 right-0 translate-y-1/2">
        <svg
          viewBox="0 0 1440 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-auto"
        >
          <path
            d="M0 0L60 10C120 20 240 40 360 46.7C480 53 600 47 720 43.3C840 40 960 40 1080 46.7C1200 53 1320 67 1380 73.3L1440 80V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V0Z"
            fill="white"
          />
        </svg>
      </div>
    </section>
  );
}
