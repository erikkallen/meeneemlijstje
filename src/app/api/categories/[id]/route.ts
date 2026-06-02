import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { categories, lists } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [cat] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  if (!cat) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [list] = await db.select().from(lists).where(eq(lists.id, cat.listId)).limit(1);
  if (!list || list.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const [updated] = await db
    .update(categories)
    .set({ name: name.trim() })
    .where(eq(categories.id, id))
    .returning();
  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [cat] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  if (!cat) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [list] = await db.select().from(lists).where(eq(lists.id, cat.listId)).limit(1);
  if (!list || list.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.delete(categories).where(eq(categories.id, id));
  return NextResponse.json({ ok: true });
}
