"use client";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";

interface CTAButton {
  text: string;
  link: string;
  icon: string;
  variant: string;
}

interface ContactInfo {
  icon: string;
  label: string;
  value: string;
}

interface FranchiseCTAData {
  title?: string;
  subtitle?: string;
  backgroundImage?: string;
  buttons?: CTAButton[];
  contactInfo?: ContactInfo[];
}

interface FranchiseCTAProps {
  data?: FranchiseCTAData;
}

const defaultButtons: CTAButton[] = [
  { text: "聯絡我們", link: "/contact", icon: "mail", variant: "primary" },
  { text: "加盟說明會報名表", link: "/franchise/seminar", icon: "event_note", variant: "secondary" },
];

const defaultContactInfo: ContactInfo[] = [
  { icon: "phone", label: "免付費專線", value: "0800-600-885" },
  { icon: "schedule", label: "服務時間", value: "週一至週五 09:00-18:00" },
];

export default function FranchiseCTA({ data }: FranchiseCTAProps) {
  const title = data?.title || "想要了解佑羲人力加盟資訊";
  const subtitle = data?.subtitle || "歡迎與我們聯繫喔!";
  const backgroundImage = data?.backgroundImage || "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=2000";
  const buttons = data?.buttons && data.buttons.length > 0 ? data.buttons : defaultButtons;
  const contactInfo = data?.contactInfo && data.contactInfo.length > 0 ? data.contactInfo : defaultContactInfo;
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <section id="seminar" className="relative py-28 overflow-hidden">
      {/* 背景圖片 */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('${backgroundImage}')`,
        }}
      />

      {/* 漸層遮罩 */}
      <div className="absolute inset-0 bg-gradient-to-r from-brand-secondary/90 via-brand-primary/85 to-brand-accent/90" />

      {/* 動態背景元素 */}
      <div className="absolute inset-0 opacity-20">
        <motion.div
          className="absolute top-20 left-20 w-64 h-64 bg-white rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="relative container mx-auto px-6" ref={ref}>
        <motion.div
          className="text-center max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          {/* 標題 */}
          <motion.h2
            className="text-3xl md:text-5xl font-bold text-white mb-4"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {title}
          </motion.h2>

          <motion.p
            className="text-xl text-white/90 mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {subtitle}
          </motion.p>

          {/* 按鈕組 */}
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            {buttons.map((btn, index) => (
              <motion.div key={index} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Link
                  href={btn.link}
                  className={`inline-flex items-center gap-2 px-8 py-4 font-semibold text-lg rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 border-2 border-white ${
                    btn.variant === "primary"
                      ? "bg-white text-brand-primary"
                      : "bg-transparent text-white hover:bg-white hover:text-brand-primary"
                  }`}
                >
                  <span className="material-symbols-outlined">{btn.icon}</span>
                  {btn.text}
                </Link>
              </motion.div>
            ))}
          </motion.div>

          {/* 額外資訊 */}
          <motion.div
            className="mt-12 flex flex-wrap justify-center gap-8 text-white/90"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            {contactInfo.map((info, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="material-symbols-outlined">{info.icon}</span>
                <span className="font-medium">{info.label}: {info.value}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* 浮動裝飾元素 */}
        <motion.div
          className="absolute -bottom-10 -left-10 w-40 h-40 border-4 border-white/20 rounded-full"
          animate={{
            y: [0, -20, 0],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        <motion.div
          className="absolute -top-10 -right-10 w-32 h-32 border-4 border-white/20 rounded-full"
          animate={{
            y: [0, 20, 0],
            rotate: [360, 180, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>
    </section>
  );
}
