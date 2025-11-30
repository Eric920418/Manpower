"use client";
import { motion } from "framer-motion";
import Image from "next/image";

interface Staff {
  id: string;
  name: string;
  position: string;
  photo: string;
  phone: string;
  email: string;
  line: string;
  bio: string;
  specialties: string[];
}

interface Props {
  staffList: Staff[];
}

export default function StaffList({ staffList }: Props) {
  return (
    <section className="py-24 bg-gray-50">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <span className="inline-block px-4 py-2 bg-brand-primary/10 text-brand-primary rounded-full text-sm font-medium mb-4">
              專業團隊
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              認識我們的業務團隊
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              每位業務人員都經過專業培訓，致力於為您提供最優質的服務
            </p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {staffList.map((staff, index) => (
            <motion.div
              key={staff.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 group"
            >
              {/* 照片區域 */}
              <div className="relative h-72 overflow-hidden">
                <Image
                  src={staff.photo}
                  alt={staff.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-2xl font-bold text-white">{staff.name}</h3>
                  <p className="text-white/90">{staff.position}</p>
                </div>
              </div>

              {/* 資訊區域 */}
              <div className="p-6">
                <p className="text-gray-600 mb-4 line-clamp-3">{staff.bio}</p>

                {/* 專長標籤 */}
                {staff.specialties.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-2">專長領域</p>
                    <div className="flex flex-wrap gap-2">
                      {staff.specialties.map((specialty, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-brand-primary/10 text-brand-primary text-xs rounded-full"
                        >
                          {specialty}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 聯絡資訊 */}
                <div className="space-y-2 pt-4 border-t border-gray-100">
                  {staff.phone && (
                    <a
                      href={`tel:${staff.phone.replace(/-/g, "")}`}
                      className="flex items-center gap-3 text-gray-600 hover:text-brand-primary transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">phone</span>
                      <span className="text-sm">{staff.phone}</span>
                    </a>
                  )}
                  {staff.email && (
                    <a
                      href={`mailto:${staff.email}`}
                      className="flex items-center gap-3 text-gray-600 hover:text-brand-primary transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">mail</span>
                      <span className="text-sm">{staff.email}</span>
                    </a>
                  )}
                  {staff.line && (
                    <div className="flex items-center gap-3 text-gray-600">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.349 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                      </svg>
                      <span className="text-sm">{staff.line}</span>
                    </div>
                  )}
                </div>

                {/* 聯絡按鈕 */}
                <a
                  href={`tel:${staff.phone?.replace(/-/g, "")}`}
                  className="mt-4 w-full py-3 bg-brand-primary text-white rounded-lg font-medium hover:bg-brand-accent transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">call</span>
                  <span>立即聯絡</span>
                </a>
              </div>
            </motion.div>
          ))}
        </div>

        {staffList.length === 0 && (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">
              people
            </span>
            <p className="text-gray-500 text-lg">尚未新增業務人員資料</p>
          </div>
        )}
      </div>
    </section>
  );
}
