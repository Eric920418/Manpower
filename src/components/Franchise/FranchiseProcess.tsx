"use client";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

interface ProcessStep {
  number: number;
  title: string;
  icon: string;
}

interface FranchiseProcessData {
  title?: string;
  subtitle?: string;
  steps?: ProcessStep[];
}

interface FranchiseProcessProps {
  data?: FranchiseProcessData;
}

const defaultSteps: ProcessStep[] = [
  { number: 1, title: "客戶洽詢", icon: "contact_support" },
  { number: 2, title: "需求了解", icon: "psychology" },
  { number: 3, title: "鄰里評估現場勘查", icon: "map" },
  { number: 4, title: "規劃建議", icon: "lightbulb" },
  { number: 5, title: "專案簽約", icon: "handshake" },
  { number: 6, title: "教育訓練", icon: "school" },
  { number: 7, title: "工程施作", icon: "construction" },
  { number: 8, title: "完工開幕", icon: "celebration" },
];

export default function FranchiseProcess({ data }: FranchiseProcessProps) {
  const title = data?.title || "加盟流程";
  const subtitle = data?.subtitle || "八個步驟,輕鬆開啟創業之路";
  const steps = data?.steps && data.steps.length > 0 ? data.steps : defaultSteps;
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          ref={ref}
        >
          <h2 className="text-3xl md:text-5xl font-bold text-gray-800 mb-4">
            {title}
          </h2>
          <p className="text-gray-600 text-lg">{subtitle}</p>
        </motion.div>

        {/* 桌面版 - 橫向流程 */}
        <div className="hidden lg:block">
          <div className="relative">
            {/* 連接線 */}
            <div className="absolute top-16 left-0 right-0 h-1 bg-gradient-to-r from-brand-primary via-brand-accent to-brand-primary" />

            <div className="grid grid-cols-8 gap-4">
              {steps.map((step, index) => (
                <motion.div
                  key={index}
                  className="relative"
                  initial={{ opacity: 0, y: 50 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <div className="flex flex-col items-center">
                    {/* 圓形圖標 */}
                    <motion.div
                      className="relative z-10 w-32 h-32 bg-white border-4 border-brand-primary rounded-2xl shadow-xl flex items-center justify-center mb-4 group hover:bg-brand-primary transition-all duration-300"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                    >
                      <span className="material-symbols-outlined text-5xl text-brand-primary group-hover:text-white transition-colors duration-300">
                        {step.icon}
                      </span>
                    </motion.div>

                    {/* 步驟編號 */}
                    <div className="w-10 h-10 bg-gradient-to-br from-brand-primary to-brand-accent rounded-full flex items-center justify-center text-white font-bold mb-2 shadow-md">
                      {step.number}
                    </div>

                    {/* 步驟標題 */}
                    <p className="text-center text-sm font-medium text-gray-700 leading-tight px-2">
                      {step.title}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* 移動版 - 縱向流程 */}
        <div className="lg:hidden max-w-md mx-auto">
          <div className="relative">
            {/* 連接線 */}
            <div className="absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-brand-primary via-brand-accent to-brand-primary" />

            <div className="space-y-8">
              {steps.map((step, index) => (
                <motion.div
                  key={index}
                  className="relative flex items-center gap-6"
                  initial={{ opacity: 0, x: -50 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  {/* 圓形圖標 */}
                  <motion.div
                    className="relative z-10 w-16 h-16 bg-white border-4 border-brand-primary rounded-xl shadow-lg flex items-center justify-center flex-shrink-0"
                    whileHover={{ scale: 1.1 }}
                  >
                    <span className="material-symbols-outlined text-2xl text-brand-primary">
                      {step.icon}
                    </span>
                  </motion.div>

                  {/* 內容 */}
                  <div className="flex-1 bg-white rounded-xl shadow-md p-4 border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-brand-primary to-brand-accent rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {step.number}
                      </div>
                      <p className="font-medium text-gray-800">{step.title}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
