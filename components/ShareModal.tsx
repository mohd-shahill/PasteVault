"use client";

import { useState } from "react";
import { CheckCircle, Copy, AlertTriangle, X, Plus, ExternalLink } from "lucide-react";
import Link from "next/link";

interface ShareModalProps {
  url: string;
  viewOnce: boolean;
  passwordProtected: boolean;
  onClose: () => void;
  onNewPaste: () => void;
}

export default function ShareModal({ url, viewOnce, passwordProtected, onClose, onNewPaste }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--text-muted)",
            display: "flex"
          }}
        >
          <X size={18} />
        </button>

        {/* Success icon */}
        <div className="modal-icon">
          <CheckCircle size={28} />
        </div>

        <h2 className="modal-title">🔐 Paste Encrypted!</h2>
        <p className="modal-subtitle">
          Your content has been encrypted in your browser using AES-256-GCM.
          {passwordProtected
            ? " Share the link and send the password separately."
            : " The decryption key is embedded in the link — keep it safe."}
        </p>

        {/* URL Box */}
        <div className="url-box">
          <span className="url-text" title={url}>{url}</span>
          <button
            className={`copy-btn ${copied ? "copied" : ""}`}
            onClick={handleCopy}
            id="copy-share-link-btn"
          >
            {copied ? (
              <><CheckCircle size={13} /> Copied!</>
            ) : (
              <><Copy size={13} /> Copy</>
            )}
          </button>
        </div>

        {/* Warnings */}
        {viewOnce && (
          <div className="modal-warning">
            <AlertTriangle size={15} />
            <span>
              <strong>Burn After Read</strong> — This paste will be permanently deleted after the first view. Make sure to copy the link.
            </span>
          </div>
        )}

        {passwordProtected && (
          <div className="modal-warning">
            <AlertTriangle size={15} />
            <span>
              <strong>Password Protected</strong> — The viewer will need the password you set. Share it via a separate channel (e.g., Signal, WhatsApp).
            </span>
          </div>
        )}

        {!viewOnce && !passwordProtected && (
          <div style={{ marginBottom: 24, padding: "12px 16px", background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: "var(--radius-sm)", fontSize: "0.82rem", color: "#93c5fd" }}>
            🔑 The decryption key is in the URL fragment (#key=…). Anyone with this link can view the paste.
          </div>
        )}

        {/* Actions */}
        <div className="modal-actions">
          <button className="btn btn-primary" onClick={onNewPaste} id="new-paste-btn">
            <Plus size={16} />
            New Paste
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{ textDecoration: "none" }}
            id="view-paste-btn"
          >
            <ExternalLink size={15} />
            View
          </a>
        </div>
      </div>
    </div>
  );
}
