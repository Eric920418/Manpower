"use client";
import { gql } from "graphql-tag";
import { useState, useEffect } from "react";
import Image from "next/image";
import { ImageUploader } from "@/components/Admin/ImageUploader";
import { useSession } from "next-auth/react";
import { graphqlRequest } from "@/utils/graphqlClient";
import CustomEditor from "@/components/CustomEditor";

const UPDATE_PAGE = gql`
  mutation UpdateFranchisePage($input: UpdateFranchisePageInput!) {
    updateFranchisePage(input: $input) {
      hero
      marketOpportunity
      partnershipAdvantages
      franchiseProcess
      cta
      franchiseeSharing
    }
  }
`;

const query = `
  query franchisePage {
    franchisePage {
      hero
      marketOpportunity
      partnershipAdvantages
      franchiseProcess
      cta
      franchiseeSharing
    }
  }
`;

interface Feature {
  icon: string;
  label: string;
}

interface Opportunity {
  title: string;
  subtitle: string;
  features: Feature[];
  gradient: string;
}

interface Advantage {
  number: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  imagePosition: string;
}

interface ProcessStep {
  number: number;
  title: string;
  image: string;
}

interface CTAButton {
  text: string;
  link: string;
  icon: string;
  variant: string;
}

interface ContactInfo {
  icon: string;
  label: string;
  value: string;
}

interface SharingStory {
  id: string;
  image: string;
  title: string;
  subtitle: string;
  date: string;
  category: string;
  description: string;
  content: string;
  youtubeUrl: string;
}

interface PageData {
  hero: {
    title: string;
    backgroundImage: string;
  };
  marketOpportunity: {
    title: string;
    backgroundImage: string;
    opportunities: Opportunity[];
  };
  partnershipAdvantages: {
    title: string;
    subtitle: string;
    advantages: Advantage[];
    ctaButton: {
      text: string;
      link: string;
    };
  };
  franchiseProcess: {
    title: string;
    subtitle: string;
    steps: ProcessStep[];
  };
  cta: {
    title: string;
    subtitle: string;
    backgroundImage: string;
    buttons: CTAButton[];
    contactInfo: ContactInfo[];
  };
  franchiseeSharing: {
    title: string;
    subtitle: string;
    stories: SharingStory[];
  };
}

const defaultPageData: PageData = {
  hero: { title: "", backgroundImage: "" },
  marketOpportunity: { title: "", backgroundImage: "", opportunities: [] },
  partnershipAdvantages: { title: "", subtitle: "", advantages: [], ctaButton: { text: "", link: "" } },
  franchiseProcess: { title: "", subtitle: "", steps: [] },
  cta: { title: "", subtitle: "", backgroundImage: "", buttons: [], contactInfo: [] },
  franchiseeSharing: { title: "", subtitle: "", stories: [] },
};

export const FranchisePage = () => {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");
  const [pageData, setPageData] = useState<PageData>(defaultPageData);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const { data } = await res.json();

      if (data?.franchisePage[0]) {
        setPageData(data.franchisePage[0]);
      }
    };

    fetchData();
  }, []);

  const handleUpdate = async () => {
    setIsLoading(true);
    try {
      const response = await graphqlRequest(
        UPDATE_PAGE.loc?.source.body || "",
        { input: pageData },
        session
      );
      if (response.errors) {
        alert("更新失敗：" + JSON.stringify(response.errors));
      } else {
        // 清除前台快取
        await Promise.all([
          fetch("/api/revalidate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: "/franchise" }),
          }),
          fetch("/api/revalidate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: "/franchise/stories" }),
          }),
        ]);
        alert("更新成功");
      }
    } catch (err) {
      alert("更新失敗：" + err);
    } finally {
      setIsLoading(false);
    }
  };

  const sections = [
    { id: "hero", label: "Hero 區塊" },
    { id: "marketOpportunity", label: "市場機會" },
    { id: "partnershipAdvantages", label: "合作優勢" },
    { id: "franchiseProcess", label: "加盟流程" },
    { id: "franchiseeSharing", label: "加盟主分享" },
    { id: "cta", label: "CTA 區塊" },
  ];

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

      <div className="text-3xl font-bold mb-6">創業加盟頁面編輯</div>

      {/* 區塊切換 */}
      <div className="flex flex-wrap gap-2 mb-6 bg-gray-100 p-4 rounded-lg">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              activeSection === section.id
                ? "bg-blue-500 text-white"
                : "bg-white text-gray-700 hover:bg-gray-200"
            }`}
          >
            {section.label}
          </button>
        ))}
      </div>

      {/* Hero 區塊 */}
      {activeSection === "hero" && (
        <div className="bg-gray-100 p-6 rounded-lg mb-6">
          <h2 className="text-2xl font-bold mb-4">Hero 區塊設定</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">標題</label>
              <input
                type="text"
                value={pageData.hero.title}
                onChange={(e) =>
                  setPageData((prev) => ({
                    ...prev,
                    hero: { ...prev.hero, title: e.target.value },
                  }))
                }
                className="block w-full rounded-md bg-white px-3.5 py-2 text-base text-gray-900 border border-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">背景圖片</label>
              {pageData.hero.backgroundImage && (
                <div className="mb-3">
                  <Image
                    src={pageData.hero.backgroundImage}
                    alt="Hero"
                    width={400}
                    height={200}
                    className="rounded-lg object-cover"
                  />
                </div>
              )}
              <ImageUploader
                onImageUpload={(data) =>
                  setPageData((prev) => ({
                    ...prev,
                    hero: { ...prev.hero, backgroundImage: data.imageUrl },
                  }))
                }
              />
            </div>
          </div>
        </div>
      )}

      {/* 市場機會 */}
      {activeSection === "marketOpportunity" && (
        <div className="bg-gray-100 p-6 rounded-lg mb-6">
          <h2 className="text-2xl font-bold mb-4">市場機會設定</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">標題</label>
              <input
                type="text"
                value={pageData.marketOpportunity.title}
                onChange={(e) =>
                  setPageData((prev) => ({
                    ...prev,
                    marketOpportunity: { ...prev.marketOpportunity, title: e.target.value },
                  }))
                }
                className="block w-full rounded-md bg-white px-3.5 py-2 border border-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">背景圖片</label>
              {pageData.marketOpportunity.backgroundImage && (
                <div className="mb-3">
                  <Image
                    src={pageData.marketOpportunity.backgroundImage}
                    alt="Market Opportunity"
                    width={400}
                    height={200}
                    className="rounded-lg object-cover"
                  />
                </div>
              )}
              <ImageUploader
                onImageUpload={(data) =>
                  setPageData((prev) => ({
                    ...prev,
                    marketOpportunity: { ...prev.marketOpportunity, backgroundImage: data.imageUrl },
                  }))
                }
              />
            </div>

            <div className="mt-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold">機會項目</h3>
                <button
                  onClick={() =>
                    setPageData((prev) => ({
                      ...prev,
                      marketOpportunity: {
                        ...prev.marketOpportunity,
                        opportunities: [
                          ...prev.marketOpportunity.opportunities,
                          { title: "", subtitle: "", features: [], gradient: "from-blue-600 to-cyan-500" },
                        ],
                      },
                    }))
                  }
                  className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
                >
                  新增機會
                </button>
              </div>
              {pageData.marketOpportunity.opportunities.map((opp, oppIndex) => (
                <div key={oppIndex} className="bg-white p-4 rounded-lg border mb-4">
                  <h4 className="font-medium mb-3">機會 #{oppIndex + 1}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">標題</label>
                      <input
                        type="text"
                        value={opp.title}
                        onChange={(e) => {
                          const newOpps = [...pageData.marketOpportunity.opportunities];
                          newOpps[oppIndex] = { ...newOpps[oppIndex], title: e.target.value };
                          setPageData((prev) => ({
                            ...prev,
                            marketOpportunity: { ...prev.marketOpportunity, opportunities: newOpps },
                          }));
                        }}
                        className="block w-full rounded-md bg-white px-3 py-2 border border-gray-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">副標題</label>
                      <input
                        type="text"
                        value={opp.subtitle}
                        onChange={(e) => {
                          const newOpps = [...pageData.marketOpportunity.opportunities];
                          newOpps[oppIndex] = { ...newOpps[oppIndex], subtitle: e.target.value };
                          setPageData((prev) => ({
                            ...prev,
                            marketOpportunity: { ...prev.marketOpportunity, opportunities: newOpps },
                          }));
                        }}
                        className="block w-full rounded-md bg-white px-3 py-2 border border-gray-300"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-1">漸層顏色</label>
                      <input
                        type="text"
                        value={opp.gradient}
                        onChange={(e) => {
                          const newOpps = [...pageData.marketOpportunity.opportunities];
                          newOpps[oppIndex] = { ...newOpps[oppIndex], gradient: e.target.value };
                          setPageData((prev) => ({
                            ...prev,
                            marketOpportunity: { ...prev.marketOpportunity, opportunities: newOpps },
                          }));
                        }}
                        className="block w-full rounded-md bg-white px-3 py-2 border border-gray-300"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium">特點</label>
                      <button
                        onClick={() => {
                          const newOpps = [...pageData.marketOpportunity.opportunities];
                          newOpps[oppIndex] = {
                            ...newOpps[oppIndex],
                            features: [...newOpps[oppIndex].features, { icon: "", label: "" }],
                          };
                          setPageData((prev) => ({
                            ...prev,
                            marketOpportunity: { ...prev.marketOpportunity, opportunities: newOpps },
                          }));
                        }}
                        className="bg-green-500 text-white px-2 py-1 rounded text-xs"
                      >
                        新增特點
                      </button>
                    </div>
                    {opp.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={feature.icon}
                          onChange={(e) => {
                            const newOpps = [...pageData.marketOpportunity.opportunities];
                            const newFeatures = [...newOpps[oppIndex].features];
                            newFeatures[featureIndex] = { ...newFeatures[featureIndex], icon: e.target.value };
                            newOpps[oppIndex] = { ...newOpps[oppIndex], features: newFeatures };
                            setPageData((prev) => ({
                              ...prev,
                              marketOpportunity: { ...prev.marketOpportunity, opportunities: newOpps },
                            }));
                          }}
                          className="flex-1 rounded-md bg-white px-3 py-2 border border-gray-300"
                          placeholder="圖標"
                        />
                        <input
                          type="text"
                          value={feature.label}
                          onChange={(e) => {
                            const newOpps = [...pageData.marketOpportunity.opportunities];
                            const newFeatures = [...newOpps[oppIndex].features];
                            newFeatures[featureIndex] = { ...newFeatures[featureIndex], label: e.target.value };
                            newOpps[oppIndex] = { ...newOpps[oppIndex], features: newFeatures };
                            setPageData((prev) => ({
                              ...prev,
                              marketOpportunity: { ...prev.marketOpportunity, opportunities: newOpps },
                            }));
                          }}
                          className="flex-1 rounded-md bg-white px-3 py-2 border border-gray-300"
                          placeholder="標籤"
                        />
                        <button
                          onClick={() => {
                            const newOpps = [...pageData.marketOpportunity.opportunities];
                            newOpps[oppIndex] = {
                              ...newOpps[oppIndex],
                              features: newOpps[oppIndex].features.filter((_, i) => i !== featureIndex),
                            };
                            setPageData((prev) => ({
                              ...prev,
                              marketOpportunity: { ...prev.marketOpportunity, opportunities: newOpps },
                            }));
                          }}
                          className="bg-red-500 text-white px-2 py-1 rounded text-xs"
                        >
                          刪除
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      const newOpps = pageData.marketOpportunity.opportunities.filter((_, i) => i !== oppIndex);
                      setPageData((prev) => ({
                        ...prev,
                        marketOpportunity: { ...prev.marketOpportunity, opportunities: newOpps },
                      }));
                    }}
                    className="mt-3 bg-red-500 text-white px-3 py-1 rounded text-sm"
                  >
                    刪除機會
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 合作優勢 */}
      {activeSection === "partnershipAdvantages" && (
        <div className="bg-gray-100 p-6 rounded-lg mb-6">
          <h2 className="text-2xl font-bold mb-4">合作優勢設定</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">標題</label>
              <input
                type="text"
                value={pageData.partnershipAdvantages.title}
                onChange={(e) =>
                  setPageData((prev) => ({
                    ...prev,
                    partnershipAdvantages: { ...prev.partnershipAdvantages, title: e.target.value },
                  }))
                }
                className="block w-full rounded-md bg-white px-3.5 py-2 border border-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">副標題</label>
              <input
                type="text"
                value={pageData.partnershipAdvantages.subtitle}
                onChange={(e) =>
                  setPageData((prev) => ({
                    ...prev,
                    partnershipAdvantages: { ...prev.partnershipAdvantages, subtitle: e.target.value },
                  }))
                }
                className="block w-full rounded-md bg-white px-3.5 py-2 border border-gray-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">CTA 按鈕文字</label>
                <input
                  type="text"
                  value={pageData.partnershipAdvantages.ctaButton?.text || ""}
                  onChange={(e) =>
                    setPageData((prev) => ({
                      ...prev,
                      partnershipAdvantages: {
                        ...prev.partnershipAdvantages,
                        ctaButton: { ...prev.partnershipAdvantages.ctaButton, text: e.target.value },
                      },
                    }))
                  }
                  className="block w-full rounded-md bg-white px-3.5 py-2 border border-gray-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">CTA 按鈕連結</label>
                <input
                  type="text"
                  value={pageData.partnershipAdvantages.ctaButton?.link || ""}
                  onChange={(e) =>
                    setPageData((prev) => ({
                      ...prev,
                      partnershipAdvantages: {
                        ...prev.partnershipAdvantages,
                        ctaButton: { ...prev.partnershipAdvantages.ctaButton, link: e.target.value },
                      },
                    }))
                  }
                  className="block w-full rounded-md bg-white px-3.5 py-2 border border-gray-300"
                />
              </div>
            </div>

            <div className="mt-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold">優勢項目</h3>
                <button
                  onClick={() =>
                    setPageData((prev) => ({
                      ...prev,
                      partnershipAdvantages: {
                        ...prev.partnershipAdvantages,
                        advantages: [
                          ...prev.partnershipAdvantages.advantages,
                          { number: "", title: "", subtitle: "", description: "", image: "", imagePosition: "right" },
                        ],
                      },
                    }))
                  }
                  className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
                >
                  新增優勢
                </button>
              </div>
              {pageData.partnershipAdvantages.advantages.map((adv, index) => (
                <div key={index} className="bg-white p-4 rounded-lg border mb-4">
                  <h4 className="font-medium mb-3">優勢 #{index + 1}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">編號</label>
                      <input
                        type="text"
                        value={adv.number}
                        onChange={(e) => {
                          const newAdvs = [...pageData.partnershipAdvantages.advantages];
                          newAdvs[index] = { ...newAdvs[index], number: e.target.value };
                          setPageData((prev) => ({
                            ...prev,
                            partnershipAdvantages: { ...prev.partnershipAdvantages, advantages: newAdvs },
                          }));
                        }}
                        className="block w-full rounded-md bg-white px-3 py-2 border border-gray-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">標題</label>
                      <input
                        type="text"
                        value={adv.title}
                        onChange={(e) => {
                          const newAdvs = [...pageData.partnershipAdvantages.advantages];
                          newAdvs[index] = { ...newAdvs[index], title: e.target.value };
                          setPageData((prev) => ({
                            ...prev,
                            partnershipAdvantages: { ...prev.partnershipAdvantages, advantages: newAdvs },
                          }));
                        }}
                        className="block w-full rounded-md bg-white px-3 py-2 border border-gray-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">圖片位置</label>
                      <select
                        value={adv.imagePosition}
                        onChange={(e) => {
                          const newAdvs = [...pageData.partnershipAdvantages.advantages];
                          newAdvs[index] = { ...newAdvs[index], imagePosition: e.target.value };
                          setPageData((prev) => ({
                            ...prev,
                            partnershipAdvantages: { ...prev.partnershipAdvantages, advantages: newAdvs },
                          }));
                        }}
                        className="block w-full rounded-md bg-white px-3 py-2 border border-gray-300"
                      >
                        <option value="left">左側</option>
                        <option value="right">右側</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">副標題</label>
                      <input
                        type="text"
                        value={adv.subtitle}
                        onChange={(e) => {
                          const newAdvs = [...pageData.partnershipAdvantages.advantages];
                          newAdvs[index] = { ...newAdvs[index], subtitle: e.target.value };
                          setPageData((prev) => ({
                            ...prev,
                            partnershipAdvantages: { ...prev.partnershipAdvantages, advantages: newAdvs },
                          }));
                        }}
                        className="block w-full rounded-md bg-white px-3 py-2 border border-gray-300"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-1">描述</label>
                      <textarea
                        value={adv.description}
                        onChange={(e) => {
                          const newAdvs = [...pageData.partnershipAdvantages.advantages];
                          newAdvs[index] = { ...newAdvs[index], description: e.target.value };
                          setPageData((prev) => ({
                            ...prev,
                            partnershipAdvantages: { ...prev.partnershipAdvantages, advantages: newAdvs },
                          }));
                        }}
                        rows={3}
                        className="block w-full rounded-md bg-white px-3 py-2 border border-gray-300"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-1">優勢圖片</label>
                      {adv.image && (
                        <div className="mb-3">
                          <Image
                            src={adv.image}
                            alt={`優勢 ${index + 1}`}
                            width={300}
                            height={200}
                            className="rounded-lg object-cover"
                          />
                        </div>
                      )}
                      <ImageUploader
                        onImageUpload={(data) => {
                          const newAdvs = [...pageData.partnershipAdvantages.advantages];
                          newAdvs[index] = { ...newAdvs[index], image: data.imageUrl };
                          setPageData((prev) => ({
                            ...prev,
                            partnershipAdvantages: { ...prev.partnershipAdvantages, advantages: newAdvs },
                          }));
                        }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const newAdvs = pageData.partnershipAdvantages.advantages.filter((_, i) => i !== index);
                      setPageData((prev) => ({
                        ...prev,
                        partnershipAdvantages: { ...prev.partnershipAdvantages, advantages: newAdvs },
                      }));
                    }}
                    className="mt-3 bg-red-500 text-white px-3 py-1 rounded text-sm"
                  >
                    刪除優勢
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 加盟流程 */}
      {activeSection === "franchiseProcess" && (
        <div className="bg-gray-100 p-6 rounded-lg mb-6">
          <h2 className="text-2xl font-bold mb-4">加盟流程設定</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">標題</label>
              <input
                type="text"
                value={pageData.franchiseProcess.title}
                onChange={(e) =>
                  setPageData((prev) => ({
                    ...prev,
                    franchiseProcess: { ...prev.franchiseProcess, title: e.target.value },
                  }))
                }
                className="block w-full rounded-md bg-white px-3.5 py-2 border border-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">副標題</label>
              <input
                type="text"
                value={pageData.franchiseProcess.subtitle}
                onChange={(e) =>
                  setPageData((prev) => ({
                    ...prev,
                    franchiseProcess: { ...prev.franchiseProcess, subtitle: e.target.value },
                  }))
                }
                className="block w-full rounded-md bg-white px-3.5 py-2 border border-gray-300"
              />
            </div>

            <div className="mt-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold">流程步驟</h3>
                <button
                  onClick={() =>
                    setPageData((prev) => ({
                      ...prev,
                      franchiseProcess: {
                        ...prev.franchiseProcess,
                        steps: [
                          ...prev.franchiseProcess.steps,
                          { number: prev.franchiseProcess.steps.length + 1, title: "", image: "" },
                        ],
                      },
                    }))
                  }
                  className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
                >
                  新增步驟
                </button>
              </div>
              {pageData.franchiseProcess.steps.map((step, index) => (
                <div key={index} className="bg-white p-4 rounded-lg border mb-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">步驟編號</label>
                      <input
                        type="number"
                        value={step.number}
                        onChange={(e) => {
                          const newSteps = [...pageData.franchiseProcess.steps];
                          newSteps[index] = { ...newSteps[index], number: parseInt(e.target.value) || 0 };
                          setPageData((prev) => ({
                            ...prev,
                            franchiseProcess: { ...prev.franchiseProcess, steps: newSteps },
                          }));
                        }}
                        className="block w-full rounded-md bg-white px-3 py-2 border border-gray-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">標題</label>
                      <input
                        type="text"
                        value={step.title}
                        onChange={(e) => {
                          const newSteps = [...pageData.franchiseProcess.steps];
                          newSteps[index] = { ...newSteps[index], title: e.target.value };
                          setPageData((prev) => ({
                            ...prev,
                            franchiseProcess: { ...prev.franchiseProcess, steps: newSteps },
                          }));
                        }}
                        className="block w-full rounded-md bg-white px-3 py-2 border border-gray-300"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-1">步驟圖片</label>
                      {step.image && (
                        <div className="mb-3">
                          <Image
                            src={step.image}
                            alt={`步驟 ${step.number}`}
                            width={200}
                            height={200}
                            className="rounded-lg object-cover"
                          />
                        </div>
                      )}
                      <ImageUploader
                        onImageUpload={(data) => {
                          const newSteps = [...pageData.franchiseProcess.steps];
                          newSteps[index] = { ...newSteps[index], image: data.imageUrl };
                          setPageData((prev) => ({
                            ...prev,
                            franchiseProcess: { ...prev.franchiseProcess, steps: newSteps },
                          }));
                        }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const newSteps = pageData.franchiseProcess.steps.filter((_, i) => i !== index);
                      setPageData((prev) => ({
                        ...prev,
                        franchiseProcess: { ...prev.franchiseProcess, steps: newSteps },
                      }));
                    }}
                    className="mt-3 bg-red-500 text-white px-3 py-1 rounded text-sm"
                  >
                    刪除步驟
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 加盟主分享區塊 */}
      {activeSection === "franchiseeSharing" && (
        <div className="bg-gray-100 p-6 rounded-lg mb-6">
          <h2 className="text-2xl font-bold mb-4">加盟主分享設定</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">標題</label>
              <input
                type="text"
                value={pageData.franchiseeSharing?.title || ""}
                onChange={(e) =>
                  setPageData((prev) => ({
                    ...prev,
                    franchiseeSharing: { ...prev.franchiseeSharing, title: e.target.value },
                  }))
                }
                className="block w-full rounded-md bg-white px-3.5 py-2 border border-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">副標題</label>
              <input
                type="text"
                value={pageData.franchiseeSharing?.subtitle || ""}
                onChange={(e) =>
                  setPageData((prev) => ({
                    ...prev,
                    franchiseeSharing: { ...prev.franchiseeSharing, subtitle: e.target.value },
                  }))
                }
                className="block w-full rounded-md bg-white px-3.5 py-2 border border-gray-300"
              />
            </div>

            {/* 故事列表 */}
            <div className="mt-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-lg">加盟主分享文章</h3>
                <button
                  onClick={() =>
                    setPageData((prev) => ({
                      ...prev,
                      franchiseeSharing: {
                        ...prev.franchiseeSharing,
                        stories: [
                          ...(prev.franchiseeSharing?.stories || []),
                          {
                            id: Date.now().toString(),
                            image: "",
                            title: "",
                            subtitle: "加盟主分享｜萬達人力行銷課",
                            date: new Date().toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "2-digit",
                            }),
                            category: "萬達人力 行銷課",
                            description: "",
                            content: "",
                            youtubeUrl: "",
                          },
                        ],
                      },
                    }))
                  }
                  className="bg-green-500 text-white px-3 py-1 rounded text-sm"
                >
                  新增文章
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                這些文章會顯示在「加盟主分享」分頁中，點擊卡片可進入文章詳情頁
              </p>
              {(pageData.franchiseeSharing?.stories || []).map((story, index) => (
                <div key={story.id || index} className="bg-white p-4 rounded-lg border mb-4">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-medium">文章 #{index + 1}</h4>
                    <button
                      onClick={() => {
                        const newStories = (pageData.franchiseeSharing?.stories || []).filter((_, i) => i !== index);
                        setPageData((prev) => ({
                          ...prev,
                          franchiseeSharing: { ...prev.franchiseeSharing, stories: newStories },
                        }));
                      }}
                      className="bg-red-500 text-white px-2 py-1 rounded text-xs"
                    >
                      刪除
                    </button>
                  </div>

                  {/* 封面圖片 */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">封面圖片</label>
                    {story.image && (
                      <div className="mb-3">
                        <Image
                          src={story.image}
                          alt={story.title || "封面圖片"}
                          width={300}
                          height={200}
                          className="rounded-lg object-cover"
                        />
                      </div>
                    )}
                    <ImageUploader
                      onImageUpload={(data) => {
                        const newStories = [...(pageData.franchiseeSharing?.stories || [])];
                        newStories[index] = { ...newStories[index], image: data.imageUrl };
                        setPageData((prev) => ({
                          ...prev,
                          franchiseeSharing: { ...prev.franchiseeSharing, stories: newStories },
                        }));
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">標題</label>
                      <input
                        type="text"
                        value={story.title}
                        onChange={(e) => {
                          const newStories = [...(pageData.franchiseeSharing?.stories || [])];
                          newStories[index] = { ...newStories[index], title: e.target.value };
                          setPageData((prev) => ({
                            ...prev,
                            franchiseeSharing: { ...prev.franchiseeSharing, stories: newStories },
                          }));
                        }}
                        placeholder="例如：保險員轉職"
                        className="block w-full rounded-md bg-white px-3 py-2 border border-gray-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">副標題</label>
                      <input
                        type="text"
                        value={story.subtitle}
                        onChange={(e) => {
                          const newStories = [...(pageData.franchiseeSharing?.stories || [])];
                          newStories[index] = { ...newStories[index], subtitle: e.target.value };
                          setPageData((prev) => ({
                            ...prev,
                            franchiseeSharing: { ...prev.franchiseeSharing, stories: newStories },
                          }));
                        }}
                        className="block w-full rounded-md bg-white px-3 py-2 border border-gray-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">日期</label>
                      <input
                        type="text"
                        value={story.date}
                        onChange={(e) => {
                          const newStories = [...(pageData.franchiseeSharing?.stories || [])];
                          newStories[index] = { ...newStories[index], date: e.target.value };
                          setPageData((prev) => ({
                            ...prev,
                            franchiseeSharing: { ...prev.franchiseeSharing, stories: newStories },
                          }));
                        }}
                        placeholder="例如：December 24, 2025"
                        className="block w-full rounded-md bg-white px-3 py-2 border border-gray-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">分類</label>
                      <input
                        type="text"
                        value={story.category}
                        onChange={(e) => {
                          const newStories = [...(pageData.franchiseeSharing?.stories || [])];
                          newStories[index] = { ...newStories[index], category: e.target.value };
                          setPageData((prev) => ({
                            ...prev,
                            franchiseeSharing: { ...prev.franchiseeSharing, stories: newStories },
                          }));
                        }}
                        className="block w-full rounded-md bg-white px-3 py-2 border border-gray-300"
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">摘要描述</label>
                    <textarea
                      value={story.description}
                      onChange={(e) => {
                        const newStories = [...(pageData.franchiseeSharing?.stories || [])];
                        newStories[index] = { ...newStories[index], description: e.target.value };
                        setPageData((prev) => ({
                          ...prev,
                          franchiseeSharing: { ...prev.franchiseeSharing, stories: newStories },
                        }));
                      }}
                      rows={2}
                      placeholder="顯示在卡片上的簡短描述"
                      className="block w-full rounded-md bg-white px-3 py-2 border border-gray-300"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">YouTube 影片網址（選填，會顯示在文章最下方）</label>
                    <input
                      type="text"
                      value={story.youtubeUrl}
                      onChange={(e) => {
                        const newStories = [...(pageData.franchiseeSharing?.stories || [])];
                        newStories[index] = { ...newStories[index], youtubeUrl: e.target.value };
                        setPageData((prev) => ({
                          ...prev,
                          franchiseeSharing: { ...prev.franchiseeSharing, stories: newStories },
                        }));
                      }}
                      placeholder="例如: https://www.youtube.com/watch?v=xxxxx"
                      className="block w-full rounded-md bg-white px-3 py-2 border border-gray-300"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">文章內容</label>
                    <CustomEditor
                      initialData={story.content || ""}
                      onContentChange={(value) => {
                        const newStories = [...(pageData.franchiseeSharing?.stories || [])];
                        newStories[index] = { ...newStories[index], content: value };
                        setPageData((prev) => ({
                          ...prev,
                          franchiseeSharing: { ...prev.franchiseeSharing, stories: newStories },
                        }));
                      }}
                      height={300}
                      placeholder="撰寫文章內容..."
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CTA 區塊 */}
      {activeSection === "cta" && (
        <div className="bg-gray-100 p-6 rounded-lg mb-6">
          <h2 className="text-2xl font-bold mb-4">CTA 區塊設定</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">標題</label>
              <input
                type="text"
                value={pageData.cta.title}
                onChange={(e) =>
                  setPageData((prev) => ({
                    ...prev,
                    cta: { ...prev.cta, title: e.target.value },
                  }))
                }
                className="block w-full rounded-md bg-white px-3.5 py-2 border border-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">副標題</label>
              <input
                type="text"
                value={pageData.cta.subtitle}
                onChange={(e) =>
                  setPageData((prev) => ({
                    ...prev,
                    cta: { ...prev.cta, subtitle: e.target.value },
                  }))
                }
                className="block w-full rounded-md bg-white px-3.5 py-2 border border-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">背景圖片</label>
              {pageData.cta.backgroundImage && (
                <div className="mb-3">
                  <Image
                    src={pageData.cta.backgroundImage}
                    alt="CTA"
                    width={400}
                    height={200}
                    className="rounded-lg object-cover"
                  />
                </div>
              )}
              <ImageUploader
                onImageUpload={(data) =>
                  setPageData((prev) => ({
                    ...prev,
                    cta: { ...prev.cta, backgroundImage: data.imageUrl },
                  }))
                }
              />
            </div>

            <div className="mt-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold">按鈕</h3>
                <button
                  onClick={() =>
                    setPageData((prev) => ({
                      ...prev,
                      cta: {
                        ...prev.cta,
                        buttons: [...prev.cta.buttons, { text: "", link: "", icon: "", variant: "primary" }],
                      },
                    }))
                  }
                  className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
                >
                  新增按鈕
                </button>
              </div>
              {pageData.cta.buttons.map((btn, index) => (
                <div key={index} className="bg-white p-4 rounded-lg border mb-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">按鈕文字</label>
                      <input
                        type="text"
                        value={btn.text}
                        onChange={(e) => {
                          const newButtons = [...pageData.cta.buttons];
                          newButtons[index] = { ...newButtons[index], text: e.target.value };
                          setPageData((prev) => ({
                            ...prev,
                            cta: { ...prev.cta, buttons: newButtons },
                          }));
                        }}
                        className="block w-full rounded-md bg-white px-3 py-2 border border-gray-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">連結</label>
                      <input
                        type="text"
                        value={btn.link}
                        onChange={(e) => {
                          const newButtons = [...pageData.cta.buttons];
                          newButtons[index] = { ...newButtons[index], link: e.target.value };
                          setPageData((prev) => ({
                            ...prev,
                            cta: { ...prev.cta, buttons: newButtons },
                          }));
                        }}
                        className="block w-full rounded-md bg-white px-3 py-2 border border-gray-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">圖標</label>
                      <input
                        type="text"
                        value={btn.icon}
                        onChange={(e) => {
                          const newButtons = [...pageData.cta.buttons];
                          newButtons[index] = { ...newButtons[index], icon: e.target.value };
                          setPageData((prev) => ({
                            ...prev,
                            cta: { ...prev.cta, buttons: newButtons },
                          }));
                        }}
                        className="block w-full rounded-md bg-white px-3 py-2 border border-gray-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">樣式</label>
                      <select
                        value={btn.variant}
                        onChange={(e) => {
                          const newButtons = [...pageData.cta.buttons];
                          newButtons[index] = { ...newButtons[index], variant: e.target.value };
                          setPageData((prev) => ({
                            ...prev,
                            cta: { ...prev.cta, buttons: newButtons },
                          }));
                        }}
                        className="block w-full rounded-md bg-white px-3 py-2 border border-gray-300"
                      >
                        <option value="primary">主要</option>
                        <option value="secondary">次要</option>
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const newButtons = pageData.cta.buttons.filter((_, i) => i !== index);
                      setPageData((prev) => ({
                        ...prev,
                        cta: { ...prev.cta, buttons: newButtons },
                      }));
                    }}
                    className="mt-3 bg-red-500 text-white px-3 py-1 rounded text-sm"
                  >
                    刪除按鈕
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold">聯絡資訊</h3>
                <button
                  onClick={() =>
                    setPageData((prev) => ({
                      ...prev,
                      cta: {
                        ...prev.cta,
                        contactInfo: [...prev.cta.contactInfo, { icon: "", label: "", value: "" }],
                      },
                    }))
                  }
                  className="bg-blue-500 text-white px-3 py-1 rounded text-sm"
                >
                  新增資訊
                </button>
              </div>
              {pageData.cta.contactInfo.map((info, index) => (
                <div key={index} className="bg-white p-4 rounded-lg border mb-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">圖標</label>
                      <input
                        type="text"
                        value={info.icon}
                        onChange={(e) => {
                          const newInfo = [...pageData.cta.contactInfo];
                          newInfo[index] = { ...newInfo[index], icon: e.target.value };
                          setPageData((prev) => ({
                            ...prev,
                            cta: { ...prev.cta, contactInfo: newInfo },
                          }));
                        }}
                        className="block w-full rounded-md bg-white px-3 py-2 border border-gray-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">標籤</label>
                      <input
                        type="text"
                        value={info.label}
                        onChange={(e) => {
                          const newInfo = [...pageData.cta.contactInfo];
                          newInfo[index] = { ...newInfo[index], label: e.target.value };
                          setPageData((prev) => ({
                            ...prev,
                            cta: { ...prev.cta, contactInfo: newInfo },
                          }));
                        }}
                        className="block w-full rounded-md bg-white px-3 py-2 border border-gray-300"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">值</label>
                      <input
                        type="text"
                        value={info.value}
                        onChange={(e) => {
                          const newInfo = [...pageData.cta.contactInfo];
                          newInfo[index] = { ...newInfo[index], value: e.target.value };
                          setPageData((prev) => ({
                            ...prev,
                            cta: { ...prev.cta, contactInfo: newInfo },
                          }));
                        }}
                        className="block w-full rounded-md bg-white px-3 py-2 border border-gray-300"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const newInfo = pageData.cta.contactInfo.filter((_, i) => i !== index);
                      setPageData((prev) => ({
                        ...prev,
                        cta: { ...prev.cta, contactInfo: newInfo },
                      }));
                    }}
                    className="mt-3 bg-red-500 text-white px-3 py-1 rounded text-sm"
                  >
                    刪除資訊
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 儲存按鈕 */}
      <div className="mt-6 sticky bottom-4">
        <button
          onClick={handleUpdate}
          className="w-full bg-green-500 text-white px-6 py-4 rounded-lg text-lg font-semibold hover:bg-green-600 shadow-xl"
        >
          儲存所有更新
        </button>
      </div>
    </div>
  );
};
