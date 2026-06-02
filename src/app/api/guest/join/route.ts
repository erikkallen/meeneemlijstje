import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { lists, guestSessions } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const { shareToken, name } = await req.json();

  if (!shareToken || !name?.trim()) {
    return NextResponse.json({ error: "shareToken and name are required" }, { status: 400 });
  }

  const [list] = await db.select().from(lists).where(eq(lists.shareToken, shareToken)).limit(1);
  if (!list) return NextResponse.json({ error: "List not found" }, { status: 404 });

  // Find or create guest session (case-insensitive name match)
  const [existing] = await db
    .select()
    .from(guestSessions)
    .where(
      and(
        eq(guestSessions.listId, list.id),
        sql`lower(${guestSessions.name}) = lower(${name.trim()})`
      )
    )
    .limit(1);

  const guest = existing ?? (
    await db
      .insert(guestSessions)
      .values({ listId: list.id, name: name.trim() })
      .returning()
  )[0];

  const cookieStore = await cookies();
  cookieStore.set("meeneemlijst_guest", guest.sessionToken, {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 90, // 90 days
    sameSite: "lax",
  });

  return NextResponse.json({ guestId: guest.id, listId: list.id });
}
