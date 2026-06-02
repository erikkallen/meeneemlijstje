import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { lists, categories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [list] = await db.select().from(lists).where(eq(lists.id, id)).limit(1);
  if (!list || list.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { name, sortOrder } = await req.json();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const [category] = await db
    .insert(categories)
    .values({ listId: id, name, sortOrder: sortOrder ?? 0 })
    .returning();

  return NextResponse.json(category, { status: 201 });
}
