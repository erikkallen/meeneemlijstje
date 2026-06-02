import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { lists, categories, items } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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

  const catNameById = Object.fromEntries(listCategories.map((c) => [c.id, c.name]));

  const payload = {
    version: 1,
    name: list.name,
    description: list.description,
    allowMultipleClaimants: list.allowMultipleClaimants,
    showWhoBrings: list.showWhoBrings,
    categories: listCategories.map((c) => ({ name: c.name, sortOrder: c.sortOrder })),
    items: listItems.map((i) => ({
      name: i.name,
      description: i.description,
      categoryName: i.categoryId ? catNameById[i.categoryId] : null,
      quantityNeeded: i.quantityNeeded,
      sortOrder: i.sortOrder,
    })),
  };

  const filename = `${list.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.json`;

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
