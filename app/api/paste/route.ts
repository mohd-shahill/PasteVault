// app/api/paste/route.ts — POST: Create a new encrypted paste
import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import { createRatelimit } from "@/lib/ratelimit";
import { nanoid } from "nanoid";

export interface PastePayload {
  ciphertext: string;
  iv: string;
  language: string;
  title?: string;
  viewOnce: boolean;
  passwordProtected: boolean;
  salt?: string; // only present if password protected
  expiry: number | null; // seconds, null = never
}

export interface PasteRecord extends PastePayload {
  id: string;
  createdAt: number;
  burned?: boolean;
}

const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20MB limit

export async function POST(req: NextRequest) {
  try {
    // Rate limit
    const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
    const { success } = await createRatelimit.limit(ip);
    
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }
    
    const body = (await req.json()) as PastePayload;

    // Basic validation
    if (!body.ciphertext || !body.iv) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const sizeBytes = Buffer.byteLength(body.ciphertext, "utf-8");
    if (sizeBytes > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "Content too large (max 10MB)" }, { status: 413 });
    }

    // Prevent DoS by capping metadata lengths
    if (
      Buffer.byteLength(body.iv, "utf-8") > 1024 ||
      (body.language && Buffer.byteLength(body.language, "utf-8") > 1024) ||
      (body.salt && Buffer.byteLength(body.salt, "utf-8") > 1024) ||
      (body.title && Buffer.byteLength(body.title, "utf-8") > 1024)
    ) {
      return NextResponse.json({ error: "Metadata fields too large" }, { status: 413 });
    }

    const id = nanoid(10);
    const record: PasteRecord = {
      id,
      ciphertext: body.ciphertext,
      iv: body.iv,
      language: body.language || "plaintext",
      title: body.title?.trim().slice(0, 100) || "",
      viewOnce: !!body.viewOnce,
      passwordProtected: !!body.passwordProtected,
      salt: body.salt,
      expiry: body.expiry,
      createdAt: Date.now(),
    };

    const key = `paste:${id}`;
    const expiry = body.expiry && body.expiry > 0 ? body.expiry : 60 * 60 * 24 * 365;

    const recordStr = JSON.stringify(record);
    const CHUNK_SIZE = 4000000; // ~4MB chunks to avoid Upstash 10MB limit
    const numChunks = Math.ceil(recordStr.length / CHUNK_SIZE);

    const db = getRedis();

    if (numChunks === 1) {
      await db.setex(key, expiry, recordStr);
    } else {
      // Save metadata first, then chunks in parallel for maximum upload speed
      await db.setex(key, expiry, JSON.stringify({ chunks: numChunks, viewOnce: record.viewOnce }));
      const promises = [];
      for (let i = 0; i < numChunks; i++) {
        const chunkStr = recordStr.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        promises.push(db.setex(`${key}:${i}`, expiry, chunkStr));
      }
      await Promise.all(promises);
    }

    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error("POST /api/paste error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
