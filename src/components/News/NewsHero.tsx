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

 
    </section>
  );
}
