import { db } from "@/lib/db";
import { claims, guestSessions } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";

export type ClaimWithName = {
  id: string;
  itemId: string;
  guestSessionId: string | null;
  userId: string | null;
  quantity: number;
  claimerName?: string;
};

export async function fetchClaimsForList(
  itemIds: string[],
  showWhoBrings: boolean
): Promise<ClaimWithName[]> {
  if (itemIds.length === 0) return [];

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

  if (!showWhoBrings) {
    return rawClaims.map((c) => ({ ...c }));
  }

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

  return rawClaims.map((c) => ({
    ...c,
    claimerName: guests.find((g) => g.id === c.guestSessionId)?.name ?? "Iemand",
  }));
}
