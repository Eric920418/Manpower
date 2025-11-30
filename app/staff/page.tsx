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
        ctaSection
      }
      staffMembers {
        id
        name
        position
        avatar
        phone
        email
        lineId
        bio
        specialties
        department
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
    next: { revalidate: 300 }, // ISR: 每 5 分鐘重新驗證
  });

  const { data } = await res.json();
  return {
    header: data?.homePage[0]?.header || null,
    footer: data?.homePage[0]?.footer || null,
    pageData: data?.staffPage[0] || null,
    staffMembers: data?.staffMembers || [],
    navigations: data?.activeNavigations || [],
  };
}

export default async function StaffPage() {
  const { header, footer, pageData, staffMembers, navigations } = await getPageData();

  if (!header || !footer || !pageData) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-lg text-gray-600">載入中...</p>
      </main>
    );
  }

  // 將資料庫欄位映射為組件需要的格式
  const formattedStaffList = staffMembers.map((member: {
    id: string;
    name: string;
    position: string | null;
    avatar: string | null;
    phone: string | null;
    email: string;
    lineId: string | null;
    bio: string | null;
    specialties: string[] | null;
  }) => ({
    id: member.id,
    name: member.name,
    position: member.position || '業務專員',
    photo: member.avatar || '/images/default-avatar.png',
    phone: member.phone || '',
    email: member.email,
    line: member.lineId || '',
    bio: member.bio || '',
    specialties: member.specialties || [],
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
