"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface FAQ {
  category: string;
  question: string;
  answer: string;
}

interface Props {
  faqs: FAQ[];
  activeCategory: string;
}

export default function FAQList({ faqs, activeCategory }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const filteredFaqs = activeCategory === "all"
    ? faqs
    : faqs.filter((faq) => faq.category === activeCategory);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {filteredFaqs.map((faq, index) => {
        const isOpen = openIndex === index;
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
          >
            <button
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors duration-200"
            >
              <div className="flex items-start gap-4 flex-1">
                <span className="material-symbols-outlined text-brand-primary mt-1 flex-shrink-0">
                  {isOpen ? "expand_less" : "expand_more"}
                </span>
                <span className="font-semibold text-gray-800 text-lg">
                  {faq.question}
                </span>
              </div>
            </button>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-6 pl-16">
                    <div className="text-gray-600 leading-relaxed whitespace-pre-line">
                      {faq.answer}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}

      {filteredFaqs.length === 0 && (
        <div className="text-center py-16">
          <span className="material-symbols-outlined text-6xl text-gray-300 mb-4 block">
            search_off
          </span>
          <p className="text-gray-500 text-lg">此分類目前沒有問題</p>
        </div>
      )}
    </div>
  );
}
