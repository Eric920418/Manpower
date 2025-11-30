"use client";
import { motion } from "framer-motion";

interface Props {
  categories: string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
}

export default function NewsCategories({ categories, activeCategory, onCategoryChange }: Props) {
  return (
    <div className="flex flex-wrap gap-3 justify-center mb-12">
      {categories.map((category) => (
        <motion.button
          key={category}
          onClick={() => onCategoryChange(category)}
          className={`px-6 py-3 rounded-full font-medium transition-all duration-300 ${
            activeCategory === category
              ? "bg-brand-primary text-white shadow-lg scale-105"
              : "bg-white text-gray-700 hover:bg-gray-50 shadow"
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {category}
        </motion.button>
      ))}
    </div>
  );
}
