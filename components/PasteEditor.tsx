"use client";

import { useState, useRef } from "react";
import { Flame, Lock, Eye, ChevronDown, Shield, Image as ImageIcon, X } from "lucide-react";
import ShareModal from "./ShareModal";
import {
  generateKey,
  exportKey,
  encryptText,
  deriveKeyFromPassword,
  generateSalt,
} from "@/lib/crypto";

const LANGUAGES = [
  "plaintext", "javascript", "typescript", "python", "rust", "go",
  "java", "c", "cpp", "csharp", "php", "ruby", "swift", "kotlin",
  "html", "css", "sql", "json", "yaml", "bash", "markdown", "dockerfile",
];

const EXPIRY_OPTIONS = [
  { label: "1 Hour", value: 3600 },
  { label: "6 Hours", value: 21600 },
  { label: "24 Hours", value: 86400 },
  { label: "7 Days", value: 604800 },
  { label: "30 Days", value: 2592000 },
  { label: "Never", value: 0 },
];

export default function PasteEditor() {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("plaintext");
  const [expiry, setExpiry] = useState(86400); // 24h default
  const [viewOnce, setViewOnce] = useState(false);
  const [passwordProtected, setPasswordProtected] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [error, setError] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [imageData, setImageData] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Track the actual raw size from the user's perspective
  const rawTotalSize = content.length + imageSize;
  const isOverLimit = rawTotalSize > 6 * 1024 * 1024; // 6MB raw limit

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 6 * 1024 * 1024) {
      setError("Image too large (max 6MB limit).");
      return;
    }

    setError(""); // Clear any previous error message

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageData(reader.result as string);
      setImageSize(file.size);
    };
    reader.readAsDataURL(file);
  };


  const handleCreate = async () => {
    if (!content.trim() && !imageData) {
      setError("Please enter some content or upload an image to encrypt.");
      return;
    }
    if (isOverLimit) {
      setError("Total content exceeds the limit.");
      return;
    }
    if (passwordProtected && password.length < 4) {
      setError("Password must be at least 4 characters.");
      return;
    }

    setError("");
    setLoading(true);
    setLoadingText("Encrypting locally...");

    try {
      let key;
      let salt: string | undefined;

      if (passwordProtected && password) {
        salt = await generateSalt();
        key = await deriveKeyFromPassword(password, salt);
      } else {
        key = await generateKey();
      }

      const payloadObj = JSON.stringify({
        text: content,
        image: imageData
      });

      const { ciphertext, iv } = await encryptText(payloadObj, key);
      const exportedKey = await exportKey(key);

      setLoadingText("Uploading to secure vault...");

      const res = await fetch("/api/paste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ciphertext,
          iv,
          language,
          title,
          viewOnce,
          passwordProtected,
          salt,
          expiry: expiry || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create paste");
      }

      const { id } = await res.json();

      // Key goes in URL fragment (#) — never sent to server
      const url = passwordProtected
        ? `${window.location.origin}/${id}` // no key in URL for password-protected
        : `${window.location.origin}/${id}#key=${exportedKey}`;

      setShareUrl(url);
      setShowModal(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleTabKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newContent = content.substring(0, start) + "  " + content.substring(end);
      setContent(newContent);
      setTimeout(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      }, 0);
    }
  };

  const handleNewPaste = () => {
    setContent("");
    setImageData(null);
    setImageSize(0);
    setTitle("");
    setLanguage("plaintext");
    setExpiry(86400);
    setViewOnce(false);
    setPasswordProtected(false);
    setPassword("");
    setShareUrl("");
    setShowModal(false);
  };

  return (
    <>
      <div className="editor-container">
        {/* Editor Card */}
        <div className="editor-card">
          {/* Window chrome header */}
          <div className="editor-header">
            <div className="editor-dots">
              <span className="editor-dot red" />
              <span className="editor-dot yellow" />
              <span className="editor-dot green" />
            </div>
            <input
              className="editor-title-input"
              placeholder="Untitled paste..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              {language}
            </div>
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            className="editor-textarea"
            placeholder={`Paste your code or notes here...\n\nYour content will be encrypted in your browser before being sent.\nThe server never sees your plaintext.`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleTabKey}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            style={{
              paddingBottom: imageData ? "20px" : "20px"
            }}
          />

          {/* Image Preview */}
          {imageData && (
            <div style={{ padding: "0 20px 20px", display: "flex", justifyContent: "center" }}>
              <div style={{ position: "relative", display: "inline-block" }}>
                <img 
                  src={imageData} 
                  alt="Attachment" 
                  style={{ maxHeight: "250px", maxWidth: "100%", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", display: "block", boxShadow: "0 8px 24px rgba(0,0,0,0.2)" }} 
                />
                <button 
                  onClick={() => { setImageData(null); setImageSize(0); }}
                  style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    background: "rgba(0,0,0,0.65)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "50%",
                    color: "white",
                    width: "26px",
                    height: "26px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    backdropFilter: "blur(4px)"
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Footer controls */}
          <div className="editor-footer" style={{ display: "flex", justifyContent: "space-between", padding: "12px 20px", borderTop: "1px solid var(--border)", background: "rgba(255,255,255,0.015)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
               <span style={{ color: isOverLimit ? "var(--accent-red)" : "var(--text-muted)", fontSize: "0.8rem" }}>
                Size: {(rawTotalSize / 1024 / 1024).toFixed(2)} MB / 6.00 MB
              </span>
              
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: "0.8rem", color: "var(--accent-violet)" }}>
                <ImageIcon size={14} /> Attach Image
                <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
              </label>
            </div>
            <span style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--accent-green)", fontSize: "0.8rem" }}>
              <Shield size={12} /> AES-256-GCM
            </span>
          </div>

          {/* Options Panel */}
          <div className="options-panel">
            {/* Language */}
            <div className="option-group">
              <label className="option-label">Language</label>
              <select
                className="option-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang.charAt(0).toUpperCase() + lang.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Expiry */}
            <div className="option-group">
              <label className="option-label">Expires In</label>
              <select
                className="option-select"
                value={expiry}
                onChange={(e) => setExpiry(Number(e.target.value))}
              >
                {EXPIRY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* View Once */}
            <div className="option-group">
              <label className="option-label">Burn After Read</label>
              <div
                className={`toggle-group ${viewOnce ? "active" : ""}`}
                onClick={() => setViewOnce(!viewOnce)}
                role="switch"
                aria-checked={viewOnce}
              >
                <span className="toggle-label-text">
                  <Flame size={14} />
                  {viewOnce ? "One view only" : "Multiple views"}
                </span>
                <span className="toggle-switch" />
              </div>
            </div>

            {/* Password */}
            <div className="option-group">
              <label className="option-label">Password Protect</label>
              <div
                className={`toggle-group ${passwordProtected ? "active" : ""}`}
                onClick={() => { setPasswordProtected(!passwordProtected); setPassword(""); }}
                role="switch"
                aria-checked={passwordProtected}
              >
                <span className="toggle-label-text">
                  <Lock size={14} />
                  {passwordProtected ? "Password set" : "No password"}
                </span>
                <span className="toggle-switch" />
              </div>
            </div>
          </div>

          {/* Password input (shown only when enabled) */}
          {passwordProtected && (
            <div style={{ padding: "0 20px 16px", display: "flex", gap: 12, alignItems: "center" }}>
              <input
                type="password"
                placeholder="Enter a strong password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  background: "var(--bg-input)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-sans)",
                  fontSize: "0.875rem",
                  outline: "none",
                }}
              />
              <span style={{ fontSize: "0.76rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                Shared separately
              </span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              padding: "12px 20px",
              marginBottom: 4,
              color: "var(--accent-red)",
              fontSize: "0.85rem",
              background: "rgba(239,68,68,0.07)",
              borderTop: "1px solid rgba(239,68,68,0.15)"
            }}>
              ⚠ {error}
            </div>
          )}

          {/* Submit */}
          <div style={{ padding: "16px 20px 20px" }}>
            <button
              className="btn btn-primary"
              onClick={handleCreate}
              disabled={loading || (!content.trim() && !imageData) || isOverLimit}
              id="create-paste-btn"
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                  {loadingText}
                </>
              ) : (
                <>
                  <Lock size={16} />
                  Encrypt & Share
                </>
              )}
            </button>
            <p className="encrypt-indicator">
              <Shield size={12} />
              Encrypted in your browser · Server never sees plaintext
            </p>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {showModal && (
        <ShareModal
          url={shareUrl}
          viewOnce={viewOnce}
          passwordProtected={passwordProtected}
          onClose={() => setShowModal(false)}
          onNewPaste={handleNewPaste}
        />
      )}
    </>
  );
}
