"use client";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

interface Advantage {
  number: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  imagePosition: string;
}

interface PartnershipAdvantagesData {
  title?: string;
  subtitle?: string;
  advantages?: Advantage[];
  ctaButton?: {
    text: string;
    link: string;
  };
}

interface PartnershipAdvantagesProps {
  data?: PartnershipAdvantagesData;
}

const defaultAdvantages: Advantage[] = [
  {
    number: "1",
    title: "全程教育訓練",
    subtitle: "分階段課程,從法規到實務,全方位指導",
    description: "我們提供完整的教育訓練體系,課程依照加盟夥伴的需求分階段進行:基礎階段涵蓋相關法規與行業入門知識,中期則安排實務操作與案例分析,最終讓夥伴透過實地實習熟練各種技能。",
    icon: "school",
    imagePosition: "right"
  },
  {
    number: "2",
    title: "品質管控與支持",
    subtitle: "品牌權利金模式,確保服務標準與業務品質",
    description: "採取品牌權利金模式,我們嚴格管控服務流程與標準,確保每位加盟夥伴提供一致且高品質的服務。我們還提供定期稽核和改善建議,針對經營中的難題提供快速支援。",
    icon: "verified",
    imagePosition: "left"
  },
  {
    number: "3",
    title: "多角化業務機會",
    subtitle: "豐富經營經驗,拓展多元市場與客戶資源",
    description: "作為業界領先品牌,佑羲人力累積了豐富的經驗與行業資源,協助加盟主開拓多元化市場機會。從家庭看護到機構合作,再到新興長照需求,每一個業務板塊都充滿潛力與機遇。",
    icon: "account_tree",
    imagePosition: "right"
  },
  {
    number: "4",
    title: "行銷與品牌背書",
    subtitle: "獨立行銷團隊支援,提升市場競爭力",
    description: "我們擁有專業的獨立行銷團隊,負責規劃品牌推廣活動,提供多樣化的宣傳資源,包括數位行銷、社群媒體推廣與實體活動策劃。我們還會針對地區特性量身定制行銷策略。",
    icon: "campaign",
    imagePosition: "left"
  }
];

export default function PartnershipAdvantages({ data }: PartnershipAdvantagesProps) {
  const title = data?.title || "穩健創業的最佳夥伴—佑羲人力";
  const subtitle = data?.subtitle || "四大核心優勢,助您成功創業";
  const advantages = data?.advantages && data.advantages.length > 0 ? data.advantages : defaultAdvantages;
  const ctaButton = data?.ctaButton || { text: "從零開始:成為加盟主", link: "#seminar" };
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="details" className="py-24 bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-6">
        <motion.div
          className="text-center mb-20"
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

        <div className="space-y-24 max-w-6xl mx-auto">
          {advantages.map((advantage, index) => (
            <motion.div
              key={index}
              className={`grid md:grid-cols-2 gap-12 items-center ${
                advantage.imagePosition === "left" ? "md:flex-row-reverse" : ""
              }`}
              initial={{ opacity: 0, y: 50 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.2 }}
            >
              {/* 內容區 */}
              <motion.div
                className={advantage.imagePosition === "left" ? "md:order-2" : ""}
                whileHover={{ x: advantage.imagePosition === "left" ? -10 : 10 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-brand-primary to-brand-accent rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                    {advantage.number}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800">{advantage.title}</h3>
                    <p className="text-brand-primary font-medium">{advantage.subtitle}</p>
                  </div>
                </div>
                <p className="text-gray-600 leading-relaxed text-lg">
                  {advantage.description}
                </p>
              </motion.div>

              {/* 圖片區 (使用圖標替代) */}
              <motion.div
                className={`${advantage.imagePosition === "left" ? "md:order-1" : ""} relative`}
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="relative h-80 bg-gradient-to-br from-brand-primary/10 to-brand-accent/10 rounded-3xl overflow-hidden shadow-xl border border-brand-primary/20">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[120px] text-brand-primary/30">
                      {advantage.icon}
                    </span>
                  </div>

                  {/* 裝飾性元素 */}
                  <div className="absolute top-4 right-4 w-20 h-20 bg-white/50 rounded-full blur-2xl" />
                  <div className="absolute bottom-4 left-4 w-32 h-32 bg-brand-primary/20 rounded-full blur-3xl" />
                </div>
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* CTA 按鈕 */}
        <motion.div
          className="text-center mt-20"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <motion.a
            href={ctaButton.link}
            className="inline-block px-10 py-4 bg-gradient-to-r from-brand-primary to-brand-accent text-white font-semibold text-lg rounded-full shadow-lg hover:shadow-2xl transition-all duration-300"
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.95 }}
          >
            {ctaButton.text}
            <span className="material-symbols-outlined ml-2 align-middle">arrow_forward</span>
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}
