import { cookies } from "next/headers";
import { db } from "@/lib/server/db";
import { hashToken } from "@/lib/server/password";
import { apiError, sameOrigin } from "@/lib/server/auth";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const jar = await cookies();
    const token = jar.get("sidebar_session")?.value;
    if (token) await db.session.deleteMany({ where: { id: hashToken(token) } });
    jar.delete("sidebar_session");
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
