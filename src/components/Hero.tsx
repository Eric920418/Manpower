"use client";
import Link from "next/link";
import Image from "next/image";

interface HeroProps {
  badge: string;
  title: string;
  description: string;
  primaryCTA: {
    text: string;
    link: string;
  };
  secondaryCTA: {
    text: string;
    link: string;
  };
  image: string;
}

export default function Hero({
  badge,
  title,
  description,
  primaryCTA,
  secondaryCTA,
  image,
}: HeroProps) {
  return (
    <section className="relative bg-transparent pt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16 min-h-[calc(100vh-5rem)] py-16 lg:py-24">
          {/* 文字內容 */}
          <div className="flex flex-col items-start text-left">
            <span className="mb-4 rounded-full bg-brand-primary/10 px-4 py-1 text-sm font-medium text-brand-secondary border border-brand-primary/20">
              {badge}
            </span>
            <h1 className="text-4xl font-black leading-tight tracking-tight text-text-primary md:text-5xl lg:text-6xl">
              {title}
            </h1>
            <p className="mt-6 max-w-xl text-lg text-text-secondary">
              {description}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href={primaryCTA.link}
                className="inline-flex h-12 items-center justify-center rounded-md bg-brand-primary px-8 text-base font-bold text-text-on-brand shadow-lg transition-all hover:scale-105 hover:bg-brand-accent"
              >
                {primaryCTA.text}
              </Link>
              <Link
                href={secondaryCTA.link}
                className="inline-flex h-12 items-center justify-center rounded-md bg-transparent px-8 text-base font-bold text-brand-secondary shadow-lg ring-2 ring-brand-secondary transition-all hover:scale-105 hover:bg-brand-secondary/5"
              >
                {secondaryCTA.text}
              </Link>
            </div>
          </div>

          {/* 圖片 */}
          <div className="relative h-full min-h-[400px] w-full">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-brand-primary/20 to-brand-accent/20"></div>
            <Image
              src={image}
              alt="Hero Image"
              fill
              className="relative rounded-xl object-cover shadow-2xl border-4 border-brand-primary/20"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}
