import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { lists } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userLists = await db
    .select()
    .from(lists)
    .where(eq(lists.ownerId, session.user.id))
    .orderBy(lists.createdAt);

  return NextResponse.json(userLists);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, description } = await req.json();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const [list] = await db
    .insert(lists)
    .values({ name, description, ownerId: session.user.id })
    .returning();

  return NextResponse.json(list, { status: 201 });
}
