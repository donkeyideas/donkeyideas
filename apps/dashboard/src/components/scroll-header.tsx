'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function ScrollHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen]);

  return (
    <>
      <nav className="fixed top-0 w-full z-50 px-4 sm:px-6 lg:px-8 pt-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          {/* Left Card - Logo + Navigation */}
          <div
            className={`flex items-center gap-4 md:gap-8 px-4 md:px-6 h-14 rounded-full border transition-all duration-500 ease-out ${
              isScrolled
                ? 'bg-white/10 backdrop-blur-xl shadow-xl border-white/10'
                : 'bg-transparent border-transparent'
            }`}
          >
            <Link
              href="/"
              className="text-lg md:text-xl font-semibold tracking-tight hover:opacity-80 transition-opacity"
            >
              <span className="font-light">DONKEY</span> IDEAS
            </Link>
            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-6">
              <Link href="/ventures" className="text-sm text-white/80 hover:text-white transition-colors">
                Ventures
              </Link>
              <Link href="/services" className="text-sm text-white/80 hover:text-white transition-colors">
                Services
              </Link>
              <Link href="/process" className="text-sm text-white/80 hover:text-white transition-colors">
                Approach
              </Link>
              <Link href="/blog" className="text-sm text-white/80 hover:text-white transition-colors">
                Blog
              </Link>
              <Link href="/about" className="text-sm text-white/80 hover:text-white transition-colors">
                About
              </Link>
            </div>
          </div>

          {/* Right Card - Sign in + Talk to us (desktop) */}
          <div
            className={`hidden md:flex items-center gap-4 px-6 h-14 rounded-full border transition-all duration-500 ease-out ${
              isScrolled
                ? 'bg-white/10 backdrop-blur-xl shadow-xl border-white/10'
                : 'bg-transparent border-transparent'
            }`}
          >
            <Link href="/login" className="text-sm text-white/90 hover:text-white transition-colors">
              Sign in
            </Link>
            <Link
              href="/contact"
              className="px-5 py-2 bg-white text-slate-900 rounded-full hover:bg-white/90 transition-all text-sm font-medium"
            >
              Talk to us
            </Link>
          </div>

          {/* Mobile hamburger button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`md:hidden flex items-center justify-center w-10 h-10 rounded-full border transition-all duration-500 ease-out ${
              isScrolled
                ? 'bg-white/10 backdrop-blur-xl border-white/10'
                : 'bg-transparent border-transparent'
            }`}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/95 backdrop-blur-xl"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Menu content */}
          <div className="relative z-10 flex flex-col items-center justify-center h-full gap-6 px-8">
            <Link
              href="/ventures"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-2xl font-light text-white/90 hover:text-white transition-colors"
            >
              Ventures
            </Link>
            <Link
              href="/services"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-2xl font-light text-white/90 hover:text-white transition-colors"
            >
              Services
            </Link>
            <Link
              href="/process"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-2xl font-light text-white/90 hover:text-white transition-colors"
            >
              Approach
            </Link>
            <Link
              href="/blog"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-2xl font-light text-white/90 hover:text-white transition-colors"
            >
              Blog
            </Link>
            <Link
              href="/about"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-2xl font-light text-white/90 hover:text-white transition-colors"
            >
              About
            </Link>
            <div className="w-12 h-px bg-white/20 my-2" />
            <Link
              href="/login"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-lg text-white/70 hover:text-white transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/contact"
              onClick={() => setIsMobileMenuOpen(false)}
              className="px-8 py-3 bg-white text-slate-900 rounded-full hover:bg-white/90 transition-all text-base font-medium"
            >
              Talk to us
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
