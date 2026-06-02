import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { lists, categories, items, claims, guestSessions } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeftIcon, PrinterIcon } from "lucide-react";
import { ListAdminView } from "@/components/ListAdminView";

export default async function ListAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
      ? await db
          .select({
            id: claims.id,
            itemId: claims.itemId,
            guestSessionId: claims.guestSessionId,
            userId: claims.userId,
            quantity: claims.quantity,
          })
          .from(claims)
          .where(inArray(claims.itemId, itemIds))
      : [];

  const guestIds = allClaims
    .map((c) => c.guestSessionId)
    .filter((id): id is string => id !== null);
  const guests =
    guestIds.length > 0
      ? await db
          .select({ id: guestSessions.id, name: guestSessions.name })
          .from(guestSessions)
          .where(inArray(guestSessions.id, guestIds))
      : [];

  const origin = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const shareUrl = `${origin}/join/${list.shareToken}`;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
              <ArrowLeftIcon className="w-4 h-4 mr-1" />
              Terug
            </Link>
            <h1 className="font-semibold truncate max-w-xs">{list.name}</h1>
          </div>
          <Link
            href={`/lists/${id}/print`}
            target="_blank"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <PrinterIcon className="w-4 h-4 mr-1" />
            Afdrukken
          </Link>
        </div>
      </header>

      <ListAdminView
        list={list}
        categories={listCategories}
        items={listItems}
        claims={allClaims}
        guests={guests}
        shareUrl={shareUrl}
      />
    </div>
  );
}
