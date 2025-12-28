type JsonRecord = Record<string, unknown>;

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const homePageDefaults = {
  header: {
    logo: {
      icon: "/logo.png",
      text: "佑羲人力",
    },
    navigation: [
      { label: "雇主服務", link: "#" },
      { label: "尋找工作", link: "#" },
      { label: "關於我們", link: "#" },
      { label: "資源中心", link: "#" },
    ],
    contactButton: {
      text: "聯絡我們",
      link: "#",
    },
  },
  hero: {
    badge: "專業外籍勞工仲介",
    title: "連接全球人才，驅動您的業務增長",
    description: "我們專注於為您的企業引進可靠、技術嫻熟的國際勞工，提供從招聘到安頓的全方位支持，確保無縫對接。",
    primaryCTA: {
      text: "尋找員工",
      link: "#",
    },
    secondaryCTA: {
      text: "我要找工作",
      link: "#",
    },
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuD-q5MC8lSOtjm5jds_NVEfwmrmueqgr9iiW4ck6RHwOTdoV-HPSXi25zLjSZMo4knk3WpkwD0vKirIeyCRXAjWSqhBXUEk8vc97jkGLY-P9pJZsWaorzrGp93KHmPfYe6Vg-mpOfgj3cIXUfiImRKHKzi5FzUQXM6jicXDJonBG6NDFm5Z_iw_iE_sJvPVLflrW-M21w5PqLlZ9UEsHsfUgZa_-814pGT1K0tOYI3ONYmWfeUxWLNxgp8hYucFdVJVxL430EKvwnM",
  },
  featuredTalents: {
    badge: "精選人才",
    title: "與世界級專業人才攜手合作",
    description: "我們精心篩選來自全球的頂尖技術人才，為您的企業注入新動力",
    stats: [
      { number: "5000+", label: "認證人才" },
      { number: "98%", label: "客戶滿意度" },
      { number: "50+", label: "合作國家" },
    ],
    talents: [
      {
        name: "Maria Garcia",
        position: "認證焊接技師",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBSNBIlYp6WRZxXSRdf5TSyuDGCyfxTAsis84_BJyAb6MxrG5VNG2WlVFk8WJqP2aHrOapd9P45_U1YjBz3Cb2h1LQ5s66YSJx_apGhPDyksQOQbB4Q-iBiLgMJfx7NXJy_mfN2mDu3NkNWUGifT0SECW_39jl6LcrDzM-VftmSmA98aqrAeb_hhes-EIrx6ip8GWXnKaM7aSMYeQwK9ydKVqZXcPdxqBXQrr7yDPH8yfQrw9OfhUH43yRNDTYbabJeEKl-knJJwtA",
        experience: "5+ 年經驗",
        location: "菲律賓 馬尼拉",
        skills: ["TIG焊接", "MIG焊接", "藍圖解讀"],
        detailUrl: "",
      },
      {
        name: "Johnathan Lee",
        position: "CNC 機械操作員",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuArtdqc0xv9QNAFVzkOm_rJKCuh4vSTsjNymHr2UIo7UXrtaYn2UJRNpc7JyiZRdFcv47xVACUaObu3IOF6YcF8kS19uAWF0jbwYxoLswF95HKqUDmpbcMz-uzbwT5JTKLCizo-78mJfNyMz1T0kA1u-hFYtQydUXr97o2GUCnSfJBsyZj6-hjPGuCX4V8_lr0BAMchHqr0WfdVgUlYA1-Qd8gB2mifNu8RQp0NlnOx9VEb4uHlYPz6oOKgEGNp-GnKCwJ5U6r6NtE",
        experience: "8 年經驗",
        location: "越南 胡志明市",
        skills: ["CNC編程", "品質控制", "AutoCAD"],
        detailUrl: "",
      },
      {
        name: "Sofia Reyes",
        position: "農業技術專員",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAcvar1dMe5_wTSjTIwgvjGOBkJUFbyKTyc1dWI6pGBVkrrt2B1uFBr1j3T7P1dhNYcunjkdr5uhF2Sk95dqcBMM7loF9jvOU6ra7hDxS_buZYwDDOtKGRtZ9rxqarqI3O9msn24btL5FDJzBsf_MBGnfzuWO96gCH849EKEhNNs3OrX8vx3lj1UHXQjgn809tc7FHQKsI37SkuLa46qVeGfklbH7oYeBbLGppyhTvrpQh0CJ3depn49xOXNNBKTfTkTZLyjf2edKg",
        experience: "3 年經驗",
        location: "墨西哥 瓜達拉哈拉",
        skills: ["作物收割", "灌溉系統", "畜牧管理"],
        detailUrl: "",
      },
    ],
    ctaText: "查看更多人才",
    ctaLink: "/talents",
  },
  footer: {
    logo: {
      icon: "/logo.png",
      text: "佑羲人力",
    },
    contact: {
      phone: "+886-2-1234-5678",
      address: "新北市永和區永貞路107號3樓",
    },
    socialMedia: [
      { platform: "Line", link: "#", svgPath: "M21.22,6.46a1.09,1.09,0,0,0-.49-.4,1.13,1.13,0,0,0-.54-.12H3.81a1.14,1.14,0,0,0-.54.12,1.09,1.09,0,0,0-.49.4,1,1,0,0,0-.16.58,1,1,0,0,0,.16.58,1.09,1.09,0,0,0,.49.4l0.27,0.14h0a9.5,9.5,0,0,0,3,1.1,10.6,10.6,0,0,1,3.42,1.29,4.28,4.28,0,0,1,1.3,1.23,3.31,3.31,0,0,1,.45,1.52,4.1,4.1,0,0,1-.52,2,4.4,4.4,0,0,1-1.43,1.5,5.7,5.7,0,0,1-2.12.9,7.66,7.66,0,0,1-2.54.34H3.81a1.12,1.12,0,0,0-.81.33,1.12,1.12,0,0,0-.33.81,1,1,0,0,0,.33.81,1,1,0,0,0,.81.33h7.2a8.53,8.53,0,0,0,3-.56,6,6,0,0,0,2.3-1.6,4.72,4.72,0,0,0,1.54-2.45,4.12,4.12,0,0,0,.1-2.4,5.49,5.49,0,0,0-1.25-2.56,8,8,0,0,0-2.43-1.8,11.33,11.33,0,0,0-3.34-1H3.53L3.26,8H20.19a1.12,1.12,0,0,0,.81-.33,1,1,0,0,0,.33-.81A1,1,0,0,0,21.22,6.46ZM16.33,13a1.53,1.53,0,0,0,1.1.45,1.58,1.58,0,0,0,1.12-.45,1.53,1.53,0,0,0,.45-1.1,1.5,1.5,0,0,0-.45-1.1,1.58,1.58,0,0,0-1.12-.45,1.53,1.53,0,0,0-1.1.45,1.5,1.5,0,0,0-.45,1.1A1.53,1.53,0,0,0,16.33,13Zm-5.11,0a1.53,1.53,0,0,0,1.1.45,1.58,1.58,0,0,0,1.12-.45,1.53,1.53,0,0,0,.45-1.1,1.5,1.5,0,0,0-.45-1.1,1.58,1.58,0,0,0-1.12-.45,1.53,1.53,0,0,0-1.1.45,1.5,1.5,0,0,0-.45,1.1A1.53,1.53,0,0,0,11.22,13Z" },
      { platform: "Facebook", link: "#", svgPath: "M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.386 23.094 10.125 24V15.562H7.078V12.073H10.125V9.413C10.125 6.387 11.916 4.75 14.657 4.75C15.97 4.75 17.344 4.953 17.344 4.953V7.922H15.83C14.336 7.922 13.875 8.854 13.875 9.748V12.073H17.203L16.672 15.562H13.875V24C19.614 23.094 24 18.1 24 12.073Z" },
      { platform: "LinkedIn", link: "#", svgPath: "M20.447 20.452H24V12.574C24 8.867 23.238 5.792 18.062 5.792C15.688 5.792 14.2 6.984 13.52 8.182H13.437V6.109H9.891V20.452H13.629V13.619C13.629 11.841 13.977 10.09 16.031 10.09C18.055 10.09 18.359 12.125 18.359 13.91V20.452H20.447ZM0 6.109H3.738V20.452H0V6.109ZM1.869 0C0.746 0 0 0.746 0 1.869C0 2.992 0.746 3.738 1.869 3.738C2.992 3.738 3.738 2.992 3.738 1.869C3.738 0.746 2.992 0 1.869 0Z" },
    ],
    quickLinks: {
      title: "快速連結",
      links: [
        { label: "尋找工作", link: "#" },
        { label: "雇主專區", link: "#" },
        { label: "關於我們", link: "#" },
        { label: "常見問題", link: "#" },
      ],
    },
    map: {
      embedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3614.733519183416!2d121.52093551500649!3d25.04312898396781!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3442a97171542845%3A0x861dbab2633b4972!2sZhongxiao%20East%20Road%2C%20Section%201%2C%20Zhongzheng%20District%2C%20Taipei%20City%2C%20Taiwan%20100!5e0!3m2!1sen!2sus!4v1684321098765!5m2!1sen!2sus",
    },
    copyright: "© 2024 佑羲人力. 版權所有.",
    bottomLinks: [
      { label: "隱私權政策", link: "#" },
      { label: "服務條款", link: "#" },
    ],
  },
  newsSection: {
    title: "最新消息與見解",
    description: "隨時了解最新的行業趨勢、成功案例和簽證法規。",
    categories: [
      { label: "全部", value: "all", active: true },
      { label: "移民", value: "immigration", active: false },
      { label: "就業市場", value: "job-market", active: false },
      { label: "成功案例", value: "success-stories", active: false },
      { label: "指南", value: "guides", active: false },
    ],
    featuredArticle: {
      badge: "精選文章",
      title: "外籍勞工新簽證法規指南",
      description: "全面了解近期簽證政策的變化，以及我們的機構如何幫助您成功應對新要求。",
      image: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&h=500&fit=crop",
      link: "#",
    },
    articles: [
      {
        category: "移民",
        date: "2023年12月14日",
        title: "成功視訊面試的技巧",
        description: "掌握我們的專家建議，讓您在下一次視訊面試中脫穎而出。",
        image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=250&fit=crop",
        link: "#",
      },
      {
        category: "指南",
        date: "2023年12月11日",
        title: "了解您的工作簽證：簡易指南",
        description: "簡化了複雜的簽證術語,幫助您了解您的權利和責任。",
        image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&h=250&fit=crop",
        link: "#",
      },
      {
        category: "指南",
        date: "2023年12月8日",
        title: "我們的機構如何支持您過渡到新國家",
        description: "從住宿到文化適應，我們將在您的每一步中提供支持。",
        image: "https://images.unsplash.com/photo-1560264418-c4445382edbc?w=400&h=250&fit=crop",
        link: "#",
      },
      {
        category: "就業市場",
        date: "2023年12月5日",
        title: "聚焦外籍人才高需求行業",
        description: "探索哪些行業正在積極招聘國際人才以及您如何定位自己。",
        image: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&h=250&fit=crop",
        link: "#",
      },
    ],
  },
  contactSection: {
    badge: "聯絡我們",
    title: "與我們取得聯繫",
    description: "有任何問題或需要協助？請填寫表單，我們的專業團隊將盡快與您聯繫。",
    formFields: {
      name: {
        label: "姓名",
        placeholder: "請輸入您的姓名",
        icon: "person",
        required: true,
      },
      email: {
        label: "電子信箱",
        placeholder: "example@email.com",
        icon: "mail",
        required: true,
      },
      phone: {
        label: "聯絡電話",
        placeholder: "+886 912 345 678",
        icon: "phone",
        required: true,
      },
      message: {
        label: "訊息內容",
        placeholder: "請告訴我們您的需求...",
        icon: "chat_bubble",
        required: true,
        rows: 5,
      },
    },
    submitButton: {
      text: "送出訊息",
      icon: "send",
    },
    contactInfo: [
      {
        icon: "mail",
        title: "電子信箱",
        content: "info@youshi-hr.com",
        description: "週一至週五 9:00-18:00 回覆",
        link: "mailto:info@youshi-hr.com",
      },
      {
        icon: "phone",
        title: "聯絡電話",
        content: "+886-2-1234-5678",
        description: "服務時間：週一至週五 9:00-18:00",
        link: "tel:+886-2-1234-5678",
      },
      {
        icon: "location_on",
        title: "辦公地點",
        content: "新北市永和區永貞路107號3樓",
        description: "歡迎預約參訪",
        link: "#",
      },
    ],
  },
};

// 申請流程頁面預設值 - 支援多工作類別
const applicationProcessPageDefaults = {
  hero: {
    title: "申請流程",
    description: "根據不同工作類別，我們提供專業的申請流程指引",
    image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1200&h=600&fit=crop",
  },
  categories: [
    {
      id: "caregiver",
      name: "看護工",
      description: "專業照護服務人員申請流程",
      icon: "elderly",
      color: "from-blue-500 to-cyan-500",
      steps: [
        {
          number: 1,
          title: "資格審查",
          description: "確認申請者符合看護工基本資格，包括年齡、健康狀況、無犯罪紀錄等",
          icon: "fact_check",
        },
        {
          number: 2,
          title: "證照驗證",
          description: "審核相關照護證照、醫療訓練證明，確保專業能力",
          icon: "verified",
        },
        {
          number: 3,
          title: "專業面試",
          description: "由專業照護主管進行面試，評估照護技能與溝通能力",
          icon: "psychology",
        },
        {
          number: 4,
          title: "職前訓練",
          description: "提供專業照護技能培訓，包括基本醫療知識、照護技巧等",
          icon: "school",
        },
        {
          number: 5,
          title: "簽約媒合",
          description: "完成訓練後，媒合適合的照護對象並簽署勞動契約",
          icon: "handshake",
        },
      ],
    },
    {
      id: "domestic-helper",
      name: "幫傭",
      description: "家務管理專家申請流程",
      icon: "home_work",
      color: "from-purple-500 to-pink-500",
      steps: [
        {
          number: 1,
          title: "基本資料審核",
          description: "確認申請者年滿18歲、健康證明、良民證等基本文件",
          icon: "badge",
        },
        {
          number: 2,
          title: "經驗評估",
          description: "了解過往家務工作經驗、專長技能（烹飪、清潔、育兒等）",
          icon: "star",
        },
        {
          number: 3,
          title: "面試與技能測試",
          description: "實地面試並進行簡單的家務技能測試",
          icon: "task_alt",
        },
        {
          number: 4,
          title: "僱主媒合",
          description: "根據技能與需求，媒合適合的僱主家庭",
          icon: "connect_without_contact",
        },
        {
          number: 5,
          title: "簽約上工",
          description: "與僱主簽訂僱傭契約，確認工作內容、薪資與工時",
          icon: "edit_document",
        },
      ],
    },
    {
      id: "factory-worker",
      name: "廠工",
      description: "製造業人才申請流程",
      icon: "precision_manufacturing",
      color: "from-orange-500 to-red-500",
      steps: [
        {
          number: 1,
          title: "需求登記",
          description: "填寫個人基本資料、工作經驗、期望薪資與工作地點",
          icon: "description",
        },
        {
          number: 2,
          title: "體能與健康檢查",
          description: "進行基本體能測試與健康檢查，確保可勝任工廠作業",
          icon: "health_and_safety",
        },
        {
          number: 3,
          title: "技能評估",
          description: "評估生產線操作、品質檢驗、設備使用等相關技能",
          icon: "engineering",
        },
        {
          number: 4,
          title: "工廠媒合",
          description: "根據技能與地點偏好，媒合合適的製造業工廠",
          icon: "factory",
        },
        {
          number: 5,
          title: "入職報到",
          description: "完成勞動契約簽署、安全教育訓練，正式入職",
          icon: "work",
        },
      ],
    },
    {
      id: "construction-worker",
      name: "營造工",
      description: "建築專業人員申請流程",
      icon: "construction",
      color: "from-yellow-600 to-orange-600",
      steps: [
        {
          number: 1,
          title: "證照資格審查",
          description: "確認相關營造證照（如職業安全衛生教育訓練證明）",
          icon: "workspace_premium",
        },
        {
          number: 2,
          title: "專業技能驗證",
          description: "評估土木、建築、水電等專業技術能力",
          icon: "build",
        },
        {
          number: 3,
          title: "安全訓練",
          description: "進行工地安全教育訓練，確保工作安全意識",
          icon: "security",
        },
        {
          number: 4,
          title: "工程媒合",
          description: "根據專長媒合建築工程專案（如鋼筋、模板、土木等）",
          icon: "apartment",
        },
        {
          number: 5,
          title: "簽約進場",
          description: "簽署工程承攬契約，辦理工地進場手續",
          icon: "how_to_reg",
        },
      ],
    },
    {
      id: "nursing-home",
      name: "養護機構",
      description: "專業照護團隊申請流程",
      icon: "local_hospital",
      color: "from-green-500 to-emerald-500",
      steps: [
        {
          number: 1,
          title: "專業證照審核",
          description: "確認照護相關證照（如照顧服務員證照、護理師執照等）",
          icon: "medical_information",
        },
        {
          number: 2,
          title: "照護經驗評估",
          description: "評估在長照機構、安養中心、護理之家的工作經驗",
          icon: "history_edu",
        },
        {
          number: 3,
          title: "專業面試",
          description: "由機構主管進行面試，評估照護能力與團隊合作精神",
          icon: "groups",
        },
        {
          number: 4,
          title: "機構訓練",
          description: "接受機構內部訓練，熟悉工作流程與照護標準",
          icon: "menu_book",
        },
        {
          number: 5,
          title: "正式聘僱",
          description: "簽署勞動契約，成為養護機構正式員工",
          icon: "approval",
        },
      ],
    },
  ],
  contactCTA: {
    title: "準備開始了嗎？",
    description: "立即聯繫我們，讓專業團隊為您服務",
    buttonText: "聯絡我們",
    buttonLink: "/contact",
  },
};

// 移工列表頁面預設值
const workersPageDefaults = {
  hero: {
    title: "優質人才庫",
    description: "瀏覽我們精選的專業人才，選擇最適合您企業的員工",
    image: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1200&h=600&fit=crop",
  },
  filterOptions: {
    categories: ["製造業", "營建業", "服務業", "農業", "漁業"],
    countries: ["菲律賓", "越南", "印尼", "泰國"],
    genders: ["男", "女", "不限"],
    sourceTypes: ["國內轉出工", "國外引進工"],
  },
  workers: [
    {
      id: "W001",
      name: "Maria Santos",
      foreignId: "DPBWT922",
      age: 28,
      gender: "女",
      country: "菲律賓",
      photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop",
      experience: "5年工廠經驗",
      education: "高中職",
      height: 158,
      weight: 52,
      skills: ["品質檢驗", "機械操作", "團隊合作"],
      languages: ["中文", "英文", "他加祿語"],
      availability: "即時可上工",
      category: "製造業",
      sourceType: "國外引進工",
      description: "具備豐富的工廠生產線經驗，熟悉品質管理流程。",
      isNew: true,
    },
    {
      id: "W002",
      name: "Nguyen Van A",
      foreignId: "DPBWT923",
      age: 32,
      gender: "男",
      country: "越南",
      photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
      experience: "8年營建經驗",
      education: "國中",
      height: 172,
      weight: 68,
      skills: ["鋼筋綁紮", "模板施工", "工地安全"],
      languages: ["中文", "越南語"],
      availability: "一個月內",
      category: "營建業",
      sourceType: "國內轉出工",
      description: "擁有多項營建證照，工作態度認真負責。",
      isNew: false,
    },
  ],
  ctaSection: {
    title: "沒有找到合適的人選？",
    description: "告訴我們您的特殊需求，我們將為您客製化搜尋人才",
    buttonText: "聯絡專員",
    buttonLink: "/contact",
  },
};

// 常見問題頁面預設值
const faqPageDefaults = {
  hero: {
    title: "常見問題",
    description: "找到您關心的問題解答，或直接聯繫我們的專業團隊",
  },
  categories: [
    { id: "application", name: "申請流程" },
    { id: "legal", name: "法規相關" },
    { id: "contract", name: "合約條款" },
  ],
  faqs: [
    {
      category: "application",
      question: "申請外籍勞工需要多久時間？",
      answer: "一般來說，從提出申請到人員入境約需要3-6個月的時間，實際時間會因國籍、職種和政府審核速度而有所不同。我們會協助您加快流程，並隨時回報進度。",
    },
    {
      category: "application",
      question: "需要準備哪些文件？",
      answer: "基本文件包括：公司登記證明、營業稅籍證明、工廠登記證（製造業）、勞保投保證明等。我們會提供完整的文件清單，並協助您準備所有必要文件。",
    },
    {
      category: "legal",
      question: "僱用外籍勞工有哪些法律責任？",
      answer: "雇主需要負責外籍勞工的薪資、住宿、保險等基本權益，並遵守勞動法規。我們提供完整的法律諮詢服務，確保您的僱用關係符合所有法規要求。",
    },
    {
      category: "contract",
      question: "合約期限是多久？",
      answer: "外籍勞工的標準合約期限為3年，期滿後可以申請展延，最長可達12年（製造業14年）。我們會在合約到期前提醒您，並協助辦理展延手續。",
    },
  ],
  contactSection: {
    title: "還有其他問題？",
    description: "我們的專業團隊隨時為您解答",
    buttonText: "聯絡我們",
    buttonLink: "/contact",
  },
};

// 業務人員頁面預設值
const staffPageDefaults = {
  hero: {
    title: "主力人力",
    description: "我們的專業業務團隊，竭誠為您提供最優質的人力仲介服務",
    image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&h=600&fit=crop",
  },
  staffList: [
    {
      id: "staff-001",
      name: "陳大明",
      position: "業務經理",
      photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",
      phone: "0912-345-678",
      email: "chen@youshi-hr.com",
      line: "@youshi_chen",
      bio: "擁有10年以上人力仲介經驗，專精於製造業與營建業人才媒合。",
      specialties: ["製造業", "營建業", "大型企業專案"],
      detailUrl: "",
    },
    {
      id: "staff-002",
      name: "林小美",
      position: "資深業務專員",
      photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
      phone: "0923-456-789",
      email: "lin@youshi-hr.com",
      line: "@youshi_lin",
      bio: "專注於家庭看護與養護機構人力配置，細心服務每一位客戶。",
      specialties: ["家庭看護", "養護機構", "長照服務"],
      detailUrl: "",
    },
    {
      id: "staff-003",
      name: "王志豪",
      position: "業務專員",
      photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
      phone: "0934-567-890",
      email: "wang@youshi-hr.com",
      line: "@youshi_wang",
      bio: "熱情積極，致力於為中小企業提供最適合的人力解決方案。",
      specialties: ["中小企業", "服務業", "農漁業"],
      detailUrl: "",
    },
  ],
  ctaSection: {
    title: "需要專人為您服務？",
    description: "歡迎隨時聯繫我們的業務團隊，我們將竭誠為您提供專業諮詢",
    buttonText: "立即聯絡",
    buttonLink: "/contact",
  },
};

// 創業加盟頁面預設值
const franchisePageDefaults = {
  hero: {
    title: "創業加盟",
    backgroundImage: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=80&w=2000",
  },
  marketOpportunity: {
    title: "長照市場:未來的黃金產業",
    backgroundImage: "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?q=80&w=2000",
    opportunities: [
      {
        title: "無需經驗,全程培訓",
        subtitle: "素人就能上手",
        features: [
          { icon: "support_agent", label: "後端行政支持" },
          { icon: "campaign", label: "品牌廣告行銷" },
        ],
        gradient: "from-blue-600 to-cyan-500",
      },
      {
        title: "突破長照2.0侷限性",
        subtitle: "長照相關工作的職涯升級",
        features: [
          { icon: "trending_up", label: "提供既有顧客更多服務" },
          { icon: "diversity_3", label: "多角化經營不同層面顧客" },
        ],
        gradient: "from-cyan-500 to-teal-500",
      },
    ],
  },
  partnershipAdvantages: {
    title: "穩健創業的最佳夥伴—佑羲人力",
    subtitle: "四大核心優勢,助您成功創業",
    advantages: [
      {
        number: "1",
        title: "全程教育訓練",
        subtitle: "分階段課程,從法規到實務,全方位指導",
        description: "我們提供完整的教育訓練體系,課程依照加盟夥伴的需求分階段進行:基礎階段涵蓋相關法規與行業入門知識,中期則安排實務操作與案例分析,最終讓夥伴透過實地實習熟練各種技能。",
        image: "",
        imagePosition: "right",
      },
      {
        number: "2",
        title: "品質管控與支持",
        subtitle: "品牌權利金模式,確保服務標準與業務品質",
        description: "採取品牌權利金模式,我們嚴格管控服務流程與標準,確保每位加盟夥伴提供一致且高品質的服務。我們還提供定期稽核和改善建議,針對經營中的難題提供快速支援。",
        image: "",
        imagePosition: "left",
      },
      {
        number: "3",
        title: "多角化業務機會",
        subtitle: "豐富經營經驗,拓展多元市場與客戶資源",
        description: "作為業界領先品牌,佑羲人力累積了豐富的經驗與行業資源,協助加盟主開拓多元化市場機會。從家庭看護到機構合作,再到新興長照需求,每一個業務板塊都充滿潛力與機遇。",
        image: "",
        imagePosition: "right",
      },
      {
        number: "4",
        title: "行銷與品牌背書",
        subtitle: "獨立行銷團隊支援,提升市場競爭力",
        description: "我們擁有專業的獨立行銷團隊,負責規劃品牌推廣活動,提供多樣化的宣傳資源,包括數位行銷、社群媒體推廣與實體活動策劃。我們還會針對地區特性量身定制行銷策略。",
        image: "",
        imagePosition: "left",
      },
    ],
    ctaButton: {
      text: "從零開始:成為加盟主",
      link: "#seminar",
    },
  },
  franchiseProcess: {
    title: "加盟流程",
    subtitle: "八個步驟,輕鬆開啟創業之路",
    steps: [
      { number: 1, title: "客戶洽詢", image: "" },
      { number: 2, title: "需求了解", image: "" },
      { number: 3, title: "鄰里評估現場勘查", image: "" },
      { number: 4, title: "規劃建議", image: "" },
      { number: 5, title: "專案簽約", image: "" },
      { number: 6, title: "教育訓練", image: "" },
      { number: 7, title: "工程施作", image: "" },
      { number: 8, title: "完工開幕", image: "" },
    ],
  },
  cta: {
    title: "想要了解佑羲人力加盟資訊",
    subtitle: "歡迎與我們聯繫喔!",
    backgroundImage: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=2000",
    buttons: [
      {
        text: "聯絡我們",
        link: "/contact",
        icon: "mail",
        variant: "primary",
      },
      {
        text: "加盟說明會報名表",
        link: "/franchise/seminar",
        icon: "event_note",
        variant: "secondary",
      },
    ],
    contactInfo: [
      { icon: "phone", label: "免付費專線", value: "0800-600-885" },
      { icon: "schedule", label: "服務時間", value: "週一至週五 09:00-18:00" },
    ],
  },
  // 加盟主分享區塊
  franchiseeSharing: {
    title: "加盟主分享",
    subtitle: "聽聽我們的加盟夥伴怎麼說",
    videos: [
      {
        id: "1",
        title: "加盟主分享影片",
        youtubeUrl: "",
        description: "加盟主分享創業心得",
        franchiseeName: "",
        location: "",
      },
    ],
    stories: [
      {
        id: "1",
        image: "",
        title: "保險員轉職",
        subtitle: "加盟主分享｜萬達人力行銷課",
        date: "December 24, 2025",
        category: "萬達人力 行銷課",
        description: "從保險到照護，用專業走進人生最需要的時刻",
        content: "<p>這是文章內容...</p>",
        youtubeUrl: "",
      },
      {
        id: "2",
        image: "",
        title: "業務員斜槓",
        subtitle: "加盟主分享｜萬達人力行銷課",
        date: "September 18, 2025",
        category: "萬達人力 行銷課",
        description: "業務跑出創業路，開啟斜槓新人生",
        content: "<p>這是文章內容...</p>",
        youtubeUrl: "",
      },
      {
        id: "3",
        image: "",
        title: "居服員創業",
        subtitle: "加盟主分享｜萬達人力行銷課",
        date: "August 28, 2025",
        category: "萬達人力 行銷課",
        description: "從照服員到創業者，用心打造「助人事業」",
        content: "<p>這是文章內容...</p>",
        youtubeUrl: "",
      },
      {
        id: "4",
        image: "",
        title: "員工變老闆",
        subtitle: "加盟主分享｜萬達人力行銷課",
        date: "August 15, 2025",
        category: "萬達人力 行銷課",
        description: "從員工到老闘，新的挑戰與機會",
        content: "<p>這是文章內容...</p>",
        youtubeUrl: "",
      },
      {
        id: "5",
        image: "",
        title: "超商加盟主",
        subtitle: "加盟主分享｜萬達人力行銷課",
        date: "August 07, 2025",
        category: "萬達人力 行銷課",
        description: "用經營超商的精神投資新人生",
        content: "<p>這是文章內容...</p>",
        youtubeUrl: "",
      },
      {
        id: "6",
        image: "",
        title: "退休消防員",
        subtitle: "加盟主分享｜萬達人力行銷課",
        date: "July 11, 2025",
        category: "萬達人力 行銷課",
        description: "退休後的新征程，服務再出發",
        content: "<p>這是文章內容...</p>",
        youtubeUrl: "",
      },
    ],
  },
};

// 懸浮連結預設值
const floatingLinksDefaults = {
  enabled: true,
  position: "right", // "left" 或 "right"
  links: [
    {
      id: "fl-001",
      icon: "/uploads/line-icon.png",
      label: "Line",
      url: "https://line.me/",
      isActive: true,
      order: 1,
    },
    {
      id: "fl-002",
      icon: "/uploads/facebook-icon.png",
      label: "Facebook",
      url: "https://facebook.com/",
      isActive: true,
      order: 2,
    },
    {
      id: "fl-003",
      icon: "/uploads/phone-icon.png",
      label: "電話諮詢",
      url: "tel:+886-2-1234-5678",
      isActive: true,
      order: 3,
    },
  ],
};

// 最新消息頁面預設值
const newsPageDefaults = {
  hero: {
    title: "最新消息",
    description: "掌握最新的產業動態、政策更新和成功案例分享",
  },
  categories: ["全部", "政策公告", "產業新聞", "成功案例", "活動訊息"],
  featuredNews: {
    title: "2024年外籍勞工新制上路",
    slug: "2024-new-regulations",
    excerpt: "勞動部宣布新的外籍勞工管理辦法，簡化申請流程並提高配額上限。了解新制如何影響您的企業。",
    content: "<p>勞動部於近日宣布新的外籍勞工管理辦法，此次修正重點包括簡化申請流程、提高配額上限，以及優化外籍勞工權益保障。</p><h2>主要修正重點</h2><p>1. 簡化申請流程：縮短審核時間，讓企業能更快速獲得人力支援。</p><p>2. 提高配額上限：因應產業需求，適度調整外籍勞工配額。</p><p>3. 強化權益保障：加強對外籍勞工的勞動權益保護措施。</p>",
    image: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=500&fit=crop",
    date: "2024-01-15",
    category: "政策公告",
    link: "/news/2024-new-regulations",
  },
  newsList: [
    {
      title: "製造業缺工問題持續，外籍勞工需求創新高",
      slug: "manufacturing-labor-shortage",
      excerpt: "根據最新統計，製造業缺工人數突破10萬人，外籍勞工引進成為企業解決人力短缺的重要途徑。",
      content: "<p>根據最新統計數據顯示，製造業缺工人數已突破10萬人大關，創下近年來新高。</p><h2>產業現況</h2><p>隨著台灣產業持續發展，製造業對人力的需求不斷增加，但本地勞動力供給不足，使得外籍勞工引進成為企業解決人力短缺的重要途徑。</p><h2>解決方案</h2><p>我們提供專業的外籍勞工引進服務，協助企業快速補充人力缺口，提升生產效率。</p>",
      image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&h=250&fit=crop",
      date: "2024-01-10",
      category: "產業新聞",
      link: "/news/manufacturing-labor-shortage",
    },
    {
      title: "成功案例分享：如何建立友善的多元文化職場",
      slug: "multicultural-workplace",
      excerpt: "訪問三家成功引進外籍勞工的企業，分享他們如何打造包容性的工作環境。",
      content: "<p>本次我們訪問了三家成功引進外籍勞工的企業，了解他們如何打造包容性的工作環境。</p><h2>成功案例一：科技製造業</h2><p>這家位於新竹的科技公司，透過定期舉辦文化交流活動，讓本地員工與外籍同事建立良好關係。</p><h2>成功案例二：傳統製造業</h2><p>這家老牌製造商提供完善的外籍員工住宿設施，並設有專屬的文化適應輔導員。</p><h2>成功案例三：服務業</h2><p>這家連鎖餐飲業者，透過多語言培訓手冊和標準作業流程，讓外籍員工能快速上手工作。</p>",
      image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=250&fit=crop",
      date: "2024-01-05",
      category: "成功案例",
      link: "/news/multicultural-workplace",
    },
  ],
};

export const blockDefaults = {
  homePage: () => clone(homePageDefaults),
  applicationProcessPage: () => clone(applicationProcessPageDefaults),
  workersPage: () => clone(workersPageDefaults),
  faqPage: () => clone(faqPageDefaults),
  newsPage: () => clone(newsPageDefaults),
  staffPage: () => clone(staffPageDefaults),
  franchisePage: () => clone(franchisePageDefaults),
  floatingLinks: () => clone(floatingLinksDefaults),
} as const;

export type BlockKey = keyof typeof blockDefaults;

export const getDefaultPayload = (key: BlockKey) => blockDefaults[key]();
