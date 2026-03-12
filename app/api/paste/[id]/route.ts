// app/api/paste/[id]/route.ts — GET: Retrieve a paste (and delete if view-once)
import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import type { PasteRecord } from "../route";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || !/^[A-Za-z0-9_-]{10}$/.test(id)) {
      return NextResponse.json({ error: "Invalid paste ID" }, { status: 400 });
    }

    const db = getRedis();
    const key = `paste:${id}`;
    const raw = await db.get<string>(key);

    if (!raw) {
      return NextResponse.json({ error: "Paste not found or expired" }, { status: 404 });
    }

    const record: PasteRecord = typeof raw === "string" ? JSON.parse(raw) : raw;

    // If view-once, atomically delete and return
    if (record.viewOnce) {
      const burnKey = `burned:${id}`;
      const alreadyBurned = await db.get(burnKey);

      if (alreadyBurned) {
        return NextResponse.json({ error: "This paste has been burned and is no longer available" }, { status: 410 });
      }

      // Mark as burned before deleting — prevents double-read attacks
      await db.setex(burnKey, 60 * 60 * 24, "1");
      await db.del(key);

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

    await getRedis().del(`paste:${id}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/paste/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
