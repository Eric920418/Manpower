"use client";
import { motion } from "framer-motion";
import Image from "next/image";

interface Props {
  title: string;
  description: string;
  image: string;
}

export default function StaffHero({ title, description, image }: Props) {
  return (
    <section className="relative h-[400px] md:h-[500px] w-full overflow-hidden mt-20">
      <div className="absolute inset-0">
        <Image
          src={image}
          alt={title}
          fill
          className="object-cover"
          priority
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-brand-secondary/90 to-brand-primary/80" />
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
            <p className="text-[16px] md:text-xl text-white/90 max-w-3xl mx-auto">
              {description}
            </p>
          </motion.div>
        </div>
      </div>
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
