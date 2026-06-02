import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { lists, categories, items, claims, guestSessions } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { PrintButton } from "@/components/PrintButton";

export default async function PrintPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const { id } = await params;
  const [list] = await db.select().from(lists).where(eq(lists.id, id)).limit(1);
  if (!list || list.ownerId !== session.user.id) notFound();

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
      ? await db.select().from(claims).where(inArray(claims.itemId, itemIds))
      : [];

  const guestIds = allClaims
    .map((c) => c.guestSessionId)
    .filter((g): g is string => g !== null);
  const guests =
    guestIds.length > 0
      ? await db
          .select({ id: guestSessions.id, name: guestSessions.name })
          .from(guestSessions)
          .where(inArray(guestSessions.id, guestIds))
      : [];

  function claimerName(claim: typeof allClaims[0]) {
    if (claim.guestSessionId) {
      return guests.find((g) => g.id === claim.guestSessionId)?.name ?? "Gast";
    }
    return session!.user.name;
  }

  // By person: name → [{ itemName, quantity }]
  const byPerson: Record<string, { itemName: string; quantity: number }[]> = {};
  for (const claim of allClaims) {
    const name = claimerName(claim);
    const itemName = listItems.find((i) => i.id === claim.itemId)?.name ?? "Onbekend";
    if (!byPerson[name]) byPerson[name] = [];
    byPerson[name].push({ itemName, quantity: claim.quantity ?? 1 });
  }

  // Category name lookup
  const catMap = Object.fromEntries(listCategories.map((c) => [c.id, c.name]));

  // Items grouped by category
  const grouped: Record<string, typeof listItems> = {};
  for (const item of listItems) {
    const key = item.categoryId ? catMap[item.categoryId] : "Overig";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  }

  return (
    <div className="max-w-2xl mx-auto px-8 py-10 print:py-4 font-sans text-sm">
      <div className="print:hidden mb-6">
        <PrintButton />
      </div>

      <h1 className="text-2xl font-bold mb-1">{list.name}</h1>
      {list.description && <p className="text-muted-foreground mb-6">{list.description}</p>}

      {/* Section 1: By person */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold border-b pb-1 mb-4">Wie neemt wat mee</h2>
        {Object.keys(byPerson).length === 0 ? (
          <p className="text-muted-foreground italic">Niemand heeft nog iets toegezegd.</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(byPerson).map(([person, entries]) => (
              <div key={person}>
                <p className="font-semibold">{person}</p>
                <ul className="mt-1 space-y-0.5">
                  {entries.map((e, i) => (
                    <li key={i} className="flex items-baseline gap-2 text-muted-foreground">
                      <span className="w-6 text-right font-medium tabular-nums text-foreground shrink-0">
                        {e.quantity}×
                      </span>
                      <span>{e.itemName}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section 2: All items */}
      <section>
        <h2 className="text-lg font-semibold border-b pb-1 mb-4">Alle items</h2>
        {Object.entries(grouped).map(([categoryName, catItems]) => (
          <div key={categoryName} className="mb-5">
            {Object.keys(grouped).length > 1 && (
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                {categoryName}
              </h3>
            )}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-1 font-medium w-1/2">Item</th>
                  <th className="pb-1 font-medium w-1/6 text-center">Nodig</th>
                  <th className="pb-1 font-medium">Toegezegd door</th>
                </tr>
              </thead>
              <tbody>
                {catItems.map((item) => {
                  const itemClaims = allClaims.filter((c) => c.itemId === item.id);
                  return (
                    <tr key={item.id} className="border-b border-dashed last:border-0 align-top">
                      <td className="py-1.5">{item.name}</td>
                      <td className="py-1.5 text-center text-muted-foreground tabular-nums">
                        {item.quantityNeeded}
                      </td>
                      <td className="py-1.5">
                        {itemClaims.length === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <ul className="space-y-0.5">
                            {itemClaims.map((claim, i) => (
                              <li key={i} className="flex items-baseline gap-1.5">
                                <span className="font-medium tabular-nums text-foreground w-5 text-right shrink-0">
                                  {claim.quantity ?? 1}×
                                </span>
                                <span className="text-muted-foreground">{claimerName(claim)}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </section>
    </div>
  );
}
