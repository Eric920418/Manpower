"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FranchiseNavButtons from "./FranchiseNavButtons";
import MarketOpportunity from "./MarketOpportunity";
import PartnershipAdvantages from "./PartnershipAdvantages";
import FranchiseProcess from "./FranchiseProcess";
import FranchiseCTA from "./FranchiseCTA";
import FranchiseeStories from "./FranchiseeStories";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyData = any;

interface FranchisePageContentProps {
  franchisePage: {
    marketOpportunity?: AnyData;
    partnershipAdvantages?: AnyData;
    franchiseProcess?: AnyData;
    franchiseeSharing?: AnyData;
    cta?: AnyData;
  } | null;
}

export default function FranchisePageContent({ franchisePage }: FranchisePageContentProps) {
  const [activeTab, setActiveTab] = useState("main");

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  // 主要內容（市場趨勢、加盟詳情、說明會報名）
  const MainContent = () => (
    <>
      <MarketOpportunity data={franchisePage?.marketOpportunity} />
      <PartnershipAdvantages data={franchisePage?.partnershipAdvantages} />
      <FranchiseProcess data={franchisePage?.franchiseProcess} />
      <FranchiseCTA data={franchisePage?.cta} />
    </>
  );

  // 根據 activeTab 渲染對應內容
  const renderContent = () => {
    switch (activeTab) {
      case "stories":
        return <FranchiseeStories data={franchisePage?.franchiseeSharing} />;
      case "main":
      case "details":
      case "seminar":
      default:
        return <MainContent />;
    }
  };

  return (
    <>
      <FranchiseNavButtons activeTab={activeTab} onTabChange={handleTabChange} />
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {renderContent()}
        </motion.div>
      </AnimatePresence>
    </>
  );
}
