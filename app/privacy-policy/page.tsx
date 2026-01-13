"use client";
import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface Section {
  id: string;
  title: string;
  content: string;
}

interface PageData {
  hero: {
    title: string;
    description: string;
  };
  sections: Section[];
  lastUpdated: string;
  contactInfo: {
    title: string;
    description: string;
    email: string;
    phone: string;
    address: string;
  };
}

export default function PrivacyPolicyPage() {
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [headerData, setHeaderData] = useState<any>(null);
  const [footerData, setFooterData] = useState<any>(null);
  const [navigations, setNavigations] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const query = `
        query getPrivacyPolicyPage {
          homePage {
            header
            footer
          }
          privacyPolicyPage {
            hero
            sections
            lastUpdated
            contactInfo
          }
          activeNavigations {
            id
            label
            url
            icon
            target
            children {
              id
              label
              url
              icon
              target
            }
          }
        }
      `;

      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const { data } = await res.json();
      if (data) {
        setHeaderData(data.homePage[0]?.header);
        setFooterData(data.homePage[0]?.footer);
        setPageData(data.privacyPolicyPage[0]);
        setNavigations(data.activeNavigations || []);
      }
    };

    fetchData();
  }, []);

  if (!headerData || !footerData || !pageData) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-lg text-gray-600">載入中...</p>
      </main>
    );
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <main className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
      <Header
        logo={headerData.logo}
        navigation={navigations.map((nav: { label: string; url: string | null }) => ({
          label: nav.label,
          link: nav.url || "#",
        }))}
        contactButton={headerData.contactButton}
      />

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-gray-900 to-gray-800 text-white pt-28 pb-16 md:pt-32 md:pb-24">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            {pageData.hero.title}
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto">
            {pageData.hero.description}
          </p>
          {pageData.lastUpdated && (
            <p className="text-sm text-gray-400 mt-4">
              最後更新日期：{formatDate(pageData.lastUpdated)}
            </p>
          )}
        </div>
      </section>

      {/* Content Sections */}
      <section className="py-12 md:py-16 bg-white">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="space-y-8">
            {pageData.sections.map((section, index) => (
              <article
                key={section.id || index}
                className="bg-gray-50 rounded-lg p-6 md:p-8"
              >
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
                  {section.title}
                </h2>
                <div
                  className="prose prose-gray max-w-none text-gray-700"
                  dangerouslySetInnerHTML={{ __html: section.content }}
                />
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Info Section */}
      {pageData.contactInfo && (
        <section className="py-12 md:py-16 bg-gray-100">
          <div className="container mx-auto px-6 max-w-4xl text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              {pageData.contactInfo.title}
            </h2>
            <p className="text-gray-600 mb-8">
              {pageData.contactInfo.description}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {pageData.contactInfo.email && (
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <div className="text-blue-600 mb-2">
                    <span className="material-symbols-outlined text-3xl">mail</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">電子郵件</h3>
                  <a
                    href={`mailto:${pageData.contactInfo.email}`}
                    className="text-blue-600 hover:underline"
                  >
                    {pageData.contactInfo.email}
                  </a>
                </div>
              )}
              {pageData.contactInfo.phone && (
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <div className="text-blue-600 mb-2">
                    <span className="material-symbols-outlined text-3xl">phone</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">聯絡電話</h3>
                  <a
                    href={`tel:${pageData.contactInfo.phone}`}
                    className="text-blue-600 hover:underline"
                  >
                    {pageData.contactInfo.phone}
                  </a>
                </div>
              )}
              {pageData.contactInfo.address && (
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <div className="text-blue-600 mb-2">
                    <span className="material-symbols-outlined text-3xl">location_on</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">辦公地址</h3>
                  <p className="text-gray-600">{pageData.contactInfo.address}</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <Footer
        logo={footerData.logo}
        contact={footerData.contact}
        socialMedia={footerData.socialMedia}
        quickLinks={footerData.quickLinks}
        map={footerData.map}
        copyright={footerData.copyright}
        bottomLinks={footerData.bottomLinks}
      />
    </main>
  );
}
