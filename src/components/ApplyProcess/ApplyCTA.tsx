"use client";
import { motion } from "framer-motion";
import Link from "next/link";

export default function ApplyCTA() {
  return (
    <section className="relative py-24 overflow-hidden">
      {/* 背景漸層 */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-secondary via-brand-primary to-brand-accent" />

      {/* 背景動畫元素 */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-10 left-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.div
          className="absolute bottom-10 right-10 w-96 h-96 bg-white/10 rounded-full blur-3xl"
          animate={{
            x: [0, -100, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>

      {/* 內容 */}
      <div className="relative z-10 container mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          {/* 圖標 */}
          <motion.div
            className="inline-block mb-6"
            animate={{
              y: [0, -10, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto border-2 border-white/30">
              <span className="material-symbols-outlined text-white text-6xl">
                rocket_launch
              </span>
            </div>
          </motion.div>

          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            準備好開始了嗎？
          </h2>
          <p className="text-xl text-white/90 mb-12 max-w-2xl mx-auto">
            立即申請，加入佑羲人力的專業團隊，開啟您的職涯新篇章
          </p>

          {/* CTA 按鈕組 */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <Link href="/application-process">
              <motion.button
                className="px-10 py-4 bg-white text-brand-primary font-semibold text-lg rounded-full shadow-xl hover:shadow-2xl transition-all duration-300"
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
              >
                立即申請工作
                <span className="material-symbols-outlined ml-2 align-middle">
                  arrow_forward
                </span>
              </motion.button>
            </Link>

            <Link href="/faq">
              <motion.button
                className="px-10 py-4 bg-transparent border-2 border-white text-white font-semibold text-lg rounded-full hover:bg-white/10 transition-all duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                常見問題
                <span className="material-symbols-outlined ml-2 align-middle">
                  help
                </span>
              </motion.button>
            </Link>
          </div>

          {/* 聯絡資訊 */}
          <motion.div
            className="mt-16 flex flex-col md:flex-row gap-8 justify-center items-center text-white/90"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl">phone</span>
              <div className="text-left">
                <p className="text-sm text-white/70">電話諮詢</p>
                <p className="font-semibold">0800-123-456</p>
              </div>
            </div>

            <div className="hidden md:block w-px h-12 bg-white/30" />

            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl">email</span>
              <div className="text-left">
                <p className="text-sm text-white/70">電子郵件</p>
                <p className="font-semibold">service@youshi-hr.com</p>
              </div>
            </div>

            <div className="hidden md:block w-px h-12 bg-white/30" />

            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-2xl">schedule</span>
              <div className="text-left">
                <p className="text-sm text-white/70">服務時間</p>
                <p className="font-semibold">週一至週五 9:00-18:00</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
