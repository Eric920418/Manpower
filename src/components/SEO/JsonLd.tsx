import Script from "next/script";

interface OrganizationJsonLdProps {
  name: string;
  url: string;
  logo: string;
  description: string;
  address?: {
    streetAddress: string;
    addressLocality: string;
    addressRegion: string;
    postalCode?: string;
    addressCountry: string;
  };
  contactPoint?: {
    telephone: string;
    contactType: string;
    email?: string;
  };
  sameAs?: string[];
}

interface ArticleJsonLdProps {
  title: string;
  description: string;
  url: string;
  image: string;
  datePublished: string;
  dateModified?: string;
  authorName: string;
  publisherName: string;
  publisherLogo: string;
}

interface BreadcrumbJsonLdProps {
  items: {
    name: string;
    url: string;
  }[];
}

interface FAQJsonLdProps {
  questions: {
    question: string;
    answer: string;
  }[];
}

interface LocalBusinessJsonLdProps {
  name: string;
  description: string;
  url: string;
  logo: string;
  image: string;
  telephone: string;
  email?: string;
  address: {
    streetAddress: string;
    addressLocality: string;
    addressRegion: string;
    postalCode?: string;
    addressCountry: string;
  };
  openingHours?: string[];
  priceRange?: string;
}

// Organization Schema - 用於首頁
export function OrganizationJsonLd({
  name,
  url,
  logo,
  description,
  address,
  contactPoint,
  sameAs,
}: OrganizationJsonLdProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url,
    logo,
    description,
    ...(address && {
      address: {
        "@type": "PostalAddress",
        ...address,
      },
    }),
    ...(contactPoint && {
      contactPoint: {
        "@type": "ContactPoint",
        ...contactPoint,
      },
    }),
    ...(sameAs && { sameAs }),
  };

  return (
    <Script
      id="organization-jsonld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// Article Schema - 用於新聞文章
export function ArticleJsonLd({
  title,
  description,
  url,
  image,
  datePublished,
  dateModified,
  authorName,
  publisherName,
  publisherLogo,
}: ArticleJsonLdProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    url,
    image,
    datePublished,
    dateModified: dateModified || datePublished,
    author: {
      "@type": "Organization",
      name: authorName,
    },
    publisher: {
      "@type": "Organization",
      name: publisherName,
      logo: {
        "@type": "ImageObject",
        url: publisherLogo,
      },
    },
  };

  return (
    <Script
      id="article-jsonld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// Breadcrumb Schema - 用於麵包屑導航
export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <Script
      id="breadcrumb-jsonld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// FAQ Schema - 用於常見問題頁
export function FAQJsonLd({ questions }: FAQJsonLdProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: q.answer,
      },
    })),
  };

  return (
    <Script
      id="faq-jsonld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// LocalBusiness Schema - 用於聯絡頁
export function LocalBusinessJsonLd({
  name,
  description,
  url,
  logo,
  image,
  telephone,
  email,
  address,
  openingHours,
  priceRange,
}: LocalBusinessJsonLdProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": url,
    name,
    description,
    url,
    logo,
    image,
    telephone,
    ...(email && { email }),
    address: {
      "@type": "PostalAddress",
      ...address,
    },
    ...(openingHours && { openingHoursSpecification: openingHours }),
    ...(priceRange && { priceRange }),
  };

  return (
    <Script
      id="localbusiness-jsonld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// 預設的公司 JSON-LD 組件（方便快速使用）
export function DefaultOrganizationJsonLd() {
  const siteUrl = process.env.NEXTAUTH_URL || "https://yoshi3166.com";

  return (
    <OrganizationJsonLd
      name="佑羲人力"
      url={siteUrl}
      logo={`${siteUrl}/logo.png`}
      description="佑羲人力提供專業外籍勞工仲介服務，連接全球人才，驅動您的業務增長。"
      address={{
        streetAddress: "永貞路107號3樓",
        addressLocality: "永和區",
        addressRegion: "新北市",
        addressCountry: "TW",
      }}
      contactPoint={{
        telephone: "+886-2-1234-5678",
        contactType: "customer service",
        email: "info@youshi-hr.com",
      }}
    />
  );
}
