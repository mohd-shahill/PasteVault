"use client";
import Link from "next/link";
import { Shield, Lock } from "lucide-react";

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link href="/" className="navbar-logo">
          <div className="navbar-logo-icon">
            <Shield size={18} color="white" />
          </div>
          PasteVault
        </Link>

        <div className="navbar-links">
          <Link href="/about" className="navbar-link">
            How it Works
          </Link>
          <Link href="/" className="navbar-btn">
            <Lock size={13} style={{ marginRight: 4, display: "inline" }} />
            New Paste
          </Link>
        </div>
      </div>
    </nav>
  );
}
