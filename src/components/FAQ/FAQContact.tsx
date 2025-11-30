"use client";
import { motion } from "framer-motion";
import Link from "next/link";

interface Props {
  title: string;
  description: string;
  buttonText: string;
  buttonLink: string;
}

export default function FAQContact({ title, description, buttonText, buttonLink }: Props) {
  return (
    <section className="py-24 bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="container mx-auto px-6">
        <motion.div
          className="text-center max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <span className="material-symbols-outlined text-6xl text-brand-primary mb-6 block">
            contact_support
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            {title}
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            {description}
          </p>
          <Link
            href={buttonLink}
            className="inline-flex items-center gap-2 bg-brand-primary text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-brand-accent transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105"
          >
            <span>{buttonText}</span>
            <span className="material-symbols-outlined">arrow_forward</span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
