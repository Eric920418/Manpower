import Header from "@/components/Header";
import Footer from "@/components/Footer";
import StaffHero from "@/components/Staff/StaffHero";
import StaffList from "@/components/Staff/StaffList";
import StaffCTA from "@/components/Staff/StaffCTA";

// 強制動態渲染，避免 build 時 fetch 失敗
export const dynamic = 'force-dynamic';

async function getPageData() {
  const query = `
    query getStaffPage {
      homePage {
        header
        footer
      }
      staffPage {
        hero
        staffList
        ctaSection
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

  const res = await fetch(process.env.NEXTAUTH_URL + "/api/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
    cache: 'no-store', // 不快取，確保每次都獲取最新資料
  });

  const { data } = await res.json();
  return {
    header: data?.homePage[0]?.header || null,
    footer: data?.homePage[0]?.footer || null,
    pageData: data?.staffPage[0] || null,
    staffList: data?.staffPage[0]?.staffList || [],
    navigations: data?.activeNavigations || [],
  };
}

export default async function StaffPage() {
  const { header, footer, pageData, staffList, navigations } = await getPageData();

  if (!header || !footer || !pageData) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-lg text-gray-600">載入中...</p>
      </main>
    );
  }

  // staffList 已經是後台編輯的格式，直接使用
  const formattedStaffList = staffList.map((staff: {
    id: string;
    name: string;
    position: string;
    photo: string;
    phone: string;
    email: string;
    line: string;
    bio: string;
    specialties: string[];
    detailUrl?: string;
  }) => ({
    id: staff.id,
    name: staff.name,
    position: staff.position || '業務專員',
    photo: staff.photo || '/images/default-avatar.png',
    phone: staff.phone || '',
    email: staff.email,
    line: staff.line || '',
    bio: staff.bio || '',
    specialties: staff.specialties || [],
    detailUrl: staff.detailUrl || '',
  }));

  return (
    <main className="relative flex min-h-screen w-full flex-col">
      <Header
        logo={header.logo}
        navigation={navigations.map((nav: { label: string; url: string | null }) => ({
          label: nav.label,
          link: nav.url || "#",
        }))}
        contactButton={header.contactButton}
      />

      <StaffHero
        title={pageData.hero.title}
        description={pageData.hero.description}
        image={pageData.hero.image}
      />

      <StaffList staffList={formattedStaffList} />

      <StaffCTA
        title={pageData.ctaSection.title}
        description={pageData.ctaSection.description}
        buttonText={pageData.ctaSection.buttonText}
        buttonLink={pageData.ctaSection.buttonLink}
      />

      <Footer
        logo={footer.logo}
        contact={footer.contact}
        socialMedia={footer.socialMedia}
        quickLinks={footer.quickLinks}
        map={footer.map}
        copyright={footer.copyright}
        bottomLinks={footer.bottomLinks}
      />
    </main>
  );
}
