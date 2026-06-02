import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { items, lists } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [item] = await db.select().from(items).where(eq(items.id, id)).limit(1);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [list] = await db.select().from(lists).where(eq(lists.id, item.listId)).limit(1);
  if (!list || list.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const allowed = ["name", "description", "categoryId", "quantityNeeded", "sortOrder"] as const;
  const update: Partial<typeof item> = {};
  for (const key of allowed) {
    if (key in body) (update as Record<string, unknown>)[key] = body[key];
  }

  const [updated] = await db.update(items).set(update).where(eq(items.id, id)).returning();
  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [item] = await db.select().from(items).where(eq(items.id, id)).limit(1);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [list] = await db.select().from(lists).where(eq(lists.id, item.listId)).limit(1);
  if (!list || list.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.delete(items).where(eq(items.id, id));
  return NextResponse.json({ ok: true });
}
