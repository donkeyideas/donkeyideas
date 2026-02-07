'use client';

import { useState } from 'react';
import Link from 'next/link';
import ScrollHeader from '@/components/scroll-header';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    message: '',
    hearAbout: '',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        // Reset form
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          company: '',
          message: '',
          hearAbout: '',
        });
      } else {
        setStatus('error');
        setErrorMessage(data.error || 'Something went wrong');
      }
    } catch (error) {
      setStatus('error');
      setErrorMessage('Failed to submit form. Please try again.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Navigation */}
      <ScrollHeader />

      {/* Hero Section - Giga Contact Style */}
      <section className="pt-32 pb-24 px-8">
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-light leading-tight mb-8">
            AI-powered venture building
            <br />
            for ambitious founders
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto leading-relaxed mb-12">
            From hyper-growth startups to established enterprises, Donkey Ideas powers intelligent ventures at scale.
          </p>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="py-16 px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-12">
            <blockquote className="text-xl md:text-2xl text-slate-300 leading-relaxed mb-8 font-light">
              "At our company, we operate at massive scale across services, platforms, and markets. Donkey Ideas leveraged their AI-powered approach to deliver measurable improvements, including faster time-to-market, better product-market fit, and more efficient development workflows. As we continue to grow and serve millions of customers globally, partnerships like this are critical to delivering better outcomes and building ventures that last."
            </blockquote>
            <div className="flex items-center gap-4">
              <div>
                <div className="text-lg font-medium text-white">Portfolio Founder</div>
                <div className="text-sm text-slate-400">CEO, Tech Startup</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How We Can Help Section */}
      <section className="py-16 px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-light text-center mb-12">How We Can Help</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-8">
              <h3 className="text-lg font-medium mb-3 text-white">Venture Building</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                We partner with founders to take ideas from concept to production. Our team handles product strategy, technical architecture, and go-to-market execution so you can focus on what matters most: building a business that lasts.
              </p>
            </div>
            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-8">
              <h3 className="text-lg font-medium mb-3 text-white">Strategic Consulting</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Whether you need help with growth strategy, financial modeling, or operational efficiency, our consulting team brings real-world experience scaling ventures across industries. We work alongside your team to deliver measurable results.
              </p>
            </div>
            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-8">
              <h3 className="text-lg font-medium mb-3 text-white">AI & Technology Advisory</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                From evaluating AI integration opportunities to designing data pipelines and automation workflows, we help businesses leverage the right technology at the right time. We cut through the hype and focus on practical, revenue-driving implementations.
              </p>
            </div>
            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-xl p-8">
              <h3 className="text-lg font-medium mb-3 text-white">Enterprise Partnerships</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                We collaborate with established companies looking to innovate through venture building. Whether it is launching internal startups, building new product lines, or exploring adjacent markets, our venture studio approach brings startup speed to enterprise ambitions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="py-32 px-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-light mb-4">Let's build something together</h2>
            <p className="text-lg text-slate-400">
              Tell us about your idea, consulting needs, or partnership opportunity and we'll get back to you within 24 hours.
            </p>
          </div>

          {status === 'success' && (
            <div className="mb-8 p-6 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-green-400 text-center text-lg">
                Thank you! We&apos;ll get back to you within 24 hours.
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="mb-8 p-6 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-center">
                {errorMessage}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium mb-2 text-slate-300">
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="John"
                  required
                  disabled={status === 'loading'}
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium mb-2 text-slate-300">
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="Doe"
                  required
                  disabled={status === 'loading'}
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2 text-slate-300">
                Work Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="john@company.com"
                required
                disabled={status === 'loading'}
              />
            </div>

            <div>
              <label htmlFor="company" className="block text-sm font-medium mb-2 text-slate-300">
                Company
              </label>
              <input
                type="text"
                id="company"
                name="company"
                value={formData.company}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Your Company"
                disabled={status === 'loading'}
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium mb-2 text-slate-300">
                Tell us about your idea
              </label>
              <textarea
                id="message"
                name="message"
                rows={6}
                value={formData.message}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                placeholder="I'm looking to build..."
                required
                disabled={status === 'loading'}
              />
            </div>

            <div>
              <label htmlFor="hearAbout" className="block text-sm font-medium mb-2 text-slate-300">
                How did you hear about us?
              </label>
              <select
                id="hearAbout"
                name="hearAbout"
                value={formData.hearAbout}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors [&>option]:bg-slate-800"
                disabled={status === 'loading'}
              >
                <option value="">Select an option</option>
                <option value="search">Search Engine</option>
                <option value="social">Social Media</option>
                <option value="referral">Referral</option>
                <option value="event">Event/Conference</option>
                <option value="other">Other</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full px-8 py-4 bg-white text-slate-900 rounded-full hover:bg-white/90 transition-all text-base font-medium shadow-xl hover:shadow-2xl hover:scale-105 transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {status === 'loading' ? 'Sending...' : 'Send Message'}
            </button>

            <p className="text-sm text-slate-500 text-center">
              By submitting this form, you agree to our{' '}
              <Link href="/privacy" className="text-blue-400 hover:text-blue-300">
                Privacy Policy
              </Link>
            </p>
          </form>
        </div>
      </section>

      {/* Alternative Contact Methods */}
      <section className="py-16 px-8 border-t border-slate-800">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/10 mb-4">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium mb-2 text-white">Email</h3>
              <a href="mailto:info@donkeyideas.com" className="text-slate-400 hover:text-blue-400 transition-colors">
                info@donkeyideas.com
              </a>
            </div>

            <div>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-500/10 mb-4">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium mb-2 text-white">Schedule a Call</h3>
              <a href="https://calendar.app.google/uAubRuERACDqXYTU6" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-purple-400 transition-colors">
                Book a meeting
              </a>
            </div>

            <div>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/10 mb-4">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium mb-2 text-white">Location</h3>
              <p className="text-slate-400">New York & Miami</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-8 border-t border-slate-800">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-xl font-semibold tracking-tight">
              <span className="font-light">DONKEY</span> IDEAS
            </div>
            <div className="flex flex-wrap justify-center gap-8 text-sm text-slate-400">
              <Link href="/ventures" className="hover:text-white transition-colors">
                Ventures
              </Link>
              <Link href="/services" className="hover:text-white transition-colors">
                Services
              </Link>
              <Link href="/process" className="hover:text-white transition-colors">
                Approach
              </Link>
              <Link href="/about" className="hover:text-white transition-colors">
                About
              </Link>
              <Link href="/login" className="hover:text-white transition-colors">
                Login
              </Link>
            </div>
            <div className="text-slate-500 text-sm">
              © {new Date().getFullYear()} Donkey Ideas
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
