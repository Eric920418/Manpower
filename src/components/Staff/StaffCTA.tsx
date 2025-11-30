"use client";
import { motion } from "framer-motion";
import Link from "next/link";

interface Props {
  title: string;
  description: string;
  buttonText: string;
  buttonLink: string;
}

export default function StaffCTA({ title, description, buttonText, buttonLink }: Props) {
  return (
    <section className="py-24 bg-gradient-to-r from-brand-secondary to-brand-primary">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {title}
          </h2>
          <p className="text-lg text-white/90 max-w-2xl mx-auto mb-8">
            {description}
          </p>
          <Link
            href={buttonLink}
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-brand-primary rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg"
          >
            <span>{buttonText}</span>
            <span className="material-symbols-outlined">arrow_forward</span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
