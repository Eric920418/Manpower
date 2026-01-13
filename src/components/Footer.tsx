"use client";
import Link from "next/link";
import Image from "next/image";

interface SocialMedia {
  platform: string;
  link: string;
  svgPath: string;
}

interface QuickLink {
  label: string;
  link: string;
}

interface FooterProps {
  logo: {
    icon: string;
    text: string;
  };
  contact: {
    phone: string;
    address: string;
  };
  socialMedia: SocialMedia[];
  quickLinks: {
    title: string;
    links: QuickLink[];
  };
  map: {
    embedUrl: string;
  };
  copyright: string;
  bottomLinks?: QuickLink[]; // 已棄用，保留向後相容
}

export default function Footer({
  logo,
  contact,
  socialMedia,
  quickLinks,
  map,
  copyright,
}: FooterProps) {
  return (
    <footer className="bg-brand-secondary text-text-on-brand w-full pt-16 pb-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 mb-12">
          {/* Logo 和聯絡資訊區塊 */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/logow.png"
                alt="佑羲人力"
                width={48}
                height={48}
                className="h-12 w-12 object-contain"
              />
              <span className="text-xl font-bold tracking-tight text-text-on-brand">
                佑羲人力
              </span>
            </Link>

            <div className="flex flex-col gap-4 text-sm text-text-on-brand/90">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-xl text-brand-primary mt-0.5">
                  call
                </span>
                <a
                  href={`tel:${contact.phone}`}
                  className="hover:text-brand-primary transition-colors"
                >
                  {contact.phone}
                </a>
              </div>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-xl text-brand-primary mt-0.5">
                  location_on
                </span>
                <span>{contact.address}</span>
              </div>
            </div>

          </div>

          {/* 網站導覽 */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            <h3 className="text-lg font-semibold text-text-on-brand">
              {quickLinks.title}
            </h3>
            <nav className="grid grid-cols-2 gap-x-6 gap-y-3 text-text-on-brand/90">
              {quickLinks.links.map((link, index) => (
                <Link
                  key={index}
                  href={link.link}
                  className="hover:text-brand-primary transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Google Maps */}
          <div className="lg:col-span-5 w-full h-64 md:h-auto rounded-lg overflow-hidden">
            {map.embedUrl && (
              <iframe
                src={(() => {
                  // 支援兩種格式：純 URL 或包含 iframe 的 HTML
                  const url = map.embedUrl.trim();
                  if (url.startsWith('https://')) {
                    return url;
                  }
                  // 從 HTML 中提取 src URL
                  const match = url.match(/src="([^"]+)"/);
                  return match ? match[1] : '';
                })()}
                width="600"
                height="450"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full h-full"
              />
            )}
          </div>
        </div>

        {/* 底部版權資訊 */}
        <div className="border-t border-text-on-brand/20 pt-8 text-center text-sm">
          <p className="text-text-on-brand/80">
            {copyright}
            {" | "}
            <Link
              href="/privacy-policy"
              className="hover:text-brand-primary transition-colors"
            >
              隱私權與網站使用說明
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
