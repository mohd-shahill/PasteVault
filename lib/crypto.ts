// lib/crypto.ts
// Client-side AES-256-GCM encryption/decryption using Web Crypto API
// The encryption key NEVER leaves the user's browser.
// The key is stored in the URL fragment (#key=...) which is not sent to the server.

export async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true, // extractable
    ["encrypt", "decrypt"]
  );
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return bufferToBase64(raw);
}

export async function importKey(keyBase64: string): Promise<CryptoKey> {
  const raw = base64ToBuffer(keyBase64);
  return crypto.subtle.importKey(
    "raw",
    raw,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function encryptText(
  plaintext: string,
  key: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );
  return {
    ciphertext: bufferToBase64(encrypted),
    iv: bufferToBase64(iv),
  };
}

export async function decryptText(
  ciphertext: string,
  iv: string,
  key: CryptoKey
): Promise<string> {
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBuffer(iv) },
    key,
    base64ToBuffer(ciphertext)
  );
  return new TextDecoder().decode(decrypted);
}

// --- Optional: Password-based key derivation ---
export async function deriveKeyFromPassword(
  password: string,
  saltBase64: string
): Promise<CryptoKey> {
  const salt = base64ToBuffer(saltBase64);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 310000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

export function generateSalt(): string {
  return bufferToBase64(crypto.getRandomValues(new Uint8Array(16)));
}

// --- Utils ---
function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const padded = base64.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const buffer = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    view[i] = binary.charCodeAt(i);
  }
  return buffer;
}
