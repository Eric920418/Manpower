"use client";
import { motion } from "framer-motion";
import Image from "next/image";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

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
  detailUrl?: string;
}

interface ListSection {
  tag: string;
  title: string;
  description: string;
}

interface Props {
  staffList: Staff[];
  listSection: ListSection;
}

export default function StaffList({ staffList, listSection }: Props) {
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);

  const handleViewDetail = (staff: Staff) => {
    if (staff.detailUrl) {
      setSelectedStaff(staff);
      setQrModalOpen(true);
    }
  };

  const closeModal = () => {
    setQrModalOpen(false);
    setSelectedStaff(null);
  };

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
              {listSection.tag}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {listSection.title}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {listSection.description}
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
              className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 group h-full flex flex-col"
            >
              {/* 照片區域 */}
              <div className="relative overflow-hidden aspect-[3/4] bg-gray-100 shrink-0">
                <Image
                  src={staff.photo}
                  alt={staff.name}
                  fill
                  className="object-contain group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-2xl font-bold text-white">{staff.name}</h3>
                  <p className="text-white/90">{staff.position}</p>
                </div>
              </div>

              {/* 資訊區域 */}
              <div className="p-6 flex-1 flex flex-col">
                <p className="text-gray-600 mb-4 whitespace-pre-line line-clamp-4 min-h-[120px]">{staff.bio}</p>

                {/* 專長標籤 */}
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-2">專長領域</p>
                  <div className="flex flex-wrap gap-2 min-h-[60px]">
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

                {/* 聯絡資訊 */}
                <div className="space-y-2 pt-4 border-t border-gray-100 flex-1">
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

                {/* 查看詳細資料按鈕 */}
                <button
                  onClick={() => handleViewDetail(staff)}
                  disabled={!staff.detailUrl}
                  className={`mt-4 w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 shrink-0 ${
                    staff.detailUrl
                      ? "bg-brand-primary text-white hover:bg-brand-accent cursor-pointer"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">
                    {staff.detailUrl ? "qr_code_2" : "person"}
                  </span>
                  <span>{staff.detailUrl ? "查看詳細資料" : "暫無詳細資料"}</span>
                </button>
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

      {/* QR Code 彈窗 */}
      {qrModalOpen && selectedStaff && selectedStaff.detailUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="relative bg-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 關閉按鈕 */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>

            {/* 標題 */}
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-800 mb-1">
                {selectedStaff.name}
              </h3>
              <p className="text-sm text-gray-500">{selectedStaff.position}</p>
            </div>

            {/* QR Code */}
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-white rounded-xl shadow-inner border-2 border-gray-100">
                <QRCodeSVG
                  value={selectedStaff.detailUrl}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>
            </div>

            {/* 提示文字 */}
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                掃描 QR Code 查看詳細資料
              </p>
              <p className="text-xs text-gray-400 break-all">
                {selectedStaff.detailUrl}
              </p>
            </div>

            {/* 關閉按鈕 */}
            <button
              onClick={closeModal}
              className="w-full mt-6 py-3 bg-brand-primary hover:bg-brand-accent text-white font-semibold rounded-lg transition-colors"
            >
              關閉
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
