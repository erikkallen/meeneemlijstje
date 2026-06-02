import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { lists, categories, items } from "@/lib/db/schema";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  if (body.version !== 1 || !body.name || !Array.isArray(body.categories) || !Array.isArray(body.items)) {
    return NextResponse.json({ error: "Ongeldig exportbestand" }, { status: 400 });
  }

  // Create the list
  const [list] = await db
    .insert(lists)
    .values({
      ownerId: session.user.id,
      name: body.name,
      description: body.description ?? null,
      allowMultipleClaimants: body.allowMultipleClaimants ?? false,
      showWhoBrings: body.showWhoBrings ?? true,
    })
    .returning();

  // Create categories and build a name → id map
  const catNameToId: Record<string, string> = {};
  for (const cat of body.categories) {
    if (!cat.name) continue;
    const [created] = await db
      .insert(categories)
      .values({ listId: list.id, name: cat.name, sortOrder: cat.sortOrder ?? 0 })
      .returning();
    catNameToId[cat.name] = created.id;
  }

  // Create items
  for (const item of body.items) {
    if (!item.name) continue;
    await db.insert(items).values({
      listId: list.id,
      name: item.name,
      description: item.description ?? null,
      categoryId: item.categoryName ? (catNameToId[item.categoryName] ?? null) : null,
      quantityNeeded: item.quantityNeeded ?? 1,
      sortOrder: item.sortOrder ?? 0,
    });
  }

  return NextResponse.json({ id: list.id }, { status: 201 });
}
