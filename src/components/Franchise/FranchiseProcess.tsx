"use client";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import Image from "next/image";

interface ProcessStep {
  number: number;
  title: string;
  image: string;
}

interface FranchiseProcessData {
  title?: string;
  subtitle?: string;
  stepsPerRow?: number;
  steps?: ProcessStep[];
}

interface FranchiseProcessProps {
  data?: FranchiseProcessData;
}

const defaultSteps: ProcessStep[] = [
  { number: 1, title: "客戶洽詢", image: "" },
  { number: 2, title: "需求了解", image: "" },
  { number: 3, title: "鄰里評估現場勘查", image: "" },
  { number: 4, title: "規劃建議", image: "" },
  { number: 5, title: "專案簽約", image: "" },
  { number: 6, title: "教育訓練", image: "" },
  { number: 7, title: "工程施作", image: "" },
  { number: 8, title: "完工開幕", image: "" },
];

export default function FranchiseProcess({ data }: FranchiseProcessProps) {
  const title = data?.title || "加盟流程";
  const subtitle = data?.subtitle || "八個步驟,輕鬆開啟創業之路";
  const steps = data?.steps && data.steps.length > 0 ? data.steps : defaultSteps;
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  // 根據步驟數量計算每個步驟的寬度百分比
  const stepWidth = `${100 / steps.length}%`;

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

        {/* 桌面版 - 一直線橫向流程 */}
        <div className="hidden lg:block">
          <div className="relative">
            {/* 連接線 */}
            <div className="absolute top-16 left-0 right-0 h-1 bg-gradient-to-r from-brand-primary via-brand-accent to-brand-primary" />

            {/* 使用 flex 讓所有步驟均勻分佈在一行 */}
            <div className="flex justify-between">
              {steps.map((step, index) => (
                <motion.div
                  key={step.number}
                  className="relative flex-1 px-2"
                  style={{ maxWidth: stepWidth }}
                  initial={{ opacity: 0, y: 50 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{
                    duration: 0.4,
                    delay: index * 0.1,
                  }}
                >
                  <div className="flex flex-col items-center">
                    {/* 圖片或預設圓形 */}
                    <motion.div
                      className="relative z-10 w-24 h-24 xl:w-32 xl:h-32 bg-white border-4 border-brand-primary rounded-2xl shadow-xl flex items-center justify-center mb-4 group hover:bg-brand-primary transition-all duration-300 overflow-hidden"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                    >
                      {step.image ? (
                        <Image
                          src={step.image}
                          alt={step.title}
                          fill
                          className="object-cover group-hover:opacity-80 transition-opacity duration-300"
                        />
                      ) : (
                        <span className="text-3xl xl:text-5xl font-bold text-brand-primary group-hover:text-white transition-colors duration-300">
                          {step.number}
                        </span>
                      )}
                    </motion.div>

                    {/* 步驟編號 */}
                    <div className="w-8 h-8 xl:w-10 xl:h-10 bg-gradient-to-br from-brand-primary to-brand-accent rounded-full flex items-center justify-center text-white font-bold mb-2 shadow-md text-sm xl:text-base">
                      {step.number}
                    </div>

                    {/* 步驟標題 */}
                    <p className="text-center text-xs xl:text-sm font-medium text-gray-700 leading-tight px-1">
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
                  key={step.number}
                  className="relative flex items-center gap-6"
                  initial={{ opacity: 0, x: -50 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  {/* 圖片或預設圓形 */}
                  <motion.div
                    className="relative z-10 w-16 h-16 bg-white border-4 border-brand-primary rounded-xl shadow-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
                    whileHover={{ scale: 1.1 }}
                  >
                    {step.image ? (
                      <Image
                        src={step.image}
                        alt={step.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-bold text-brand-primary">
                        {step.number}
                      </span>
                    )}
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
