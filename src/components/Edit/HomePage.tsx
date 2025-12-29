"use client";
import { gql } from "graphql-tag";
import { useState, useEffect } from "react";
import Image from "next/image";
import { ImageUploader } from "@/components/Admin/ImageUploader";
import { useSession } from "next-auth/react";
import { graphqlRequest } from "@/utils/graphqlClient";

const UPDATE_PAGE = gql`
  mutation UpdateHomePage($input: UpdateHomePageInput!) {
    updateHomePage(input: $input) {
      header
      hero
      featuredTalents
      newsSection
      contactSection
      footer
    }
  }
`;

const query = `
  query homePage {
    homePage {
      header
      hero
      featuredTalents
      newsSection
      contactSection
      footer
    }
  }
`;

interface UploadResponse {
  imageUrl: string;
}

interface NavigationItem {
  label: string;
  link: string;
}

interface Stat {
  number: string;
  label: string;
}

interface Talent {
  name: string;
  position: string;
  image: string;
  experience: string;
  location: string;
  skills: string[];
  detailUrl?: string;
}

interface SocialMedia {
  platform: string;
  link: string;
  svgPath: string;
}

interface QuickLink {
  label: string;
  link: string;
}

interface Category {
  label: string;
  value: string;
  active: boolean;
}

interface FeaturedArticle {
  badge: string;
  title: string;
  description: string;
  image: string;
  link: string;
}

interface Article {
  category: string;
  date: string;
  title: string;
  description: string;
  image: string;
  link: string;
}

interface FormField {
  label: string;
  placeholder: string;
  icon: string;
  required: boolean;
  rows?: number;
}

interface ContactInfo {
  icon: string;
  title: string;
  content: string;
  description: string;
  link: string;
}

interface HomePageData {
  header: {
    logo: {
      icon: string;
      text: string;
    };
    navigation: NavigationItem[];
    contactButton: {
      text: string;
      link: string;
    };
  };
  hero: {
    badge: string;
    title: string;
    description: string;
    primaryCTA: {
      text: string;
      link: string;
    };
    secondaryCTA: {
      text: string;
      link: string;
    };
    image: string;
  };
  featuredTalents: {
    badge: string;
    title: string;
    description: string;
    stats: Stat[];
    talents: Talent[];
    ctaText: string;
    ctaLink: string;
  };
  newsSection: {
    title: string;
    description: string;
    categories: Category[];
    featuredArticle: FeaturedArticle;
    articles: Article[];
  };
  contactSection: {
    badge: string;
    title: string;
    description: string;
    formFields: {
      name: FormField;
      email: FormField;
      phone: FormField;
      message: FormField;
    };
    submitButton: {
      text: string;
      icon: string;
    };
    contactInfo: ContactInfo[];
  };
  footer: {
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
    bottomLinks: QuickLink[];
  };
}

export const HomePage = () => {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [pageData, setPageData] = useState<HomePageData>({
    header: {
      logo: { icon: "groups", text: "佑羲人力" },
      navigation: [],
      contactButton: { text: "聯絡我們", link: "#" },
    },
    hero: {
      badge: "",
      title: "",
      description: "",
      primaryCTA: { text: "", link: "" },
      secondaryCTA: { text: "", link: "" },
      image: "",
    },
    featuredTalents: {
      badge: "",
      title: "",
      description: "",
      stats: [],
      talents: [],
      ctaText: "",
      ctaLink: "",
    },
    newsSection: {
      title: "",
      description: "",
      categories: [],
      featuredArticle: { badge: "", title: "", description: "", image: "", link: "#" },
      articles: [],
    },
    contactSection: {
      badge: "",
      title: "",
      description: "",
      formFields: {
        name: { label: "", placeholder: "", icon: "person", required: true },
        email: { label: "", placeholder: "", icon: "mail", required: true },
        phone: { label: "", placeholder: "", icon: "phone", required: true },
        message: { label: "", placeholder: "", icon: "chat_bubble", required: true, rows: 5 },
      },
      submitButton: { text: "", icon: "send" },
      contactInfo: [],
    },
    footer: {
      logo: { icon: "groups", text: "佑羲人力" },
      contact: { phone: "", address: "" },
      socialMedia: [],
      quickLinks: { title: "快速連結", links: [] },
      map: { embedUrl: "" },
      copyright: "",
      bottomLinks: [],
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const { data } = await res.json();

      if (data?.homePage[0]) {
        setPageData((prev) => ({
          header: data.homePage[0].header || prev.header,
          hero: data.homePage[0].hero || prev.hero,
          featuredTalents: data.homePage[0].featuredTalents || prev.featuredTalents,
          newsSection: data.homePage[0].newsSection || prev.newsSection,
          contactSection: data.homePage[0].contactSection || prev.contactSection,
          footer: data.homePage[0].footer || prev.footer,
        }));
      }
    };

    fetchData();
  }, []);

  const handleUpdate = async () => {
    setIsLoading(true);
    const input = {
      header: pageData.header,
      hero: pageData.hero,
      featuredTalents: pageData.featuredTalents,
      newsSection: pageData.newsSection,
      contactSection: pageData.contactSection,
      footer: pageData.footer,
    };

    try {
      const response = await graphqlRequest(
        UPDATE_PAGE.loc?.source.body || "",
        { input },
        session
      );
      if (response.errors) {
        console.error("更新失敗:", JSON.stringify(response.errors, null, 2));
        alert("更新失敗：" + JSON.stringify(response.errors));
      } else {
        alert("更新成功");
      }
    } catch (err) {
      console.error("更新失敗:", err);
      alert("更新失敗：" + err);
    } finally {
      setIsLoading(false);
    }
  };

  // Header handlers
  const updateHeaderLogo = (field: "icon" | "text", value: string) => {
    setPageData((prev) => ({
      ...prev,
      header: {
        ...prev.header,
        logo: { ...prev.header.logo, [field]: value },
      },
    }));
  };

  const updateContactButton = (field: "text" | "link", value: string) => {
    setPageData((prev) => ({
      ...prev,
      header: {
        ...prev.header,
        contactButton: { ...prev.header.contactButton, [field]: value },
      },
    }));
  };

  // Hero handlers
  const updateHero = (field: string, value: string) => {
    setPageData((prev) => ({
      ...prev,
      hero: { ...prev.hero, [field]: value },
    }));
  };

  const updateHeroCTA = (
    type: "primaryCTA" | "secondaryCTA",
    field: "text" | "link",
    value: string
  ) => {
    setPageData((prev) => ({
      ...prev,
      hero: {
        ...prev.hero,
        [type]: { ...prev.hero[type], [field]: value },
      },
    }));
  };

  const handleHeroImageUpload = (data: UploadResponse) => {
    setPageData((prev) => ({
      ...prev,
      hero: { ...prev.hero, image: data.imageUrl },
    }));
  };

  // FeaturedTalents handlers
  const updateFeaturedTalents = (field: string, value: string) => {
    setPageData((prev) => ({
      ...prev,
      featuredTalents: { ...prev.featuredTalents, [field]: value },
    }));
  };

  const updateStat = (index: number, field: "number" | "label", value: string) => {
    setPageData((prev) => {
      const newStats = [...prev.featuredTalents.stats];
      newStats[index] = { ...newStats[index], [field]: value };
      return {
        ...prev,
        featuredTalents: { ...prev.featuredTalents, stats: newStats },
      };
    });
  };

  const addStat = () => {
    setPageData((prev) => ({
      ...prev,
      featuredTalents: {
        ...prev.featuredTalents,
        stats: [...prev.featuredTalents.stats, { number: "", label: "" }],
      },
    }));
  };

  const deleteStat = (index: number) => {
    setPageData((prev) => ({
      ...prev,
      featuredTalents: {
        ...prev.featuredTalents,
        stats: prev.featuredTalents.stats.filter((_, i) => i !== index),
      },
    }));
  };

  const updateTalent = (index: number, field: keyof Talent, value: string | string[]) => {
    setPageData((prev) => {
      const newTalents = [...prev.featuredTalents.talents];
      newTalents[index] = { ...newTalents[index], [field]: value };
      return {
        ...prev,
        featuredTalents: { ...prev.featuredTalents, talents: newTalents },
      };
    });
  };

  const updateTalentSkill = (talentIndex: number, skillIndex: number, value: string) => {
    setPageData((prev) => {
      const newTalents = [...prev.featuredTalents.talents];
      const newSkills = [...newTalents[talentIndex].skills];
      newSkills[skillIndex] = value;
      newTalents[talentIndex] = { ...newTalents[talentIndex], skills: newSkills };
      return {
        ...prev,
        featuredTalents: { ...prev.featuredTalents, talents: newTalents },
      };
    });
  };

  const addTalentSkill = (talentIndex: number) => {
    setPageData((prev) => {
      const newTalents = [...prev.featuredTalents.talents];
      newTalents[talentIndex] = {
        ...newTalents[talentIndex],
        skills: [...newTalents[talentIndex].skills, ""],
      };
      return {
        ...prev,
        featuredTalents: { ...prev.featuredTalents, talents: newTalents },
      };
    });
  };

  const deleteTalentSkill = (talentIndex: number, skillIndex: number) => {
    setPageData((prev) => {
      const newTalents = [...prev.featuredTalents.talents];
      newTalents[talentIndex] = {
        ...newTalents[talentIndex],
        skills: newTalents[talentIndex].skills.filter((_, i) => i !== skillIndex),
      };
      return {
        ...prev,
        featuredTalents: { ...prev.featuredTalents, talents: newTalents },
      };
    });
  };

  const addTalent = () => {
    setPageData((prev) => ({
      ...prev,
      featuredTalents: {
        ...prev.featuredTalents,
        talents: [
          ...prev.featuredTalents.talents,
          {
            name: "",
            position: "",
            image: "",
            experience: "",
            location: "",
            skills: [],
            detailUrl: "",
          },
        ],
      },
    }));
  };

  const deleteTalent = (index: number) => {
    setPageData((prev) => ({
      ...prev,
      featuredTalents: {
        ...prev.featuredTalents,
        talents: prev.featuredTalents.talents.filter((_, i) => i !== index),
      },
    }));
  };

  const handleTalentImageUpload = (index: number, data: UploadResponse) => {
    updateTalent(index, "image", data.imageUrl);
  };

  return (
    <div>
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-5 rounded-lg flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-t-4 border-t-blue-500 border-gray-200 rounded-full animate-spin mb-3"></div>
            <p className="text-gray-700">資料處理中，請稍候...</p>
          </div>
        </div>
      )}

      <div className="text-3xl font-bold mb-6">首頁編輯</div>

      {/* Header 設定 - 保持原樣 */}
      <div className="bg-gray-100 p-6 rounded-lg mb-6">
        <h2 className="text-2xl font-bold mb-4">Header 設定</h2>

        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-3">Logo</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">圖標名稱 (Material Icon)</label>
              <input
                type="text"
                value={pageData.header.logo.icon}
                onChange={(e) => updateHeaderLogo("icon", e.target.value)}
                className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
                placeholder="groups"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Logo 文字</label>
              <input
                type="text"
                value={pageData.header.logo.text}
                onChange={(e) => updateHeaderLogo("text", e.target.value)}
                className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
              />
            </div>
          </div>
        </div>

      </div>

      {/* Hero 設定 - 保持原樣但簡化 */}
      <div className="bg-gray-100 p-6 rounded-lg mb-6">
        <h2 className="text-2xl font-bold mb-4">主視覺 Hero 設定</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">徽章文字</label>
            <input
              type="text"
              value={pageData.hero.badge}
              onChange={(e) => updateHero("badge", e.target.value)}
              className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">主標題</label>
            <input
              type="text"
              value={pageData.hero.title}
              onChange={(e) => updateHero("title", e.target.value)}
              className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">描述</label>
            <textarea
              value={pageData.hero.description}
              onChange={(e) => updateHero("description", e.target.value)}
              rows={3}
              className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">主要 CTA</h4>
              <div className="space-y-2">
                <input
                  type="text"
                  value={pageData.hero.primaryCTA.text}
                  onChange={(e) => updateHeroCTA("primaryCTA", "text", e.target.value)}
                  placeholder="按鈕文字"
                  className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
                />
                <input
                  type="text"
                  value={pageData.hero.primaryCTA.link}
                  onChange={(e) => updateHeroCTA("primaryCTA", "link", e.target.value)}
                  placeholder="連結"
                  className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
                />
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">次要 CTA</h4>
              <div className="space-y-2">
                <input
                  type="text"
                  value={pageData.hero.secondaryCTA.text}
                  onChange={(e) => updateHeroCTA("secondaryCTA", "text", e.target.value)}
                  placeholder="按鈕文字"
                  className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
                />
                <input
                  type="text"
                  value={pageData.hero.secondaryCTA.link}
                  onChange={(e) => updateHeroCTA("secondaryCTA", "link", e.target.value)}
                  placeholder="連結"
                  className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Hero 圖片</label>
            {pageData.hero.image && (
              <div className="mb-3">
                <Image
                  src={pageData.hero.image}
                  alt="Hero"
                  width={400}
                  height={300}
                  className="rounded-lg"
                />
              </div>
            )}
            <ImageUploader onImageUpload={handleHeroImageUpload} />
          </div>
        </div>
      </div>

      {/* FeaturedTalents 設定 - 新增 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg mb-6 border-2 border-blue-200">
        <h2 className="text-2xl font-bold mb-4 text-blue-900">精選人才 Section 設定</h2>

        <div className="space-y-6">
          {/* 標題區塊 */}
          <div className="bg-white p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">標題區塊</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">徽章文字</label>
                <input
                  type="text"
                  value={pageData.featuredTalents.badge}
                  onChange={(e) => updateFeaturedTalents("badge", e.target.value)}
                  className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
                  placeholder="精選人才"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">主標題</label>
                <input
                  type="text"
                  value={pageData.featuredTalents.title}
                  onChange={(e) => updateFeaturedTalents("title", e.target.value)}
                  className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">描述文字</label>
                <textarea
                  value={pageData.featuredTalents.description}
                  onChange={(e) => updateFeaturedTalents("description", e.target.value)}
                  rows={2}
                  className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
                />
              </div>
            </div>
          </div>

          {/* 統計數字 */}
          <div className="bg-white p-4 rounded-lg">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-800">統計數字</h3>
              <button
                onClick={addStat}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                新增統計
              </button>
            </div>
            <div className="space-y-3">
              {pageData.featuredTalents.stats.map((stat, index) => (
                <div key={index} className="bg-gray-50 p-3 rounded border">
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <div>
                      <label className="block text-sm font-medium mb-1">數字</label>
                      <input
                        type="text"
                        value={stat.number}
                        onChange={(e) => updateStat(index, "number", e.target.value)}
                        placeholder="5000+"
                        className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">標籤</label>
                      <input
                        type="text"
                        value={stat.label}
                        onChange={(e) => updateStat(index, "label", e.target.value)}
                        placeholder="認證人才"
                        className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => deleteStat(index)}
                    className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                  >
                    刪除統計
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 人才卡片 */}
          <div className="bg-white p-4 rounded-lg">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-800">精選人才卡片</h3>
              <button
                onClick={addTalent}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                新增人才
              </button>
            </div>
            <div className="space-y-6">
              {pageData.featuredTalents.talents.map((talent, talentIndex) => (
                <div key={talentIndex} className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                  <h4 className="font-semibold mb-3 text-blue-900">人才 #{talentIndex + 1}</h4>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">姓名</label>
                        <input
                          type="text"
                          value={talent.name}
                          onChange={(e) => updateTalent(talentIndex, "name", e.target.value)}
                          className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">職位</label>
                        <input
                          type="text"
                          value={talent.position}
                          onChange={(e) => updateTalent(talentIndex, "position", e.target.value)}
                          className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">經驗</label>
                        <input
                          type="text"
                          value={talent.experience}
                          onChange={(e) => updateTalent(talentIndex, "experience", e.target.value)}
                          placeholder="5+ 年經驗"
                          className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">地點</label>
                        <input
                          type="text"
                          value={talent.location}
                          onChange={(e) => updateTalent(talentIndex, "location", e.target.value)}
                          placeholder="台灣 台北"
                          className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">圖片</label>
                      {talent.image && (
                        <div className="mb-2">
                          <Image
                            src={talent.image}
                            alt={talent.name}
                            width={120}
                            height={120}
                            className="rounded-full"
                          />
                        </div>
                      )}
                      <ImageUploader onImageUpload={(data) => handleTalentImageUpload(talentIndex, data)} />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium">技能標籤</label>
                        <button
                          onClick={() => addTalentSkill(talentIndex)}
                          className="bg-indigo-500 text-white px-3 py-1 rounded text-sm hover:bg-indigo-600"
                        >
                          新增技能
                        </button>
                      </div>
                      <div className="space-y-2">
                        {talent.skills.map((skill, skillIndex) => (
                          <div key={skillIndex} className="flex gap-2">
                            <input
                              type="text"
                              value={skill}
                              onChange={(e) => updateTalentSkill(talentIndex, skillIndex, e.target.value)}
                              placeholder="技能名稱"
                              className="flex-1 rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                            />
                            <button
                              onClick={() => deleteTalentSkill(talentIndex, skillIndex)}
                              className="bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600"
                            >
                              刪除
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">詳細資料網址 (QR Code)</label>
                      <input
                        type="text"
                        value={talent.detailUrl || ""}
                        onChange={(e) => updateTalent(talentIndex, "detailUrl", e.target.value)}
                        placeholder="https://example.com/talent-detail"
                        className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                      />
                      <p className="text-xs text-gray-500 mt-1">用戶點擊「查看詳細資料」時會顯示此網址的 QR Code</p>
                    </div>

                    <button
                      onClick={() => deleteTalent(talentIndex)}
                      className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 mt-3"
                    >
                      刪除此人才卡片
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA 按鈕設定 */}
          <div className="bg-white p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">CTA 按鈕</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">按鈕文字</label>
                <input
                  type="text"
                  value={pageData.featuredTalents.ctaText}
                  onChange={(e) => updateFeaturedTalents("ctaText", e.target.value)}
                  placeholder="查看更多人才"
                  className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">連結</label>
                <input
                  type="text"
                  value={pageData.featuredTalents.ctaLink}
                  onChange={(e) => updateFeaturedTalents("ctaLink", e.target.value)}
                  placeholder="/talents"
                  className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* NewsSection 設定 */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg mb-6 border-2 border-purple-200">
        <h2 className="text-2xl font-bold mb-4 text-purple-900">最新消息區塊設定</h2>

        <div className="space-y-6">
          {/* 標題區塊 */}
          <div className="bg-white p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">標題區塊</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">主標題</label>
                <input
                  type="text"
                  value={pageData.newsSection.title}
                  onChange={(e) =>
                    setPageData((prev) => ({
                      ...prev,
                      newsSection: { ...prev.newsSection, title: e.target.value },
                    }))
                  }
                  className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">描述文字</label>
                <textarea
                  value={pageData.newsSection.description}
                  onChange={(e) =>
                    setPageData((prev) => ({
                      ...prev,
                      newsSection: { ...prev.newsSection, description: e.target.value },
                    }))
                  }
                  rows={2}
                  className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
                />
              </div>
            </div>
          </div>

          {/* 精選文章 */}
          <div className="bg-white p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">精選文章</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">徽章文字</label>
                <input
                  type="text"
                  value={pageData.newsSection.featuredArticle.badge}
                  onChange={(e) =>
                    setPageData((prev) => ({
                      ...prev,
                      newsSection: {
                        ...prev.newsSection,
                        featuredArticle: { ...prev.newsSection.featuredArticle, badge: e.target.value },
                      },
                    }))
                  }
                  className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">標題</label>
                <input
                  type="text"
                  value={pageData.newsSection.featuredArticle.title}
                  onChange={(e) =>
                    setPageData((prev) => ({
                      ...prev,
                      newsSection: {
                        ...prev.newsSection,
                        featuredArticle: { ...prev.newsSection.featuredArticle, title: e.target.value },
                      },
                    }))
                  }
                  className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">描述</label>
                <textarea
                  value={pageData.newsSection.featuredArticle.description}
                  onChange={(e) =>
                    setPageData((prev) => ({
                      ...prev,
                      newsSection: {
                        ...prev.newsSection,
                        featuredArticle: { ...prev.newsSection.featuredArticle, description: e.target.value },
                      },
                    }))
                  }
                  rows={3}
                  className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">連結</label>
                <input
                  type="text"
                  value={pageData.newsSection.featuredArticle.link}
                  onChange={(e) =>
                    setPageData((prev) => ({
                      ...prev,
                      newsSection: {
                        ...prev.newsSection,
                        featuredArticle: { ...prev.newsSection.featuredArticle, link: e.target.value },
                      },
                    }))
                  }
                  className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">圖片</label>
                {pageData.newsSection.featuredArticle.image && (
                  <div className="mb-2">
                    <Image
                      src={pageData.newsSection.featuredArticle.image}
                      alt="Featured Article"
                      width={400}
                      height={250}
                      className="rounded-lg"
                    />
                  </div>
                )}
                <ImageUploader
                  onImageUpload={(data) =>
                    setPageData((prev) => ({
                      ...prev,
                      newsSection: {
                        ...prev.newsSection,
                        featuredArticle: { ...prev.newsSection.featuredArticle, image: data.imageUrl },
                      },
                    }))
                  }
                />
              </div>
            </div>
          </div>

          {/* 一般文章列表 */}
          <div className="bg-white p-4 rounded-lg">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">一般文章</h3>
              <button
                onClick={() =>
                  setPageData((prev) => ({
                    ...prev,
                    newsSection: {
                      ...prev.newsSection,
                      articles: [
                        ...prev.newsSection.articles,
                        { category: "", date: "", title: "", description: "", image: "", link: "#" },
                      ],
                    },
                  }))
                }
                className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
              >
                新增文章
              </button>
            </div>
            <div className="space-y-4">
              {pageData.newsSection.articles.map((article, index) => (
                <div key={index} className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <h4 className="font-semibold mb-3 text-purple-900">文章 #{index + 1}</h4>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">分類</label>
                      <input
                        type="text"
                        value={article.category}
                        onChange={(e) => {
                          const newArticles = [...pageData.newsSection.articles];
                          newArticles[index] = { ...newArticles[index], category: e.target.value };
                          setPageData((prev) => ({
                            ...prev,
                            newsSection: { ...prev.newsSection, articles: newArticles },
                          }));
                        }}
                        placeholder="移民"
                        className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">日期</label>
                      <input
                        type="text"
                        value={article.date}
                        onChange={(e) => {
                          const newArticles = [...pageData.newsSection.articles];
                          newArticles[index] = { ...newArticles[index], date: e.target.value };
                          setPageData((prev) => ({
                            ...prev,
                            newsSection: { ...prev.newsSection, articles: newArticles },
                          }));
                        }}
                        placeholder="2023年12月14日"
                        className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">標題</label>
                      <input
                        type="text"
                        value={article.title}
                        onChange={(e) => {
                          const newArticles = [...pageData.newsSection.articles];
                          newArticles[index] = { ...newArticles[index], title: e.target.value };
                          setPageData((prev) => ({
                            ...prev,
                            newsSection: { ...prev.newsSection, articles: newArticles },
                          }));
                        }}
                        className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">描述</label>
                      <textarea
                        value={article.description}
                        onChange={(e) => {
                          const newArticles = [...pageData.newsSection.articles];
                          newArticles[index] = { ...newArticles[index], description: e.target.value };
                          setPageData((prev) => ({
                            ...prev,
                            newsSection: { ...prev.newsSection, articles: newArticles },
                          }));
                        }}
                        rows={2}
                        className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">連結</label>
                      <input
                        type="text"
                        value={article.link}
                        onChange={(e) => {
                          const newArticles = [...pageData.newsSection.articles];
                          newArticles[index] = { ...newArticles[index], link: e.target.value };
                          setPageData((prev) => ({
                            ...prev,
                            newsSection: { ...prev.newsSection, articles: newArticles },
                          }));
                        }}
                        className="block w-full rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">圖片</label>
                      {article.image && (
                        <div className="mb-2">
                          <Image
                            src={article.image}
                            alt={article.title}
                            width={200}
                            height={125}
                            className="rounded-lg"
                          />
                        </div>
                      )}
                      <ImageUploader
                        onImageUpload={(data) => {
                          const newArticles = [...pageData.newsSection.articles];
                          newArticles[index] = { ...newArticles[index], image: data.imageUrl };
                          setPageData((prev) => ({
                            ...prev,
                            newsSection: { ...prev.newsSection, articles: newArticles },
                          }));
                        }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const newArticles = pageData.newsSection.articles.filter((_, i) => i !== index);
                      setPageData((prev) => ({
                        ...prev,
                        newsSection: { ...prev.newsSection, articles: newArticles },
                      }));
                    }}
                    className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 mt-3"
                  >
                    刪除此文章
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer 設定 */}
      <div className="bg-gray-100 p-6 rounded-lg mb-6">
        <h2 className="text-2xl font-bold mb-4">Footer 設定</h2>

        <div className="space-y-6">
          {/* Logo 設定 */}
          <div className="bg-white p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">Logo</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">圖標名稱</label>
                <input
                  type="text"
                  value={pageData.footer.logo.icon}
                  onChange={(e) =>
                    setPageData((prev) => ({
                      ...prev,
                      footer: {
                        ...prev.footer,
                        logo: { ...prev.footer.logo, icon: e.target.value },
                      },
                    }))
                  }
                  className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Logo 文字</label>
                <input
                  type="text"
                  value={pageData.footer.logo.text}
                  onChange={(e) =>
                    setPageData((prev) => ({
                      ...prev,
                      footer: {
                        ...prev.footer,
                        logo: { ...prev.footer.logo, text: e.target.value },
                      },
                    }))
                  }
                  className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
                />
              </div>
            </div>
          </div>

          {/* 聯絡資訊 */}
          <div className="bg-white p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">聯絡資訊</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">電話</label>
                <input
                  type="text"
                  value={pageData.footer.contact.phone}
                  onChange={(e) =>
                    setPageData((prev) => ({
                      ...prev,
                      footer: {
                        ...prev.footer,
                        contact: { ...prev.footer.contact, phone: e.target.value },
                      },
                    }))
                  }
                  className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">地址</label>
                <textarea
                  value={pageData.footer.contact.address}
                  onChange={(e) =>
                    setPageData((prev) => ({
                      ...prev,
                      footer: {
                        ...prev.footer,
                        contact: { ...prev.footer.contact, address: e.target.value },
                      },
                    }))
                  }
                  rows={2}
                  className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
                />
              </div>
            </div>
          </div>

          {/* 快速連結 */}
          <div className="bg-white p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">快速連結</h3>
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">標題</label>
              <input
                type="text"
                value={pageData.footer.quickLinks.title}
                onChange={(e) =>
                  setPageData((prev) => ({
                    ...prev,
                    footer: {
                      ...prev.footer,
                      quickLinks: { ...prev.footer.quickLinks, title: e.target.value },
                    },
                  }))
                }
                className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
              />
            </div>
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium">連結項目</h4>
              <button
                onClick={() =>
                  setPageData((prev) => ({
                    ...prev,
                    footer: {
                      ...prev.footer,
                      quickLinks: {
                        ...prev.footer.quickLinks,
                        links: [...prev.footer.quickLinks.links, { label: "", link: "#" }],
                      },
                    },
                  }))
                }
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                新增連結
              </button>
            </div>
            <div className="space-y-2">
              {pageData.footer.quickLinks.links.map((link, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={link.label}
                    onChange={(e) => {
                      const newLinks = [...pageData.footer.quickLinks.links];
                      newLinks[index] = { ...newLinks[index], label: e.target.value };
                      setPageData((prev) => ({
                        ...prev,
                        footer: {
                          ...prev.footer,
                          quickLinks: { ...prev.footer.quickLinks, links: newLinks },
                        },
                      }));
                    }}
                    placeholder="標籤"
                    className="flex-1 rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                  />
                  <input
                    type="text"
                    value={link.link}
                    onChange={(e) => {
                      const newLinks = [...pageData.footer.quickLinks.links];
                      newLinks[index] = { ...newLinks[index], link: e.target.value };
                      setPageData((prev) => ({
                        ...prev,
                        footer: {
                          ...prev.footer,
                          quickLinks: { ...prev.footer.quickLinks, links: newLinks },
                        },
                      }));
                    }}
                    placeholder="連結"
                    className="flex-1 rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                  />
                  <button
                    onClick={() => {
                      const newLinks = pageData.footer.quickLinks.links.filter((_, i) => i !== index);
                      setPageData((prev) => ({
                        ...prev,
                        footer: {
                          ...prev.footer,
                          quickLinks: { ...prev.footer.quickLinks, links: newLinks },
                        },
                      }));
                    }}
                    className="bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600"
                  >
                    刪除
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Google Maps */}
          <div className="bg-white p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">Google Maps</h3>
            <div>
              <label className="block text-sm font-medium mb-1">嵌入網址</label>
              <textarea
                value={pageData.footer.map.embedUrl}
                onChange={(e) =>
                  setPageData((prev) => ({
                    ...prev,
                    footer: {
                      ...prev.footer,
                      map: { embedUrl: e.target.value },
                    },
                  }))
                }
                rows={3}
                placeholder="https://www.google.com/maps/embed?pb=..."
                className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300 font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-2">
                可輸入純 URL（以 https:// 開頭）或 Google Maps 產生的完整 iframe HTML 代碼
              </p>
            </div>
            {/* 地圖預覽 */}
            {pageData.footer.map.embedUrl && (
              <div className="mt-4">
                <label className="block text-sm font-medium mb-2">地圖預覽</label>
                <div className="w-full h-48 rounded-lg overflow-hidden border border-gray-300">
                  <iframe
                    src={(() => {
                      const url = pageData.footer.map.embedUrl.trim();
                      if (url.startsWith('https://')) {
                        return url;
                      }
                      const match = url.match(/src="([^"]+)"/);
                      return match ? match[1] : '';
                    })()}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 版權與底部連結 */}
          <div className="bg-white p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">版權資訊</h3>
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">版權文字</label>
              <input
                type="text"
                value={pageData.footer.copyright}
                onChange={(e) =>
                  setPageData((prev) => ({
                    ...prev,
                    footer: { ...prev.footer, copyright: e.target.value },
                  }))
                }
                className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
              />
            </div>
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium">底部連結</h4>
              <button
                onClick={() =>
                  setPageData((prev) => ({
                    ...prev,
                    footer: {
                      ...prev.footer,
                      bottomLinks: [...prev.footer.bottomLinks, { label: "", link: "#" }],
                    },
                  }))
                }
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                新增連結
              </button>
            </div>
            <div className="space-y-2">
              {pageData.footer.bottomLinks.map((link, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={link.label}
                    onChange={(e) => {
                      const newLinks = [...pageData.footer.bottomLinks];
                      newLinks[index] = { ...newLinks[index], label: e.target.value };
                      setPageData((prev) => ({
                        ...prev,
                        footer: { ...prev.footer, bottomLinks: newLinks },
                      }));
                    }}
                    placeholder="標籤"
                    className="flex-1 rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                  />
                  <input
                    type="text"
                    value={link.link}
                    onChange={(e) => {
                      const newLinks = [...pageData.footer.bottomLinks];
                      newLinks[index] = { ...newLinks[index], link: e.target.value };
                      setPageData((prev) => ({
                        ...prev,
                        footer: { ...prev.footer, bottomLinks: newLinks },
                      }));
                    }}
                    placeholder="連結"
                    className="flex-1 rounded-md bg-white px-3 py-2 text-base text-gray-900 border border-gray-300"
                  />
                  <button
                    onClick={() => {
                      const newLinks = pageData.footer.bottomLinks.filter((_, i) => i !== index);
                      setPageData((prev) => ({
                        ...prev,
                        footer: { ...prev.footer, bottomLinks: newLinks },
                      }));
                    }}
                    className="bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600"
                  >
                    刪除
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 更新按鈕 */}
      <div className="mt-6 sticky bottom-4">
        <button
          onClick={handleUpdate}
          className="w-full bg-green-500 text-white px-6 py-4 rounded-lg text-lg font-semibold hover:bg-green-600 shadow-xl"
        >
          💾 儲存所有更新
        </button>
      </div>
    </div>
  );
};
