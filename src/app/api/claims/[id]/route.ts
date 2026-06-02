import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { claims, guestSessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [claim] = await db.select().from(claims).where(eq(claims.id, id)).limit(1);
  if (!claim) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const session = await auth();

  if (session) {
    if (claim.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("meeneemlijst_guest")?.value;
    if (!sessionToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [guest] = await db
      .select()
      .from(guestSessions)
      .where(eq(guestSessions.sessionToken, sessionToken))
      .limit(1);
    if (!guest || guest.id !== claim.guestSessionId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  await db.delete(claims).where(eq(claims.id, id));
  return NextResponse.json({ ok: true });
}
