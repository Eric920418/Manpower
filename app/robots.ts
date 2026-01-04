import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXTAUTH_URL || "https://yoshi3166.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/api/",
          "/resume/request/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
