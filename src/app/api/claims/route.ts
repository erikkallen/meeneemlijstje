import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { claims, items, lists, guestSessions } from "@/lib/db/schema";
import { eq, and, sql, ne } from "drizzle-orm";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  const { itemId, quantity = 1 } = await req.json();
  if (!itemId) return NextResponse.json({ error: "itemId is required" }, { status: 400 });
  if (quantity < 1) return NextResponse.json({ error: "Quantity must be at least 1" }, { status: 400 });

  const [item] = await db.select().from(items).where(eq(items.id, itemId)).limit(1);
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  const [list] = await db.select().from(lists).where(eq(lists.id, item.listId)).limit(1);
  if (!list) return NextResponse.json({ error: "List not found" }, { status: 404 });

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

  // Reject if this person already has a claim (they should PATCH it instead)
  const mineCondition = userId
    ? and(eq(claims.itemId, itemId), eq(claims.userId, userId))
    : and(eq(claims.itemId, itemId), eq(claims.guestSessionId, guestSessionId!));
  const [alreadyClaimed] = await db.select().from(claims).where(mineCondition).limit(1);
  if (alreadyClaimed) {
    return NextResponse.json({ error: "Already claimed" }, { status: 409 });
  }

  // Capacity check using SUM(quantity)
  const [{ total }] = await db
    .select({ total: sql<number>`COALESCE(SUM(${claims.quantity}), 0)` })
    .from(claims)
    .where(eq(claims.itemId, itemId));

  if (!list.allowMultipleClaimants) {
    // Single-claimant mode: no other person may have a claim
    if (total > 0) {
      return NextResponse.json({ error: "Item already claimed" }, { status: 409 });
    }
  } else {
    // Multi-claimant mode: check remaining capacity
    if (Number(total) + quantity > item.quantityNeeded) {
      return NextResponse.json({ error: "Item fully claimed" }, { status: 409 });
    }
  }

  const [claim] = await db
    .insert(claims)
    .values({ itemId, guestSessionId, userId, quantity })
    .returning();

  return NextResponse.json(claim, { status: 201 });
}
