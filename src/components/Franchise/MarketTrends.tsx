"use client";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

interface MarketCard {
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  chartLabel: string;
  chartIcon: string;
}

interface MarketTrendsData {
  badge?: string;
  title?: string;
  cards?: MarketCard[];
}

interface MarketTrendsProps {
  data?: MarketTrendsData;
}

const fadeInUp = {
  hidden: { opacity: 0, y: 60 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6 }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

const defaultCards: MarketCard[] = [
  {
    icon: "elderly",
    title: "人口老化",
    subtitle: "超高齡社會的挑戰與機遇",
    description: "目前,台灣已經步入超高齡社會,這意味著在每五個人當中,就有一位是65歲以上的長者。這種現象帶來的影響涉及到社會、經濟、醫療、長照等各個層面。",
    chartLabel: "未來人口預估趨勢圖",
    chartIcon: "insert_chart",
  },
  {
    icon: "health_and_safety",
    title: "不健康餘命",
    subtitle: "平均8年的照護需求",
    description: "根據政府公布的統計數據,透過計算「平均死亡年齡」減去「健康年齡」,我們可以得出所謂的「不健康餘命」。自2014年至2022年,台灣人平均會面臨約8年的不健康年齡。",
    chartLabel: "不健康餘命統計圖",
    chartIcon: "monitoring",
  },
];

export default function MarketTrends({ data }: MarketTrendsProps) {
  const badge = data?.badge || "照護需求快速增長";
  const title = data?.title || "加入佑羲人力,攜手共創照護新時代";
  const cards = data?.cards && data.cards.length > 0 ? data.cards : defaultCards;
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="market" className="py-20 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-6">
        {/* 標題區 */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          ref={ref}
        >
          <motion.div
            className="inline-block px-6 py-2 bg-brand-primary/10 rounded-full mb-4"
            whileHover={{ scale: 1.05 }}
          >
            <span className="text-brand-primary font-semibold">{badge}</span>
          </motion.div>
          <h2 className="text-3xl md:text-5xl font-bold text-gray-800 mb-3">
            {title}
          </h2>
        </motion.div>

        {/* 市場數據卡片 */}
        <motion.div
          className="grid md:grid-cols-2 gap-8 mb-20"
          variants={staggerContainer}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          {cards.map((card, index) => (
            <motion.div
              key={index}
              className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow duration-300 border border-gray-100"
              variants={fadeInUp}
              whileHover={{ y: -10 }}
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="w-14 h-14 bg-brand-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-3xl text-brand-primary">
                    {card.icon}
                  </span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-brand-primary mb-2">{card.title}</h3>
                  <p className="text-sm text-gray-500">{card.subtitle}</p>
                </div>
              </div>

              <p className="text-gray-700 leading-relaxed mb-6">
                {card.description}
              </p>

              <div className="relative h-64 bg-gray-50 rounded-xl overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                  <span className="material-symbols-outlined text-6xl">{card.chartIcon}</span>
                </div>
                <p className="absolute bottom-4 left-4 text-xs text-gray-500">{card.chartLabel}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
