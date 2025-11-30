"use client";
import { motion } from "framer-motion";
import Link from "next/link";

interface Props {
  title: string;
  description: string;
  buttonText: string;
  buttonLink: string;
}

export default function ProcessCTA({ title, description, buttonText, buttonLink }: Props) {
  return (
    <section className="py-24 bg-gradient-to-br from-brand-primary to-brand-accent">
      <div className="container mx-auto px-6">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            {title}
          </h2>
          <p className="text-lg md:text-xl text-white/90 mb-10 max-w-2xl mx-auto">
            {description}
          </p>
          <Link
            href={buttonLink}
            className="inline-flex items-center gap-2 bg-white text-brand-primary px-8 py-4 rounded-full text-lg font-semibold hover:bg-gray-50 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105"
          >
            <span>{buttonText}</span>
            <span className="material-symbols-outlined">arrow_forward</span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
