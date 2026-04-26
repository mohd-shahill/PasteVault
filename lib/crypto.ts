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
  return await bufferToBase64UrlSafe(raw);
}

export async function importKey(keyBase64: string): Promise<CryptoKey> {
  const raw = await base64ToBufferUrlSafe(keyBase64);
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
  
  // Compress plaintext (JSON with base64 image) to significantly reduce payload size
  const stream = new Blob([plaintext]).stream().pipeThrough(new CompressionStream("deflate"));
  const compressedBuffer = await new Response(stream).arrayBuffer();

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    compressedBuffer
  );
  return {
    ciphertext: await bufferToBase64(encrypted),
    iv: await bufferToBase64(iv),
  };
}

export async function decryptText(
  ciphertext: string,
  iv: string,
  key: CryptoKey
): Promise<string> {
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: await base64ToBuffer(iv) },
    key,
    await base64ToBuffer(ciphertext)
  );

  // Decompress the decrypted buffer
  const stream = new Blob([decrypted]).stream().pipeThrough(new DecompressionStream("deflate"));
  return new Response(stream).text();
}

// --- Optional: Password-based key derivation ---
export async function deriveKeyFromPassword(
  password: string,
  saltBase64: string
): Promise<CryptoKey> {
  const salt = await base64ToBufferUrlSafe(saltBase64);
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

export async function generateSalt(): Promise<string> {
  return await bufferToBase64UrlSafe(crypto.getRandomValues(new Uint8Array(16)));
}

// --- Utils ---
export async function bufferToBase64(buffer: ArrayBuffer | Uint8Array): Promise<string> {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 32768; // 32KB chunks to avoid call stack overflow
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize) as any);
  }
  return btoa(binary);
}

export async function base64ToBuffer(base64: string): Promise<ArrayBuffer> {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// For URL keys only
export async function bufferToBase64UrlSafe(buffer: ArrayBuffer | Uint8Array): Promise<string> {
  const b64 = await bufferToBase64(buffer);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export async function base64ToBufferUrlSafe(base64: string): Promise<ArrayBuffer> {
  const padded = base64.replace(/-/g, "+").replace(/_/g, "/");
  return base64ToBuffer(padded);
}
