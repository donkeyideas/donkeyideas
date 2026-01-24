'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function ScrollHeader() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className="fixed top-0 w-full z-50 px-8 pt-4">
      <div className="max-w-[1400px] mx-auto flex items-center justify-between">
        {/* Left Card - Logo + Navigation */}
        <div
          className={`flex items-center gap-8 px-6 h-14 transition-all duration-500 ease-out ${
            isScrolled
              ? 'bg-white/10 backdrop-blur-xl shadow-xl rounded-full border border-white/10'
              : 'bg-transparent'
          }`}
        >
          <Link
            href="/"
            className="text-xl font-semibold tracking-tight hover:opacity-80 transition-opacity"
          >
            <span className="font-light">DONKEY</span> IDEAS
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/ventures"
              className="text-sm text-white/80 hover:text-white transition-colors"
            >
              Ventures
            </Link>
            <Link
              href="/services"
              className="text-sm text-white/80 hover:text-white transition-colors"
            >
              Services
            </Link>
            <Link
              href="/process"
              className="text-sm text-white/80 hover:text-white transition-colors"
            >
              Approach
            </Link>
            <Link
              href="/about"
              className="text-sm text-white/80 hover:text-white transition-colors"
            >
              About
            </Link>
          </div>
        </div>

        {/* Right Card - Sign in + Talk to us */}
        <div
          className={`flex items-center gap-4 px-6 h-14 transition-all duration-500 ease-out ${
            isScrolled
              ? 'bg-white/10 backdrop-blur-xl shadow-xl rounded-full border border-white/10'
              : 'bg-transparent'
          }`}
        >
          <Link
            href="/login"
            className={`text-sm transition-all ${
              isScrolled
                ? 'text-white/90 hover:text-white'
                : 'px-4 py-2 border border-white/20 rounded-full text-white/90 hover:text-white hover:border-white/40'
            }`}
          >
            Sign in
          </Link>
          <Link
            href="/contact"
            className="px-5 py-2 bg-white text-slate-900 rounded-full hover:bg-white/90 transition-all text-sm font-medium"
          >
            Talk to us
          </Link>
        </div>
      </div>
    </nav>
  );
}
