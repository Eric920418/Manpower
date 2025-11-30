"use client";
import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import NewsHero from "@/components/News/NewsHero";
import NewsCategories from "@/components/News/NewsCategories";
import FeaturedNews from "@/components/News/FeaturedNews";
import NewsList from "@/components/News/NewsList";

export default function NewsPage() {
  const [activeCategory, setActiveCategory] = useState("全部");
  const [pageData, setPageData] = useState<any>(null);
  const [headerData, setHeaderData] = useState<any>(null);
  const [footerData, setFooterData] = useState<any>(null);
  const [navigations, setNavigations] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const query = `
        query getNewsPage {
          homePage {
            header
            footer
          }
          newsPage {
            hero
            categories
            featuredNews
            newsList
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
        setPageData(data.newsPage[0]);
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

      <NewsHero
        title={pageData.hero.title}
        description={pageData.hero.description}
      />

      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-6">
          <NewsCategories
            categories={pageData.categories}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />

          <FeaturedNews news={pageData.featuredNews} />

          <NewsList
            newsList={pageData.newsList}
            activeCategory={activeCategory}
          />
        </div>
      </section>

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
