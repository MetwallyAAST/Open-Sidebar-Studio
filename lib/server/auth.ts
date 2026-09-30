import { cookies } from "next/headers";
import { db } from "./db";
import { hashToken } from "./password";
import { roleSchema } from "../sidebar/schema";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function currentUser() {
  const token = (await cookies()).get("sidebar_session")?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { id: hashToken(token) },
    include: {
      user: {
        include: { groups: true, role: { include: { permissions: true } } },
      },
    },
  });
  if (!session || session.expiresAt < new Date() || !session.user.enabled)
    return null;
  return {
    ...session.user,
    role: roleSchema.parse(session.user.roleName),
    groups: session.user.groups.map((g) => g.groupId),
    permissions: session.user.role.permissions.map((p) => p.permissionName),
  };
}
export async function requireUser(permission?: string) {
  const user = await currentUser();
  if (!user) throw new HttpError(401, "Sign in required");
  if (permission && !user.permissions.includes(permission))
    throw new HttpError(403, "Permission denied");
  return user;
}
export function sameOrigin(request: Request) {
  const expected = process.env.APP_ORIGIN;
  if (!expected) throw new HttpError(503, "APP_ORIGIN must be configured");
  if (request.headers.get("origin") !== new URL(expected).origin)
    throw new HttpError(403, "Cross-origin request rejected");
}
export async function readBody(request: Request) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 1_000_000) throw new HttpError(413, "Request too large");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Missing body");
  let size = 0;
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 1_000_000) {
      await reader.cancel();
      throw new HttpError(413, "Request too large");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "Invalid JSON");
  }
}
export function apiError(error: unknown) {
  if (error instanceof HttpError)
    return Response.json({ error: error.message }, { status: error.status });
  if (error && typeof error === "object" && "issues" in error)
    return Response.json(
      { error: "Configuration validation failed", issues: error.issues },
      { status: 400 },
    );
  console.error(error);
  return Response.json(
    { error: "The operation failed. No partial changes were saved." },
    { status: 500 },
  );
}
