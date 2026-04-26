// app/api/paste/[id]/route.ts — GET: Retrieve a paste (and delete if view-once)
import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import { readRatelimit } from "@/lib/ratelimit";
import type { PasteRecord } from "../route";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Rate limit
    const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
    const { success } = await readRatelimit.limit(ip);
    
    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    if (!id || !/^[A-Za-z0-9_-]{10}$/.test(id)) {
      return NextResponse.json({ error: "Invalid paste ID" }, { status: 400 });
    }

    const db = getRedis();
    const key = `paste:${id}`;
    const raw = await db.get<string>(key);

    if (!raw) {
      return NextResponse.json({ error: "Paste not found or expired" }, { status: 404 });
    }

    let recordStr = "";
    let isChunked = false;
    let numChunks = 0;

    try {
      const meta = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (meta && typeof meta.chunks === "number") {
        isChunked = true;
        numChunks = meta.chunks;
      } else {
        recordStr = typeof raw === "string" ? raw : JSON.stringify(raw);
      }
    } catch {
      recordStr = raw;
    }

    if (isChunked) {
      const keysToFetch = [];
      for (let i = 0; i < numChunks; i++) {
        keysToFetch.push(`${key}:${i}`);
      }
      // Use MGET to fetch all chunks in a single blazing fast HTTP request
      const chunks = await db.mget<string[]>(...keysToFetch);
      recordStr = chunks.join("");
    }

    const record: PasteRecord = JSON.parse(recordStr);

    // If view-once, atomically delete and return
    if (record.viewOnce) {
      const burnKey = `burned:${id}`;
      
      // Use Redis NX (Set if Not eXists) for an atomic check-and-set operation
      const acquired = await db.set(burnKey, "1", { nx: true, ex: 60 * 60 * 24 });

      if (!acquired) {
        return NextResponse.json({ error: "This paste has been burned and is no longer available" }, { status: 410 });
      }

      const keysToDel = [key];
      if (isChunked) {
        for (let i = 0; i < numChunks; i++) keysToDel.push(`${key}:${i}`);
      }
      await db.del(...keysToDel);

      return NextResponse.json({ ...record, burned: true });
    }

    // Get remaining TTL
    const ttl = await db.ttl(key);

    return NextResponse.json({ ...record, ttl });
  } catch (err) {
    console.error("GET /api/paste/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: Manually delete a paste
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    const db = getRedis();
    const key = `paste:${id}`;
    const raw = await db.get<string>(key);
    
    const keysToDel = [key];
    if (raw) {
      try {
        const meta = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (meta && typeof meta.chunks === "number") {
          for (let i = 0; i < meta.chunks; i++) keysToDel.push(`${key}:${i}`);
        }
      } catch {}
    }

    await db.del(...keysToDel);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/paste/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
