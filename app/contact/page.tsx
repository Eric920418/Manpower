"use client";
import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ContactSection from "@/components/ContactSection";

export default function ContactPage() {
  const [pageData, setPageData] = useState<any>(null);
  const [headerData, setHeaderData] = useState<any>(null);
  const [footerData, setFooterData] = useState<any>(null);
  const [navigations, setNavigations] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const query = `
        query getContactPage {
          homePage {
            header
            footer
          }
          contactPage {
            badge
            title
            description
            questionTypes
            formFields
            submitButton
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
        setPageData(data.contactPage[0]);
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

  return (
    <main className="relative flex min-h-screen w-full flex-col">
      <Header
        logo={headerData.logo}
        navigation={navigations.map((nav: { label: string; url: string | null }) => ({
          label: nav.label,
          link: nav.url || "#",
        }))}
        contactButton={headerData.contactButton}
      />

      {/* 頂部間距，為 Header 留出空間 */}
      <div className="pt-20" />

      <ContactSection
        badge={pageData.badge}
        title={pageData.title}
        description={pageData.description}
        questionTypes={pageData.questionTypes}
        formFields={pageData.formFields}
        submitButton={pageData.submitButton}
        contactInfo={pageData.contactInfo}
      />

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
