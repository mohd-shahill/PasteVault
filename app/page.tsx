import Navbar from "@/components/Navbar";
import PasteEditor from "@/components/PasteEditor";
import { Lock, Flame, Clock, Shield, Eye, Code } from "lucide-react";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="container">
          <div className="hero">
            <div className="hero-badge">
              <span className="hero-badge-dot" />
              End-to-End Encrypted · Zero Knowledge
            </div>

            <h1 className="hero-title">
              Share secrets,{" "}
              <span className="gradient-text">not access.</span>
            </h1>

            <p className="hero-subtitle">
              PasteVault encrypts your code and notes directly in your browser.
              The server never sees your content — only you control the key.
            </p>

            {/* Feature pills */}
            <div className="hero-features">
              {[
                { icon: <Lock size={13} />, label: "AES-256-GCM Encryption" },
                { icon: <Eye size={13} />, label: "Key stays in URL fragment" },
                { icon: <Flame size={13} />, label: "Burn After Read" },
                { icon: <Clock size={13} />, label: "Auto-Expiry Timers" },
                { icon: <Shield size={13} />, label: "Password Protection" },
                { icon: <Code size={13} />, label: "40+ Languages" },
              ].map((f) => (
                <div key={f.label} className="hero-feature-pill">
                  {f.icon}
                  {f.label}
                </div>
              ))}
            </div>
          </div>

          {/* Editor */}
          <div className="page-content" style={{ paddingTop: 0 }}>
            <PasteEditor />
          </div>
        </section>

        {/* Features section */}
        <section style={{ borderTop: "1px solid var(--border)", padding: "64px 0" }}>
          <div className="container">
            <h2 style={{ textAlign: "center", fontSize: "1.8rem", fontWeight: 700, marginBottom: 8 }}>
              Why PasteVault?
            </h2>
            <p style={{ textAlign: "center", color: "var(--text-secondary)", marginBottom: 40 }}>
              Built with privacy as the first principle, not an afterthought.
            </p>

            <div className="features-grid">
              {[
                {
                  icon: <Lock size={22} />,
                  title: "Zero-Knowledge Architecture",
                  desc: "Your encryption key is embedded in the URL fragment (#). Fragments are never sent to our servers — we physically cannot read your pastes.",
                },
                {
                  icon: <Flame size={22} />,
                  title: "Burn After Read",
                  desc: "Enable view-once mode and the paste is atomically deleted from our servers after the first read. No traces remain.",
                },
                {
                  icon: <Clock size={22} />,
                  title: "Auto-Expiring Links",
                  desc: "Set pastes to expire in 1 hour, 1 day, 7 days, or 30 days. Redis TTL ensures clean deletion — no lingering data.",
                },
                {
                  icon: <Shield size={22} />,
                  title: "Password + Key Encryption",
                  desc: "Add a password for a double layer of security. Derived via PBKDF2 (310,000 iterations) — brute-force resistant.",
                },
                {
                  icon: <Code size={22} />,
                  title: "Syntax Highlighting",
                  desc: "Beautiful syntax highlighting for 40+ languages with a dark theme. Share code in style, privately.",
                },
                {
                  icon: <Eye size={22} />,
                  title: "Open & Auditable",
                  desc: "All encryption happens in open source Web Crypto API calls. You can inspect every line in DevTools to verify.",
                },
              ].map((f) => (
                <div key={f.title} className="feature-card">
                  <div className="feature-icon">{f.icon}</div>
                  <h3 className="feature-title">{f.title}</h3>
                  <p className="feature-desc">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <span className="footer-brand">🔐 PasteVault</span>
          <div className="footer-links">
            <a href="/about" className="footer-link">How it Works</a>
            <a href="https://github.com/YOUR_USERNAME/pastevault" className="footer-link" target="_blank" rel="noopener noreferrer">GitHub</a>
          </div>
          <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
            Your data, your keys, always.
          </span>
        </div>
      </footer>
    </>
  );
}
