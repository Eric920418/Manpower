"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

interface NavigationItem {
  label: string;
  link: string;
}

interface HeaderProps {
  logo: {
    icon: string;
    text: string;
  };
  navigation: NavigationItem[];
  contactButton: {
    text: string;
    link: string;
  };
}

export default function Header({ navigation, contactButton }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 z-50 w-full bg-brand-secondary">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logow.png"
              alt="佑羲人力"
              width={48}
              height={48}
              className="h-12 w-12 object-contain"
              priority
            />
            <span className="text-xl font-bold tracking-tight text-text-on-brand">
              佑羲人力
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-6 md:flex">
            {navigation.map((item, index) => (
              <Link
                key={index}
                href={item.link}
                className="text-sm font-medium text-text-on-brand/90 transition-colors hover:text-brand-primary"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Contact Button & Mobile Menu Toggle */}
          <div className="flex items-center gap-4">
            <Link
              href="/contact"
              className="hidden items-center justify-center rounded-full border-2 border-brand-primary bg-brand-primary px-5 py-2 text-sm font-medium text-text-on-brand transition-all hover:bg-brand-primary/90 hover:scale-105 sm:flex"
            >
              {contactButton.text}
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-md text-text-on-brand"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 bg-brand-secondary/95 backdrop-blur-sm rounded-lg mt-2 shadow-lg border border-brand-primary/20">
            <nav className="flex flex-col gap-2">
              {navigation.map((item, index) => (
                <Link
                  key={index}
                  href={item.link}
                  className="px-4 py-2 text-sm font-medium text-text-on-brand/90 hover:bg-brand-primary/20 hover:text-brand-primary transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/contact"
                className="mx-4 mt-2 text-center rounded-full border-2 border-brand-primary bg-brand-primary px-5 py-2 text-sm font-medium text-text-on-brand hover:bg-brand-primary/90"
                onClick={() => setMobileMenuOpen(false)}
              >
                {contactButton.text}
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
