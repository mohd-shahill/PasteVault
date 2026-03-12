"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import {
  importKey,
  decryptText,
  deriveKeyFromPassword,
} from "@/lib/crypto";
import {
  Flame,
  Copy,
  CheckCheck,
  Download,
  Plus,
  Lock,
  Clock,
  Shield,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

interface PasteData {
  id: string;
  ciphertext: string;
  iv: string;
  language: string;
  title?: string;
  viewOnce: boolean;
  passwordProtected: boolean;
  salt?: string;
  createdAt: number;
  ttl?: number;
  burned?: boolean;
  expiry?: number | null;
}

type ViewState =
  | "loading"
  | "password-required"
  | "decrypting"
  | "success"
  | "burned"
  | "not-found"
  | "error";

function formatTTL(seconds: number): string {
  if (seconds <= 0) return "Expired";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m remaining`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h remaining`;
  return `${Math.floor(seconds / 86400)}d remaining`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ViewPastePage() {
  const params = useParams();
  const pasteId = params?.id as string;

  const [state, setState] = useState<ViewState>("loading");
  const [pasteData, setPasteData] = useState<PasteData | null>(null);
  const [decryptedContent, setDecryptedContent] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [copied, setCopied] = useState(false);
  const [highlightedHtml, setHighlightedHtml] = useState("");

  // Fetch paste on load
  useEffect(() => {
    if (!pasteId) return;
    fetchPaste();
  }, [pasteId]);

  const fetchPaste = async () => {
    setState("loading");
    try {
      const res = await fetch(`/api/paste/${pasteId}`);
      if (res.status === 404) {
        setState("not-found");
        return;
      }
      if (res.status === 410) {
        setState("burned");
        return;
      }
      if (!res.ok) {
        const data = await res.json();
        setErrorMessage(data.error || "Failed to load paste.");
        setState("error");
        return;
      }

      const data: PasteData = await res.json();
      setPasteData(data);

      // If burned on this request (view-once first view)
      if (data.burned) {
        // Still decrypt and show, then show burn notice
      }

      if (data.passwordProtected) {
        setState("password-required");
      } else {
        // Get key from URL fragment
        const hash = window.location.hash;
        const match = hash.match(/key=([^&]+)/);
        if (!match) {
          setErrorMessage("Decryption key not found in URL. The link may be incomplete.");
          setState("error");
          return;
        }
        await decryptAndShow(data, match[1]);
      }
    } catch (err) {
      setErrorMessage("Network error. Please try again.");
      setState("error");
    }
  };

  const decryptAndShow = async (data: PasteData, keyBase64: string) => {
    setState("decrypting");
    try {
      const key = await importKey(keyBase64);
      const plaintext = await decryptText(data.ciphertext, data.iv, key);
      setDecryptedContent(plaintext);
      await applyHighlighting(plaintext, data.language);
      setState("success");
    } catch {
      setErrorMessage("Decryption failed. The link may be corrupted or tampered with.");
      setState("error");
    }
  };

  const handlePasswordSubmit = async () => {
    if (!pasteData || !password) return;
    setPasswordError("");
    setState("decrypting");
    try {
      const key = await deriveKeyFromPassword(password, pasteData.salt!);
      const plaintext = await decryptText(pasteData.ciphertext, pasteData.iv, key);
      setDecryptedContent(plaintext);
      await applyHighlighting(plaintext, pasteData.language);
      setState("success");
    } catch {
      setPasswordError("Wrong password or corrupted data. Please try again.");
      setState("password-required");
    }
  };

  const applyHighlighting = async (code: string, lang: string) => {
    try {
      // Use shiki for highlighting
      const { codeToHtml } = await import("shiki");
      const html = await codeToHtml(code, {
        lang: lang === "plaintext" ? "text" : lang,
        theme: "github-dark",
      });
      setHighlightedHtml(html);
    } catch {
      // Fall back to plain display
      setHighlightedHtml("");
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(decryptedContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleDownload = () => {
    const ext = pasteData?.language === "plaintext" ? "txt" : pasteData?.language || "txt";
    const blob = new Blob([decryptedContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${pasteData?.title || "paste"}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── States ───

  if (state === "loading" || state === "decrypting") {
    return (
      <>
        <Navbar />
        <div className="container">
          <div className="decrypting-state">
            <div className="spinner" />
            <span>{state === "loading" ? "Loading paste..." : "Decrypting content..."}</span>
            {state === "decrypting" && (
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                Decryption happens entirely in your browser
              </span>
            )}
          </div>
        </div>
      </>
    );
  }

  if (state === "burned") {
    return (
      <>
        <Navbar />
        <div className="container">
          <div className="ghost-card">
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔥</div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 12 }}>
              Paste Burned
            </h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: 28, lineHeight: 1.7 }}>
              This was a burn-after-read paste. It has already been viewed and permanently deleted from our servers.
            </p>
            <Link href="/" className="btn btn-primary" style={{ textDecoration: "none", display: "inline-flex" }}>
              <Plus size={16} /> Create New Paste
            </Link>
          </div>
        </div>
      </>
    );
  }

  if (state === "not-found") {
    return (
      <>
        <Navbar />
        <div className="container">
          <div className="ghost-card">
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 12 }}>
              Paste Not Found
            </h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: 28, lineHeight: 1.7 }}>
              This paste doesn&apos;t exist, has expired, or has already been burned.
            </p>
            <Link href="/" className="btn btn-primary" style={{ textDecoration: "none", display: "inline-flex" }}>
              <Plus size={16} /> Create New Paste
            </Link>
          </div>
        </div>
      </>
    );
  }

  if (state === "error") {
    return (
      <>
        <Navbar />
        <div className="container">
          <div className="ghost-card">
            <div className="error-icon" style={{ margin: "0 auto 16px" }}>
              <AlertCircle size={32} />
            </div>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: 12 }}>
              Decryption Error
            </h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: 28, lineHeight: 1.7 }}>
              {errorMessage}
            </p>
            <Link href="/" className="btn btn-primary" style={{ textDecoration: "none", display: "inline-flex" }}>
              <Plus size={16} /> Create New Paste
            </Link>
          </div>
        </div>
      </>
    );
  }

  if (state === "password-required") {
    return (
      <>
        <Navbar />
        <div className="container">
          <div className="password-prompt">
            <div style={{
              width: 56, height: 56, background: "rgba(124,58,237,0.12)",
              borderRadius: "var(--radius-md)", display: "flex", alignItems: "center",
              justifyContent: "center", margin: "0 auto 20px", color: "var(--accent-violet)"
            }}>
              <Lock size={26} />
            </div>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: 8 }}>
              Password Required
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.6 }}>
              This paste is protected. Enter the password to decrypt and view its contents.
            </p>
            <input
              className="input-field"
              type="password"
              placeholder="Enter password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
              autoFocus
            />
            {passwordError && (
              <p style={{ color: "var(--accent-red)", fontSize: "0.82rem", marginBottom: 12 }}>
                ⚠ {passwordError}
              </p>
            )}
            <button
              className="btn btn-primary"
              onClick={handlePasswordSubmit}
              disabled={!password}
              id="decrypt-with-password-btn"
            >
              <Lock size={15} /> Decrypt Paste
            </button>
          </div>
        </div>
      </>
    );
  }

  // ─── Success State ───
  return (
    <>
      <Navbar />
      <main className="page-content">
        <div className="container">
          <div className="viewer-container">
            {/* Burn Notice Banner */}
            {pasteData?.burned && (
              <div className="burn-notice">
                <div className="burn-notice-icon">
                  <Flame size={20} />
                </div>
                <div className="burn-notice-content">
                  <h3>🔥 This paste has been burned</h3>
                  <p>
                    You just viewed this paste for the first and last time. It has been permanently deleted from our servers. Save its contents now if needed.
                  </p>
                </div>
              </div>
            )}

            {/* Header */}
            <div className="viewer-header">
              <div>
                {pasteData?.title && (
                  <h1 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: 12 }}>
                    {pasteData.title}
                  </h1>
                )}
                <div className="viewer-meta">
                  {pasteData?.language && pasteData.language !== "plaintext" && (
                    <span className="meta-badge language">{pasteData.language}</span>
                  )}
                  {pasteData?.viewOnce && !pasteData.burned && (
                    <span className="meta-badge view-once">
                      <Flame size={11} /> Burn After Read
                    </span>
                  )}
                  {pasteData?.ttl && pasteData.ttl > 0 && (
                    <span className="meta-badge ttl">
                      <Clock size={11} /> {formatTTL(pasteData.ttl)}
                    </span>
                  )}
                  <span className="meta-badge encrypted">
                    <Shield size={11} /> AES-256-GCM
                  </span>
                  {pasteData?.createdAt && (
                    <span style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                      {formatDate(pasteData.createdAt)}
                    </span>
                  )}
                </div>
              </div>

              <div className="viewer-actions">
                <button
                  className="btn btn-secondary"
                  onClick={handleCopy}
                  id="copy-content-btn"
                  style={{ fontSize: "0.82rem", padding: "8px 16px" }}
                >
                  {copied ? <><CheckCheck size={14} /> Copied!</> : <><Copy size={14} /> Copy</>}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={handleDownload}
                  id="download-btn"
                  style={{ fontSize: "0.82rem", padding: "8px 16px" }}
                >
                  <Download size={14} /> Download
                </button>
                <Link
                  href="/"
                  className="btn btn-secondary"
                  style={{ fontSize: "0.82rem", padding: "8px 16px", textDecoration: "none" }}
                >
                  <Plus size={14} /> New
                </Link>
              </div>
            </div>

            {/* Code Block */}
            <div className="code-block">
              <div className="code-block-header">
                <span className="code-block-lang">{pasteData?.language || "plaintext"}</span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  {decryptedContent.split("\n").length} lines · {decryptedContent.length.toLocaleString()} chars
                </span>
              </div>
              <div className="code-content">
                {highlightedHtml ? (
                  <div dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
                ) : (
                  <pre>{decryptedContent}</pre>
                )}
              </div>
            </div>

            {/* Encryption proof */}
            <div style={{
              marginTop: 20,
              padding: "12px 20px",
              background: "rgba(16,185,129,0.04)",
              border: "1px solid rgba(16,185,129,0.1)",
              borderRadius: "var(--radius-sm)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: "0.78rem",
              color: "var(--text-muted)"
            }}>
              <Shield size={13} style={{ color: "var(--accent-green)", flexShrink: 0 }} />
              This content was decrypted entirely in your browser. Open DevTools → Network to verify nothing was sent to PasteVault servers.
            </div>
          </div>
        </div>
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
