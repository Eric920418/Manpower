"use client";
import { useState, useRef, useEffect } from "react";

interface FilterOption {
  label: string;
  value: string;
}

interface FilterBarProps {
  onFilterChange: (filters: {
    industry?: string;
    experience?: string;
    country?: string;
    language?: string;
    sourceType?: string;
  }) => void;
}

export default function FilterBar({ onFilterChange }: FilterBarProps) {
  const filterBarRef = useRef<HTMLDivElement>(null);
  const [showIndustryMenu, setShowIndustryMenu] = useState(false);
  const [showExperienceMenu, setShowExperienceMenu] = useState(false);
  const [showCountryMenu, setShowCountryMenu] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showSourceTypeMenu, setShowSourceTypeMenu] = useState(false);

  const [selectedIndustry, setSelectedIndustry] = useState<string>("");
  const [selectedExperience, setSelectedExperience] = useState<string>("");
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [selectedSourceType, setSelectedSourceType] = useState<string>("");

  // 點擊外部時關閉所有選單
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterBarRef.current && !filterBarRef.current.contains(event.target as Node)) {
        setShowIndustryMenu(false);
        setShowExperienceMenu(false);
        setShowCountryMenu(false);
        setShowLanguageMenu(false);
        setShowSourceTypeMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const industries: FilterOption[] = [
    { label: "全部產業", value: "" },
    { label: "製造業", value: "manufacturing" },
    { label: "營建業", value: "construction" },
    { label: "農業", value: "agriculture" },
    { label: "服務業", value: "service" },
    { label: "科技業", value: "technology" },
  ];

  const experienceLevels: FilterOption[] = [
    { label: "全部經驗", value: "" },
    { label: "1-2 年", value: "1-2" },
    { label: "3-5 年", value: "3-5" },
    { label: "5-10 年", value: "5-10" },
    { label: "10 年以上", value: "10+" },
  ];

  const countries: FilterOption[] = [
    { label: "全部國家", value: "" },
    { label: "菲律賓", value: "philippines" },
    { label: "越南", value: "vietnam" },
    { label: "印尼", value: "indonesia" },
    { label: "泰國", value: "thailand" },
    { label: "印度", value: "india" },
  ];

  const languages: FilterOption[] = [
    { label: "全部語言", value: "" },
    { label: "中文", value: "chinese" },
    { label: "英文", value: "english" },
    { label: "日文", value: "japanese" },
    { label: "韓文", value: "korean" },
  ];

  const sourceTypes: FilterOption[] = [
    { label: "全部來源", value: "" },
    { label: "國內轉出工", value: "domestic" },
    { label: "國外引進工", value: "foreign" },
  ];

  const handleFilterChange = (
    type: "industry" | "experience" | "country" | "language" | "sourceType",
    value: string
  ) => {
    const newFilters = {
      industry: type === "industry" ? value : selectedIndustry,
      experience: type === "experience" ? value : selectedExperience,
      country: type === "country" ? value : selectedCountry,
      language: type === "language" ? value : selectedLanguage,
      sourceType: type === "sourceType" ? value : selectedSourceType,
    };

    if (type === "industry") setSelectedIndustry(value);
    if (type === "experience") setSelectedExperience(value);
    if (type === "country") setSelectedCountry(value);
    if (type === "language") setSelectedLanguage(value);
    if (type === "sourceType") setSelectedSourceType(value);

    onFilterChange(newFilters);

    // 關閉所有選單
    setShowIndustryMenu(false);
    setShowExperienceMenu(false);
    setShowCountryMenu(false);
    setShowLanguageMenu(false);
    setShowSourceTypeMenu(false);
  };

  const FilterButton = ({
    label,
    isOpen,
    onClick,
    hasSelection,
  }: {
    label: string;
    isOpen: boolean;
    onClick: () => void;
    hasSelection: boolean;
  }) => (
    <div className="relative">
      <button
        onClick={onClick}
        className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-lg px-4 shadow-sm border transition-all ${
          hasSelection
            ? "bg-brand-primary text-text-on-brand border-brand-primary"
            : "bg-white border-border hover:border-brand-primary"
        }`}
      >
        <p
          className={`text-sm font-medium ${
            hasSelection ? "text-text-on-brand" : "text-text-primary"
          }`}
        >
          {label}
        </p>
        <span
          className={`material-symbols-outlined text-base ${
            hasSelection ? "text-text-on-brand" : "text-text-secondary"
          } ${isOpen ? "rotate-180" : ""} transition-transform`}
        >
          expand_more
        </span>
      </button>
    </div>
  );

  const DropdownMenu = ({
    options,
    onSelect,
    isOpen,
  }: {
    options: FilterOption[];
    onSelect: (value: string) => void;
    isOpen: boolean;
  }) =>
    isOpen ? (
      <div className="absolute top-full mt-2 bg-white border border-border rounded-lg shadow-xl z-50 min-w-[180px] py-2">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => onSelect(option.value)}
            className="w-full px-4 py-2 text-left text-sm hover:bg-brand-primary/10 hover:text-brand-secondary transition-colors"
          >
            {option.label}
          </button>
        ))}
      </div>
    ) : null;

  return (
    <div ref={filterBarRef} className="flex flex-wrap items-center gap-3">
      <div className="relative">
        <FilterButton
          label="產業類別"
          isOpen={showIndustryMenu}
          onClick={() => {
            setShowIndustryMenu(!showIndustryMenu);
            setShowExperienceMenu(false);
            setShowCountryMenu(false);
            setShowLanguageMenu(false);
            setShowSourceTypeMenu(false);
          }}
          hasSelection={!!selectedIndustry}
        />
        <DropdownMenu
          options={industries}
          onSelect={(value) => handleFilterChange("industry", value)}
          isOpen={showIndustryMenu}
        />
      </div>

      <div className="relative">
        <FilterButton
          label="經驗年資"
          isOpen={showExperienceMenu}
          onClick={() => {
            setShowExperienceMenu(!showExperienceMenu);
            setShowIndustryMenu(false);
            setShowCountryMenu(false);
            setShowLanguageMenu(false);
            setShowSourceTypeMenu(false);
          }}
          hasSelection={!!selectedExperience}
        />
        <DropdownMenu
          options={experienceLevels}
          onSelect={(value) => handleFilterChange("experience", value)}
          isOpen={showExperienceMenu}
        />
      </div>

      <div className="relative">
        <FilterButton
          label="國籍"
          isOpen={showCountryMenu}
          onClick={() => {
            setShowCountryMenu(!showCountryMenu);
            setShowIndustryMenu(false);
            setShowExperienceMenu(false);
            setShowLanguageMenu(false);
            setShowSourceTypeMenu(false);
          }}
          hasSelection={!!selectedCountry}
        />
        <DropdownMenu
          options={countries}
          onSelect={(value) => handleFilterChange("country", value)}
          isOpen={showCountryMenu}
        />
      </div>

      <div className="relative">
        <FilterButton
          label="語言能力"
          isOpen={showLanguageMenu}
          onClick={() => {
            setShowLanguageMenu(!showLanguageMenu);
            setShowIndustryMenu(false);
            setShowExperienceMenu(false);
            setShowCountryMenu(false);
            setShowSourceTypeMenu(false);
          }}
          hasSelection={!!selectedLanguage}
        />
        <DropdownMenu
          options={languages}
          onSelect={(value) => handleFilterChange("language", value)}
          isOpen={showLanguageMenu}
        />
      </div>

      <div className="relative">
        <FilterButton
          label="來源類型"
          isOpen={showSourceTypeMenu}
          onClick={() => {
            setShowSourceTypeMenu(!showSourceTypeMenu);
            setShowIndustryMenu(false);
            setShowExperienceMenu(false);
            setShowCountryMenu(false);
            setShowLanguageMenu(false);
          }}
          hasSelection={!!selectedSourceType}
        />
        <DropdownMenu
          options={sourceTypes}
          onSelect={(value) => handleFilterChange("sourceType", value)}
          isOpen={showSourceTypeMenu}
        />
      </div>
    </div>
  );
}
