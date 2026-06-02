import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { claims, guestSessions, items, lists } from "@/lib/db/schema";
import { eq, and, ne, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";

async function verifyClaimer(claimId: string) {
  const [claim] = await db.select().from(claims).where(eq(claims.id, claimId)).limit(1);
  if (!claim) return { error: "Not found", status: 404 } as const;

  const session = await auth();

  if (session) {
    if (claim.userId !== session.user.id) return { error: "Forbidden", status: 403 } as const;
  } else {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("meeneemlijst_guest")?.value;
    if (!sessionToken) return { error: "Unauthorized", status: 401 } as const;

    const [guest] = await db
      .select()
      .from(guestSessions)
      .where(eq(guestSessions.sessionToken, sessionToken))
      .limit(1);
    if (!guest || guest.id !== claim.guestSessionId) {
      return { error: "Forbidden", status: 403 } as const;
    }
  }

  return { claim };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await verifyClaimer(id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });

  const { claim } = result;
  const { quantity } = await req.json();
  if (!quantity || quantity < 1) {
    return NextResponse.json({ error: "Quantity must be at least 1" }, { status: 400 });
  }

  const [item] = await db.select().from(items).where(eq(items.id, claim.itemId)).limit(1);
  const [list] = await db.select().from(lists).where(eq(lists.id, item.listId)).limit(1);

  // Sum of all OTHER claims for this item
  const [{ otherTotal }] = await db
    .select({ otherTotal: sql<number>`COALESCE(SUM(${claims.quantity}), 0)` })
    .from(claims)
    .where(and(eq(claims.itemId, claim.itemId), ne(claims.id, id)));

  if (Number(otherTotal) + quantity > item.quantityNeeded) {
    return NextResponse.json({ error: "Niet genoeg ruimte" }, { status: 409 });
  }

  const [updated] = await db
    .update(claims)
    .set({ quantity })
    .where(eq(claims.id, id))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await verifyClaimer(id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });

  await db.delete(claims).where(eq(claims.id, id));
  return NextResponse.json({ ok: true });
}
