"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";

interface Worker {
  id: string;
  name: string;
  age: number;
  gender: string;
  country: string;
  photo: string;
  experience: string;
  skills: string[];
  languages: string[];
  availability: string;
  category: string;
  sourceType: string;
  description: string;
  position?: string;
}

interface FilterOptions {
  categories: string[];
  countries: string[];
  genders: string[];
  sourceTypes: string[];
}

interface Props {
  workers: Worker[];
  filterOptions: FilterOptions;
}

export default function WorkersList({ workers, filterOptions }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string>("全部");
  const [selectedCountry, setSelectedCountry] = useState<string>("全部");
  const [selectedSourceType, setSelectedSourceType] = useState<string>("全部");
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);

  const filteredWorkers = workers.filter((worker) => {
    if (selectedCategory !== "全部" && worker.category !== selectedCategory) return false;
    if (selectedCountry !== "全部" && worker.country !== selectedCountry) return false;
    if (selectedSourceType !== "全部" && worker.sourceType !== selectedSourceType) return false;
    return true;
  });

  const toggleWorker = (workerId: string) => {
    setSelectedWorkers((prev) =>
      prev.includes(workerId)
        ? prev.filter((id) => id !== workerId)
        : [...prev, workerId]
    );
  };

  return (
    <section className="py-24 bg-gray-50">
      <div className="container mx-auto px-6">
        {/* 篩選器 */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                職業類別
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              >
                <option value="全部">全部</option>
                {filterOptions.categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                國家
              </label>
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              >
                <option value="全部">全部</option>
                {filterOptions.countries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                來源類型
              </label>
              <select
                value={selectedSourceType}
                onChange={(e) => setSelectedSourceType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent"
              >
                <option value="全部">全部</option>
                {(filterOptions.sourceTypes || []).map((sourceType) => (
                  <option key={sourceType} value={sourceType}>
                    {sourceType}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSelectedCategory("全部");
                  setSelectedCountry("全部");
                  setSelectedSourceType("全部");
                }}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                清除篩選
              </button>
            </div>
          </div>

          {/* 已選擇計數 */}
          {selectedWorkers.length > 0 && (
            <div className="mt-4 p-4 bg-brand-primary/10 rounded-lg flex items-center justify-between">
              <span className="text-brand-primary font-medium">
                已選擇 {selectedWorkers.length} 位人才
              </span>
              <button
                onClick={() => {
                  // 這裡應該導向到確認頁面
                  alert(`已選擇 ${selectedWorkers.length} 位人才，準備前往確認頁面`);
                }}
                className="px-6 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-accent transition flex items-center gap-2"
              >
                <span>前往確認</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          )}
        </div>

        {/* 人才卡片列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredWorkers.map((worker, index) => {
            const isSelected = selectedWorkers.includes(worker.id);
            return (
              <motion.div
                key={worker.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className={`bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 ${
                  isSelected ? "ring-4 ring-brand-primary" : ""
                }`}
              >
                {/* 照片 */}
                <div className="relative h-64">
                  <Image
                    src={worker.photo}
                    alt={worker.name}
                    fill
                    className="object-cover"
                  />
                  {/* 來源類型標籤 */}
                  {worker.sourceType && (
                    <div className={`absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-medium ${
                      worker.sourceType === "國內轉出工"
                        ? "bg-amber-500 text-white"
                        : "bg-emerald-500 text-white"
                    }`}>
                      {worker.sourceType}
                    </div>
                  )}
                  {isSelected && (
                    <div className="absolute top-4 right-4 bg-brand-primary text-white w-8 h-8 rounded-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-sm">check</span>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                    <h3 className="text-xl font-bold text-white">{worker.name}</h3>
                    <p className="text-sm text-white/90">{worker.position || worker.category}</p>
                  </div>
                </div>

                {/* 資訊 */}
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="material-symbols-outlined text-base">cake</span>
                      <span>{worker.age} 歲</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="material-symbols-outlined text-base">public</span>
                      <span>{worker.country}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="material-symbols-outlined text-base">work</span>
                      <span>{worker.experience}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="material-symbols-outlined text-base">schedule</span>
                      <span>{worker.availability}</span>
                    </div>
                  </div>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {worker.description}
                  </p>

                  {/* 技能標籤 */}
                  {worker.skills.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 mb-2">專業技能</p>
                      <div className="flex flex-wrap gap-2">
                        {worker.skills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 語言能力 */}
                  {worker.languages.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 mb-2">語言能力</p>
                      <div className="flex flex-wrap gap-2">
                        {worker.languages.map((lang, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full"
                          >
                            {lang}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 選擇按鈕 */}
                  <button
                    onClick={() => toggleWorker(worker.id)}
                    className={`w-full py-3 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
                      isSelected
                        ? "bg-brand-primary text-white hover:bg-brand-accent"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {isSelected ? "check_circle" : "add_circle"}
                    </span>
                    <span>{isSelected ? "已選擇" : "選擇此人才"}</span>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {filteredWorkers.length === 0 && (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">
              search_off
            </span>
            <p className="text-gray-500 text-lg">沒有符合條件的人才</p>
          </div>
        )}
      </div>
    </section>
  );
}
