import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { lists, categories, items, claims, guestSessions } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { cookies } from "next/headers";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ shareToken: string }> }
) {
  const { shareToken } = await params;

  const [list] = await db.select().from(lists).where(eq(lists.shareToken, shareToken)).limit(1);
  if (!list) return NextResponse.json({ error: "List not found" }, { status: 404 });

  // Identify guest from cookie
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

  const itemIds = listItems.map((i) => i.id);
  let allClaims: Array<{
    id: string;
    itemId: string;
    guestSessionId: string | null;
    userId: string | null;
    quantity: number;
    claimerName?: string;
  }> = [];

  if (itemIds.length > 0) {
    const rawClaims = await db
      .select({
        id: claims.id,
        itemId: claims.itemId,
        guestSessionId: claims.guestSessionId,
        userId: claims.userId,
        quantity: claims.quantity,
      })
      .from(claims)
      .where(inArray(claims.itemId, itemIds));

    const guestIds = rawClaims
      .map((c) => c.guestSessionId)
      .filter((id): id is string => id !== null);

    const guests =
      guestIds.length > 0
        ? await db
            .select({ id: guestSessions.id, name: guestSessions.name })
            .from(guestSessions)
            .where(inArray(guestSessions.id, guestIds))
        : [];

    allClaims = rawClaims.map((c) => ({
      ...c,
      claimerName: list.showWhoBrings
        ? guests.find((g) => g.id === c.guestSessionId)?.name ?? "Someone"
        : undefined,
    }));
  }

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
