import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { lists, guestSessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { GuestItemsView } from "@/components/GuestItemsView";

export default async function GuestItemsPage({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}) {
  const { shareToken } = await params;
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("meeneemlijst_guest")?.value;

  // Verify guest has a session for this list
  if (!sessionToken) redirect(`/join/${shareToken}`);

  const [list] = await db.select().from(lists).where(eq(lists.shareToken, shareToken)).limit(1);
  if (!list) redirect("/");

  const [guest] = await db
    .select()
    .from(guestSessions)
    .where(eq(guestSessions.sessionToken, sessionToken))
    .limit(1);

  if (!guest || guest.listId !== list.id) redirect(`/join/${shareToken}`);

  return <GuestItemsView shareToken={shareToken} guestName={guest.name} />;
}
