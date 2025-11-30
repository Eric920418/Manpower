"use client";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

interface Policy {
  icon: string;
  title: string;
  description: string;
  color: string;
}

interface PolicySupportData {
  title?: string;
  subtitle?: string;
  policies?: Policy[];
}

interface PolicySupportProps {
  data?: PolicySupportData;
}

const defaultPolicies: Policy[] = [
  {
    icon: "verified_user",
    title: "資格條件放寬",
    description: "政府自113年年底即開始進行申請條件放寬的法規修訂,預計放寬後可以讓更多有需要的族群得到這方面的照護資源。",
    color: "from-blue-500 to-cyan-500"
  },
  {
    icon: "groups",
    title: "短期照護需求",
    description: "政府將於114年試辦「多元陪伴照顧服務」,規劃由公益專業團體聘請移工,以一對多的方式,提供有照顧需求家庭臨時性照顧服務。",
    color: "from-cyan-500 to-teal-500"
  }
];

export default function PolicySupport({ data }: PolicySupportProps) {
  const title = data?.title || "政策支持";
  const subtitle = data?.subtitle || "政府積極推動長照產業發展";
  const policies = data?.policies && data.policies.length > 0 ? data.policies : defaultPolicies;
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          ref={ref}
        >
          <h2 className="text-3xl md:text-5xl font-bold text-brand-primary mb-3">
            {title}
          </h2>
          <p className="text-gray-600 text-lg">{subtitle}</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {policies.map((policy, index) => (
            <motion.div
              key={index}
              className="relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100"
              initial={{ opacity: 0, x: index === 0 ? -50 : 50 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              whileHover={{ y: -10 }}
            >
              {/* 彩色漸變背景 */}
              <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${policy.color}`} />

              <div className="p-8">
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-14 h-14 bg-gradient-to-br ${policy.color} rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg`}>
                    <span className="material-symbols-outlined text-3xl text-white">
                      {policy.icon}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mt-2">
                    {policy.title}
                  </h3>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  {policy.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
