import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { lists, categories, items, claims, guestSessions } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [list] = await db.select().from(lists).where(eq(lists.id, id)).limit(1);
  if (!list || list.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const listCategories = await db
    .select()
    .from(categories)
    .where(eq(categories.listId, id))
    .orderBy(categories.sortOrder);

  const listItems = await db
    .select()
    .from(items)
    .where(eq(items.listId, id))
    .orderBy(items.sortOrder);

  const itemIds = listItems.map((i) => i.id);
  const allClaims =
    itemIds.length > 0
      ? await db
          .select()
          .from(claims)
          .where(inArray(claims.itemId, itemIds))
      : [];

  const guests = await db
    .select()
    .from(guestSessions)
    .where(eq(guestSessions.listId, id));

  return NextResponse.json({ list, categories: listCategories, items: listItems, claims: allClaims, guests });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [list] = await db.select().from(lists).where(eq(lists.id, id)).limit(1);
  if (!list || list.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const allowed = ["name", "description", "allowMultipleClaimants", "showWhoBrings"] as const;
  const update: Partial<typeof list> = {};
  for (const key of allowed) {
    if (key in body) (update as Record<string, unknown>)[key] = body[key];
  }

  const [updated] = await db.update(lists).set(update).where(eq(lists.id, id)).returning();
  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [list] = await db.select().from(lists).where(eq(lists.id, id)).limit(1);
  if (!list || list.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.delete(lists).where(and(eq(lists.id, id), eq(lists.ownerId, session.user.id)));
  return NextResponse.json({ ok: true });
}
