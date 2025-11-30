"use client";
import { motion } from "framer-motion";

interface Category {
  id: string;
  name: string;
}

interface Props {
  categories: Category[];
  activeCategory: string;
  onCategoryChange: (categoryId: string) => void;
}

export default function FAQCategories({ categories, activeCategory, onCategoryChange }: Props) {
  return (
    <div className="flex flex-wrap gap-3 justify-center mb-12">
      <motion.button
        onClick={() => onCategoryChange("all")}
        className={`px-6 py-3 rounded-full font-medium transition-all duration-300 ${
          activeCategory === "all"
            ? "bg-brand-primary text-white shadow-lg scale-105"
            : "bg-white text-gray-700 hover:bg-gray-50 shadow"
        }`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        全部
      </motion.button>
      {categories.map((category) => (
        <motion.button
          key={category.id}
          onClick={() => onCategoryChange(category.id)}
          className={`px-6 py-3 rounded-full font-medium transition-all duration-300 ${
            activeCategory === category.id
              ? "bg-brand-primary text-white shadow-lg scale-105"
              : "bg-white text-gray-700 hover:bg-gray-50 shadow"
          }`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {category.name}
        </motion.button>
      ))}
    </div>
  );
}
