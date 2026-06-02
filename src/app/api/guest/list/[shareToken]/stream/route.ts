import { db } from "@/lib/db";
import { lists, items } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { fetchClaimsForList } from "@/lib/fetchClaims";

function parseCookie(header: string, name: string): string | null {
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ shareToken: string }> }
) {
  const { shareToken } = await params;

  const [list] = await db.select().from(lists).where(eq(lists.shareToken, shareToken)).limit(1);
  if (!list) return new Response("Not found", { status: 404 });

  // Read cookie from request headers (safe in streaming context)
  const cookieHeader = req.headers.get("cookie") ?? "";
  parseCookie(cookieHeader, "meeneemlijst_guest"); // validated client has a session

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let lastJson = "";

      const poll = async () => {
        if (req.signal.aborted) {
          controller.close();
          return;
        }

        try {
          const listItems = await db
            .select({ id: items.id })
            .from(items)
            .where(eq(items.listId, list.id));

          const currentClaims = await fetchClaimsForList(
            listItems.map((i) => i.id),
            list.showWhoBrings
          );

          const json = JSON.stringify(currentClaims);
          if (json !== lastJson) {
            lastJson = json;
            controller.enqueue(encoder.encode(`data: ${json}\n\n`));
          }
        } catch {
          // DB hiccup — skip this tick, try again next poll
        }

        setTimeout(poll, 2500);
      };

      await poll();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
