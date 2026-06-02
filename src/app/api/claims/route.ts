import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { claims, items, lists, guestSessions } from "@/lib/db/schema";
import { eq, and, count } from "drizzle-orm";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  const { itemId } = await req.json();
  if (!itemId) return NextResponse.json({ error: "itemId is required" }, { status: 400 });

  const [item] = await db.select().from(items).where(eq(items.id, itemId)).limit(1);
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const [list] = await db.select().from(lists).where(eq(lists.id, item.listId)).limit(1);
  if (!list) return NextResponse.json({ error: "List not found" }, { status: 404 });

  // Determine claimer: authenticated user or guest via cookie
  const session = await auth();
  let guestSessionId: string | null = null;
  let userId: string | null = null;

  if (session) {
    userId = session.user.id;
  } else {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("meeneemlijst_guest")?.value;
    if (!sessionToken) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const [guest] = await db
      .select()
      .from(guestSessions)
      .where(eq(guestSessions.sessionToken, sessionToken))
      .limit(1);
    if (!guest || guest.listId !== list.id) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }
    guestSessionId = guest.id;
  }

  // Check if already claimed by this person
  const existingCondition = userId
    ? and(eq(claims.itemId, itemId), eq(claims.userId, userId))
    : and(eq(claims.itemId, itemId), eq(claims.guestSessionId, guestSessionId!));
  const [alreadyClaimed] = await db.select().from(claims).where(existingCondition).limit(1);
  if (alreadyClaimed) {
    return NextResponse.json({ error: "Already claimed" }, { status: 409 });
  }

  // Check capacity
  const [{ value: totalClaims }] = await db
    .select({ value: count() })
    .from(claims)
    .where(eq(claims.itemId, itemId));

  if (!list.allowMultipleClaimants && totalClaims >= 1) {
    return NextResponse.json({ error: "Item already claimed" }, { status: 409 });
  }
  if (list.allowMultipleClaimants && totalClaims >= item.quantityNeeded) {
    return NextResponse.json({ error: "Item fully claimed" }, { status: 409 });
  }

  const [claim] = await db
    .insert(claims)
    .values({ itemId, guestSessionId, userId })
    .returning();

  return NextResponse.json(claim, { status: 201 });
}
