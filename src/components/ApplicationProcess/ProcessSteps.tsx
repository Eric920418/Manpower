"use client";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

interface Step {
  number: number;
  title: string;
  description: string;
  icon: string;
}

interface Props {
  steps: Step[];
}

export default function ProcessSteps({ steps }: Props) {
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
            簡單流程，輕鬆完成
          </h2>
          <p className="text-gray-600 text-lg">跟隨我們的步驟，快速完成申請</p>
        </motion.div>

        {/* 桌面版 - 橫向流程 */}
        <div className="hidden lg:block">
          <div className="relative">
            {/* 連接線 */}
            {steps.length > 1 && (
              <div className="absolute top-16 left-0 right-0 h-1 bg-gradient-to-r from-brand-primary via-brand-accent to-brand-primary" />
            )}

            <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
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
                    <h3 className="text-center text-lg font-semibold text-gray-800 mb-2 px-2">
                      {step.title}
                    </h3>

                    {/* 步驟描述 */}
                    <p className="text-center text-sm text-gray-600 leading-tight px-2">
                      {step.description}
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
            {steps.length > 1 && (
              <div className="absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-brand-primary via-brand-accent to-brand-primary" />
            )}

            <div className="space-y-8">
              {steps.map((step, index) => (
                <motion.div
                  key={index}
                  className="relative flex items-start gap-6"
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
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-brand-primary to-brand-accent rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {step.number}
                      </div>
                      <h3 className="font-semibold text-gray-800 text-lg">{step.title}</h3>
                    </div>
                    <p className="text-gray-600 text-sm pl-11">{step.description}</p>
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
