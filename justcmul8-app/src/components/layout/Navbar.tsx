"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { LayoutDashboard, LogIn, UserPlus, Menu, X, Hexagon } from "lucide-react";
import { GlitchText } from "@/components/ui/GlitchText";

const navLinks = [
  { label: "Features", href: "/#features" },
  { label: "Engine", href: "/#engine" },
  { label: "Security", href: "/#security" },
  { label: "Pricing", href: "/#pricing" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const isLanding = pathname === "/";

  React.useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <>
      {/* Background layer completely outside motion.nav to perfectly preserve native backdrop-filter behavior */}
      <div 
        className={`fixed top-0 left-0 right-0 h-16 z-40 transition-all duration-300 pointer-events-none ${
          scrolled ? "opacity-100 glass-panel border-b border-b-[rgba(0,242,255,0.15)]" : "opacity-0 bg-transparent"
        }`} 
        style={{ borderRadius: 0, borderLeft: "none", borderRight: "none", borderTop: "none" }}
      />

      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 z-50 pointer-events-auto"
      >
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative w-8 h-8 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12">
              <Image
                src="/logo.png"
                alt="JustCmul8 Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <span
              className="font-display font-700 text-lg tracking-widest text-neon-cyan"
              style={{ fontFamily: "var(--font-display)" }}
            >
              <GlitchText intensity="normal">JUSTCMUL8</GlitchText>
            </span>
          </Link>

          {/* Desktop Nav */}
          {isLanding && (
            <div className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-sm font-body text-secondary hover:text-neon-cyan transition-colors duration-200 relative group"
                  style={{ fontFamily: "var(--font-body)", color: "var(--text-secondary)" }}
                >
                  {link.label}
                  <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-neon-cyan group-hover:w-full transition-all duration-300" />
                </a>
              ))}
            </div>
          )}

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="btn-cyber-ghost" style={{ padding: "8px 20px", fontSize: "0.8rem" }}>
              <LogIn size={14} />
              Login
            </Link>
            <Link href="/signup" className="btn-cyber-primary animate-pulse-glow" style={{ padding: "8px 20px", fontSize: "0.8rem" }}>
              <UserPlus size={14} />
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden text-neon-cyan p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden glass-panel-heavy border-t border-t-[rgba(0,242,255,0.1)] px-4 py-4 space-y-3"
        >
          {isLanding &&
            navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block text-sm"
                style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}
              >
                {link.label}
              </a>
            ))}
          <div className="flex gap-3 pt-2">
            <Link href="/login" className="btn-cyber-ghost flex-1" style={{ padding: "8px 12px", fontSize: "0.8rem" }}>
              Login
            </Link>
            <Link href="/signup" className="btn-cyber-primary flex-1" style={{ padding: "8px 12px", fontSize: "0.8rem" }}>
              Get Started
            </Link>
          </div>
        </motion.div>
      )}
    </motion.nav>
    </>
  );
}
