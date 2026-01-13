"use client";

import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";
import { ReactNode } from "react";

interface ReCaptchaProviderProps {
  children: ReactNode;
}

export default function ReCaptchaProvider({ children }: ReCaptchaProviderProps) {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  // 如果沒有設定 reCAPTCHA key，直接渲染子元素
  if (!siteKey) {
    return <>{children}</>;
  }

  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={siteKey}
      language="zh-TW"
      scriptProps={{
        async: true,
        defer: true,
      }}
    >
      {children}
    </GoogleReCaptchaProvider>
  );
}
