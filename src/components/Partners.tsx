"use client";
import Image from "next/image";
import Link from "next/link";

interface Partner {
  id: string;
  name: string;
  logo: string;
  url?: string;
}

interface PartnersSectionProps {
  title: string;
  description: string;
  partners: Partner[];
}

export default function Partners({
  title,
  description,
  partners,
}: PartnersSectionProps) {
  // 過濾掉沒有 logo 的合作夥伴
  const validPartners = partners.filter((partner) => partner.logo);

  if (validPartners.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-bg-secondary">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* 標題區塊 */}
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary/10 rounded-full border border-brand-primary/20">
            <span className="material-symbols-outlined text-brand-secondary text-sm">
              handshake
            </span>
            <span className="text-sm font-semibold text-brand-secondary">
              合作夥伴
            </span>
          </div>

          <h2 className="text-3xl md:text-4xl font-black text-text-primary tracking-tight">
            {title}
          </h2>

          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            {description}
          </p>
        </div>

        {/* Logo 展示區塊 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 md:gap-8">
          {validPartners.map((partner) => (
            <div
              key={partner.id}
              className="group flex items-center justify-center p-6 bg-bg-primary rounded-xl border border-border hover:border-brand-primary hover:shadow-lg transition-all duration-300"
            >
              {partner.url ? (
                <Link
                  href={partner.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                  title={partner.name}
                >
                  <Image
                    src={partner.logo}
                    alt={partner.name}
                    width={120}
                    height={80}
                    className="object-contain max-h-16 w-auto grayscale group-hover:grayscale-0 transition-all duration-300 opacity-70 group-hover:opacity-100"
                  />
                </Link>
              ) : (
                <Image
                  src={partner.logo}
                  alt={partner.name}
                  width={120}
                  height={80}
                  className="object-contain max-h-16 w-auto grayscale group-hover:grayscale-0 transition-all duration-300 opacity-70 group-hover:opacity-100"
                  title={partner.name}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
