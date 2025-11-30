"use client";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

const applySteps = [
  {
    step: "1",
    title: "選擇工作類別",
    description: "根據您的專長與興趣，從看護工、幫傭、廠工、營造工、養護機構等類別中選擇適合的工作。",
    icon: "work",
    color: "from-blue-500 to-cyan-500"
  },
  {
    step: "2",
    title: "填寫申請表單",
    description: "詳細填寫個人資料、工作經歷、專業技能等資訊，並上傳相關證件與照片。",
    icon: "edit_document",
    color: "from-purple-500 to-pink-500"
  },
  {
    step: "3",
    title: "審核與面試",
    description: "我們的專業團隊將審核您的申請資料，並安排面試與技能評估，確保工作適配性。",
    icon: "person_search",
    color: "from-orange-500 to-red-500"
  },
  {
    step: "4",
    title: "職前訓練",
    description: "通過審核後，參加專業的職前訓練課程，學習工作技能、安全規範與職場禮儀。",
    icon: "school",
    color: "from-yellow-600 to-orange-600"
  },
  {
    step: "5",
    title: "正式錄用",
    description: "完成訓練並通過考核後，簽署勞動合約，開始您的新工作旅程。",
    icon: "verified",
    color: "from-green-500 to-emerald-500"
  }
];

export default function ApplySteps() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-6">
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          ref={ref}
        >
          <h2 className="text-3xl md:text-5xl font-bold text-gray-800 mb-4">
            申請步驟
          </h2>
          <p className="text-gray-600 text-lg">
            簡單五步驟，開啟您的職涯新旅程
          </p>
        </motion.div>

        {/* Desktop View - 橫向流程圖 */}
        <div className="hidden md:block max-w-6xl mx-auto mb-20">
          <div className="relative">
            {/* 連接線 */}
            <div className="absolute top-24 left-0 right-0 h-1 bg-gradient-to-r from-brand-primary via-brand-accent to-brand-primary opacity-30" />

            <div className="grid grid-cols-5 gap-4">
              {applySteps.map((step, index) => (
                <motion.div
                  key={index}
                  className="relative"
                  initial={{ opacity: 0, y: 50 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.6, delay: index * 0.15 }}
                >
                  {/* 步驟圓圈 */}
                  <div className="flex flex-col items-center mb-6">
                    <motion.div
                      className={`w-20 h-20 bg-gradient-to-br ${step.color} rounded-full flex items-center justify-center shadow-lg mb-4 relative z-10`}
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <span className="material-symbols-outlined text-white text-4xl">
                        {step.icon}
                      </span>
                    </motion.div>

                    {/* 步驟編號 */}
                    <div className="w-10 h-10 bg-white border-4 border-brand-primary rounded-full flex items-center justify-center shadow-md relative z-10">
                      <span className="text-brand-primary font-bold text-lg">
                        {step.step}
                      </span>
                    </div>
                  </div>

                  {/* 內容 */}
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-gray-800 mb-2">
                      {step.title}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile View - 垂直流程圖 */}
        <div className="md:hidden space-y-8 max-w-md mx-auto">
          {applySteps.map((step, index) => (
            <motion.div
              key={index}
              className="relative flex gap-6"
              initial={{ opacity: 0, x: -50 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.15 }}
            >
              {/* 左側：圖標與連接線 */}
              <div className="flex flex-col items-center">
                <motion.div
                  className={`w-16 h-16 bg-gradient-to-br ${step.color} rounded-full flex items-center justify-center shadow-lg relative z-10`}
                  whileHover={{ scale: 1.1 }}
                >
                  <span className="material-symbols-outlined text-white text-3xl">
                    {step.icon}
                  </span>
                </motion.div>

                {/* 連接線 */}
                {index < applySteps.length - 1 && (
                  <div className="w-1 h-full bg-gradient-to-b from-brand-primary to-brand-accent opacity-30 mt-2" />
                )}
              </div>

              {/* 右側：內容 */}
              <div className="flex-1 pb-8">
                <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-shadow duration-300">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-brand-primary rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {step.step}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">
                      {step.title}
                    </h3>
                  </div>
                  <p className="text-gray-600 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
