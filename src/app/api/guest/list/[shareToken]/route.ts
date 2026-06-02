import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { lists, categories, items, guestSessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { fetchClaimsForList } from "@/lib/fetchClaims";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ shareToken: string }> }
) {
  const { shareToken } = await params;

  const [list] = await db.select().from(lists).where(eq(lists.shareToken, shareToken)).limit(1);
  if (!list) return NextResponse.json({ error: "List not found" }, { status: 404 });

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("meeneemlijst_guest")?.value;
  let currentGuest = null;
  if (sessionToken) {
    const [g] = await db
      .select()
      .from(guestSessions)
      .where(eq(guestSessions.sessionToken, sessionToken))
      .limit(1);
    if (g?.listId === list.id) currentGuest = g;
  }

  const listCategories = await db
    .select()
    .from(categories)
    .where(eq(categories.listId, list.id))
    .orderBy(categories.sortOrder);

  const listItems = await db
    .select()
    .from(items)
    .where(eq(items.listId, list.id))
    .orderBy(items.sortOrder);

  const allClaims = await fetchClaimsForList(
    listItems.map((i) => i.id),
    list.showWhoBrings
  );

  return NextResponse.json({
    list: {
      id: list.id,
      name: list.name,
      description: list.description,
      allowMultipleClaimants: list.allowMultipleClaimants,
      showWhoBrings: list.showWhoBrings,
    },
    categories: listCategories,
    items: listItems,
    claims: allClaims,
    currentGuestId: currentGuest?.id ?? null,
  });
}
