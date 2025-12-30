"use client";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

interface Feature {
  icon: string;
  label: string;
}

interface Opportunity {
  title: string;
  subtitle: string;
  features: Feature[];
  gradient: string;
}

interface MarketOpportunityData {
  title?: string;
  backgroundImage?: string;
  opportunities?: Opportunity[];
}

interface MarketOpportunityProps {
  data?: MarketOpportunityData;
}

const defaultOpportunities: Opportunity[] = [
  {
    title: "無需經驗,全程培訓",
    subtitle: "素人就能上手",
    features: [
      { icon: "support_agent", label: "後端行政支持" },
      { icon: "campaign", label: "品牌廣告行銷" }
    ],
    gradient: "from-blue-600 to-cyan-500"
  },
  {
    title: "突破長照2.0侷限性",
    subtitle: "長照相關工作的職涯升級",
    features: [
      { icon: "trending_up", label: "提供既有顧客更多服務" },
      { icon: "diversity_3", label: "多角化經營不同層面顧客" }
    ],
    gradient: "from-cyan-500 to-teal-500"
  }
];

export default function MarketOpportunity({ data }: MarketOpportunityProps) {
  const title = data?.title || "長照市場:未來的黃金產業";
  const backgroundImage = data?.backgroundImage || "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?q=80&w=2000";
  const opportunities = data?.opportunities && data.opportunities.length > 0 ? data.opportunities : defaultOpportunities;
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      id="main"
      className="relative py-24 overflow-hidden"
    >
      {/* 背景圖片 */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-fixed"
        style={{
          backgroundImage: `url('${backgroundImage}')`,
        }}
      />

      {/* 深色遮罩 */}
      <div className="absolute inset-0 bg-gradient-to-r from-brand-secondary/95 to-brand-primary/90" />

      {/* 裝飾性圖案 */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-white rounded-full blur-3xl" />
      </div>

      <div className="relative container mx-auto px-6" ref={ref}>
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            {title}
          </h2>
          <div className="h-1 w-32 bg-white/50 mx-auto rounded-full" />
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {opportunities.map((opp, index) => (
            <motion.div
              key={index}
              className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-white/20"
              initial={{ opacity: 0, y: 50 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              whileHover={{ scale: 1.02, y: -5 }}
            >
              <div className="text-center mb-8">
                <h3 className={`text-2xl font-bold bg-gradient-to-r ${opp.gradient} bg-clip-text text-transparent mb-2`}>
                  {opp.title}
                </h3>
                <p className="text-gray-600 font-medium">{opp.subtitle}</p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {opp.features.map((feature, idx) => (
                  <motion.div
                    key={idx}
                    className="text-center"
                    whileHover={{ scale: 1.1 }}
                  >
                    <div className={`w-20 h-20 mx-auto mb-3 bg-gradient-to-br ${opp.gradient} rounded-2xl flex items-center justify-center shadow-lg`}>
                      <span className="material-symbols-outlined text-4xl text-white">
                        {feature.icon}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-700 leading-snug">
                      {feature.label}
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
