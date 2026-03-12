import Navbar from "@/components/Navbar";
import { Shield, Key, Lock, Flame, Server, Eye } from "lucide-react";

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main>
        <section className="container">
          <div className="about-hero">
            <div className="hero-badge">
              <span className="hero-badge-dot" />
              Zero Knowledge · Open Source Crypto
            </div>
            <h1 className="hero-title">
              How <span className="gradient-text">PasteVault</span> Works
            </h1>
            <p className="hero-subtitle">
              A deep dive into our encryption model and why the server can never read your data.
            </p>
          </div>

          <div className="about-section">
            <h2>The Encryption Model</h2>
            <p>
              PasteVault uses <strong>client-side AES-256-GCM encryption</strong> via your browser&apos;s built-in
              Web Crypto API. This means encryption and decryption happen <em>entirely on your device</em>.
              Our server only ever stores ciphertext — random-looking bytes with no meaningful information.
            </p>

            <div className="step-list">
              {[
                {
                  icon: <Key size={16} />,
                  n: "01",
                  title: "Key Generation",
                  desc: "A 256-bit AES key is randomly generated in your browser using crypto.subtle.generateKey(). This key never leaves your browser — it's never sent over the network.",
                },
                {
                  n: "02",
                  title: "Encryption",
                  desc: "Your paste content is encrypted with AES-256-GCM using a random 96-bit IV (initialization vector). The output is base64-encoded ciphertext + IV.",
                },
                {
                  n: "03",
                  title: "Storage",
                  desc: "Only the ciphertext and IV are sent to PasteVault's server. The server stores these in Redis with your chosen TTL using SETEX. We cannot decrypt this — ever.",
                },
                {
                  n: "04",
                  title: "Sharing",
                  desc: "Your share link looks like: pastevault.app/abc123#key=BASE64_KEY. The part after '#' is the URL fragment — browsers never include it in HTTP requests.",
                },
                {
                  n: "05",
                  title: "Decryption",
                  desc: "When someone opens the link, their browser reads the key from the fragment, fetches the ciphertext from the server, and decrypts locally. The server never sees the key.",
                },
              ].map((s) => (
                <div key={s.n} className="step-item">
                  <div className="step-number">{s.n}</div>
                  <div className="step-content">
                    <h3>{s.title}</h3>
                    <p>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <h2>Password Protection</h2>
            <p>
              When you enable password protection, PasteVault uses <strong>PBKDF2</strong> (Password-Based Key
              Derivation Function 2) with SHA-256 and 310,000 iterations to derive an AES key from your password
              and a random salt. The salt is stored server-side; the password is never transmitted.
            </p>
            <p>
              This means even if someone intercepts the ciphertext, they would need to brute-force your
              password through PBKDF2 — which at 310,000 iterations makes each guess computationally expensive.
            </p>

            <h2>Burn After Read</h2>
            <p>
              When view-once mode is enabled, the server atomically marks the paste as &quot;burned&quot; and deletes
              it from Redis on the very first read. We use a burn flag with a 24-hour TTL to prevent
              race-condition attacks where two requests arrive simultaneously.
            </p>

            <h2>What PasteVault Cannot Do</h2>
            <div className="features-grid" style={{ marginTop: 20 }}>
              {[
                {
                  icon: <Eye size={20} />,
                  title: "Cannot read your pastes",
                  desc: "We only store ciphertext. Without the key (which is in your URL fragment), it's computationally infeasible to decrypt.",
                },
                {
                  icon: <Server size={20} />,
                  title: "Cannot intercept the key",
                  desc: "URL fragments are not sent in HTTP requests per the HTTP spec. Your browser keeps them local.",
                },
                {
                  icon: <Shield size={20} />,
                  title: "Cannot fake the key",
                  desc: "AES-GCM includes authentication — if the ciphertext or key is tampered with, decryption fails with an error.",
                },
              ].map((f) => (
                <div key={f.title} className="feature-card">
                  <div className="feature-icon">{f.icon}</div>
                  <h3 className="feature-title">{f.title}</h3>
                  <p className="feature-desc">{f.desc}</p>
                </div>
              ))}
            </div>

            <h2>Verify It Yourself</h2>
            <p>
              Open your browser&apos;s DevTools (F12) while creating or viewing a paste. Go to the Network
              tab. You&apos;ll see that the POST request to <code>/api/paste</code> only contains ciphertext —
              no plaintext, no key, nothing readable. The GET request for viewing also only returns ciphertext.
              All decryption is visible in the Sources tab.
            </p>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <span className="footer-brand">🔐 PasteVault</span>
          <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
            Your data, your keys, always.
          </span>
        </div>
      </footer>
    </>
  );
}
