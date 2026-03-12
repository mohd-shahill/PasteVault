// app/api/paste/route.ts — POST: Create a new encrypted paste
import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
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

const MAX_SIZE_BYTES = 500 * 1024; // 500KB limit

export async function POST(req: NextRequest) {
  try {
    // Rate limit
    const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
    
    const body = (await req.json()) as PastePayload;

    // Basic validation
    if (!body.ciphertext || !body.iv) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const sizeBytes = Buffer.byteLength(body.ciphertext, "utf-8");
    if (sizeBytes > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "Content too large (max 500KB)" }, { status: 413 });
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

    if (body.expiry && body.expiry > 0) {
      await getRedis().setex(key, body.expiry, JSON.stringify(record));
    } else {
      // No expiry — store for 1 year max
      await getRedis().setex(key, 60 * 60 * 24 * 365, JSON.stringify(record));
    }

    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error("POST /api/paste error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
