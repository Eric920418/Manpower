import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 開始初始化資料庫...');

  // 1. 創建系統管理員
  console.log('👤 創建系統管理員...');
  const adminPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@youshi-hr.com' },
    update: {},
    create: {
      email: 'admin@youshi-hr.com',
      name: '系統管理員',
      password: adminPassword,
      role: Role.SUPER_ADMIN,
      department: '資訊部',
      phone: '0912-345-678',
      isActive: true,
    },
  });
  console.log(`✓ 管理員建立完成: ${admin.email}`);

  // 2. 創建測試用戶
  console.log('👥 創建測試用戶...');
  const testUsers = [
    {
      email: 'owner@youshi-hr.com',
      name: '陳董事長',
      role: Role.OWNER,
      department: '經營管理',
      phone: '0912-111-111',
    },
    {
      email: 'staff1@youshi-hr.com',
      name: '王業務',
      role: Role.STAFF,
      department: '業務一部',
      phone: '0912-222-222',
    },
    {
      email: 'staff2@youshi-hr.com',
      name: '李專員',
      role: Role.STAFF,
      department: '業務二部',
      phone: '0912-333-333',
    },
  ];

  for (const userData of testUsers) {
    const password = await bcrypt.hash('password123', 10);
    await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        ...userData,
        password,
        isActive: true,
      },
    });
    console.log(`✓ 用戶建立: ${userData.email}`);
  }

  // 3. 創建導航選單
  console.log('📋 創建導航選單...');
  const navItems = [
    { label: '申請流程', url: '/apply-process', order: 0, icon: 'approval' },
    { label: '履歷表', url: '/resume', order: 1, icon: 'description' },
    { label: '常見問題', url: '/faq', order: 2, icon: 'help' },
    { label: '最新消息', url: '/news', order: 3, icon: 'newspaper' },
    { label: '創業計劃', url: '/franchise', order: 4, icon: 'rocket_launch' },
  ];

  for (const item of navItems) {
    await prisma.navigation.upsert({
      where: { id: item.order + 1 },
      update: {},
      create: item,
    });
  }
  console.log(`✓ ${navItems.length} 個導航項目建立完成`);

  console.log('✓ 導航選單初始化完成');

  // 4. 創建系統設定
  console.log('⚙️ 創建系統設定...');
  const systemConfigs = [
    {
      key: 'site_name',
      value: { zh: '佑羲人力管理系統', en: 'Youshi HR System' },
      category: 'general',
    },
    {
      key: 'contact_info',
      value: {
        phone: '0800-123-456',
        email: 'info@youshi-hr.com',
        address: '新北市永和區永貞路107號3樓',
        business_hours: '週一至週五 09:00-18:00',
      },
      category: 'general',
    },
    {
      key: 'email_settings',
      value: {
        smtp_host: 'smtp.gmail.com',
        smtp_port: 587,
        from_email: 'noreply@youshi-hr.com',
        from_name: '佑羲人力',
      },
      category: 'email',
    },
    {
      key: 'ga4_settings',
      value: {
        tracking_id: 'G-XXXXXXXXXX',
        enable_demographics: true,
        enable_advertising: false,
      },
      category: 'analytics',
    },
  ];

  for (const config of systemConfigs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: {},
      create: config,
    });
  }
  console.log(`✓ ${systemConfigs.length} 個系統設定建立完成`);

  // 7. 創建初始頁面
  console.log('📄 創建初始頁面...');
  const pages = [
    {
      slug: 'home',
      title: '首頁',
      description: '佑羲人力首頁',
      template: 'default',
      status: 'published',
      publishedAt: new Date(),
      content: {
        sections: [
          {
            type: 'hero',
            title: '專業人力資源解決方案',
            subtitle: '提供完整的人力派遣與管理服務',
            image: '/images/hero-banner.jpg',
            cta: {
              text: '了解更多',
              link: '/about',
            },
          },
          {
            type: 'features',
            title: '我們的優勢',
            items: [
              {
                icon: 'shield',
                title: '專業認證',
                description: '政府合法立案，擁有完整證照',
              },
              {
                icon: 'users',
                title: '經驗豐富',
                description: '超過20年人力派遣經驗',
              },
              {
                icon: 'heart',
                title: '用心服務',
                description: '24小時客服支援系統',
              },
              {
                icon: 'award',
                title: '品質保證',
                description: '嚴格篩選與訓練機制',
              },
            ],
          },
        ],
      },
      metaTags: {
        title: '佑羲人力 - 專業人力派遣服務',
        description: '提供外籍看護、本國看護、居家照護等完整人力資源解決方案',
        keywords: '人力派遣,看護服務,居家照護,外籍看護',
      },
    },
    {
      slug: 'about',
      title: '關於我們',
      description: '關於佑羲人力',
      template: 'default',
      status: 'published',
      publishedAt: new Date(),
      content: {
        sections: [
          {
            type: 'content',
            title: '公司簡介',
            content: '我們是一家專業的人力資源管理公司，致力於提供優質的人力派遣服務...',
          },
        ],
      },
    },
  ];

  for (const page of pages) {
    await prisma.page.upsert({
      where: { slug: page.slug },
      update: {},
      create: page,
    });
  }
  console.log(`✓ ${pages.length} 個頁面建立完成`);

  // 8. 創建首頁 ContentBlock
  console.log('🏠 創建首頁內容區塊...');
  await prisma.contentBlock.upsert({
    where: { key: 'homePage' },
    update: {},
    create: {
      key: 'homePage',
      payload: {
        header: {
          logo: {
            icon: "groups",
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
          image: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&h=600&fit=crop",
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
              image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop",
              experience: "5+ 年經驗",
              location: "菲律賓 馬尼拉",
              skills: ["TIG焊接", "MIG焊接", "藍圖解讀"],
            },
            {
              name: "Johnathan Lee",
              position: "CNC 機械操作員",
              image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
              experience: "8 年經驗",
              location: "越南 胡志明市",
              skills: ["CNC編程", "品質控制", "AutoCAD"],
            },
            {
              name: "Sofia Reyes",
              position: "農業技術專員",
              image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop",
              experience: "3 年經驗",
              location: "墨西哥 瓜達拉哈拉",
              skills: ["作物收割", "灌溉系統", "畜牧管理"],
            },
          ],
          ctaText: "查看更多人才",
          ctaLink: "/talents",
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
              description: "簡化了複雜的簽證術語，幫助您了解您的權利和責任。",
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
        footer: {
          logo: {
            icon: "groups",
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
      },
    },
  });
  console.log('✓ 首頁內容區塊建立完成');

  console.log('\n🎉 資料庫初始化完成！');
  console.log('\n📝 測試帳號資訊：');
  console.log('━'.repeat(50));
  console.log('超級管理員 (SUPER_ADMIN):');
  console.log('  Email: admin@youshi-hr.com');
  console.log('  Password: admin123');
  console.log('\n業主帳號 (OWNER):');
  console.log('  Email: owner@youshi-hr.com');
  console.log('  Password: password123');
  console.log('\n業務人員帳號 (STAFF) - 密碼皆為 password123:');
  console.log('  staff1@youshi-hr.com (王業務 - 業務一部)');
  console.log('  staff2@youshi-hr.com (李專員 - 業務二部)');
  console.log('━'.repeat(50));
}

main()
  .catch((e) => {
    console.error('❌ 初始化失敗:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
