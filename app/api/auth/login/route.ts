import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/server/db";
import { apiError, HttpError, readBody, sameOrigin } from "@/lib/server/auth";
import { hashToken, verifyPassword, hashPassword } from "@/lib/server/password";
const input = z
  .object({
    email: z
      .email()
      .max(254)
      .transform((s) => s.toLowerCase().trim()),
    password: z.string().min(1).max(256),
  })
  .strict();
const dummy = hashPassword(randomBytes(32).toString("hex"));
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const data = input.parse(await readBody(request));
    const key = hashToken(data.email);
    const now = new Date();
    const allowed = await db.$transaction(async (tx) => {
      await tx.$executeRaw`INSERT INTO "LoginAttempt" ("key", "attempts", "windowStart") VALUES (${key}, 0, ${now}) ON CONFLICT ("key") DO NOTHING`;
      await tx.$queryRaw`SELECT key FROM "LoginAttempt" WHERE key = ${key} FOR UPDATE`;
      const attempt = await tx.loginAttempt.findUniqueOrThrow({
        where: { key },
      });
      if (now.getTime() - attempt.windowStart.getTime() > 900000) {
        await tx.loginAttempt.update({
          where: { key },
          data: { attempts: 1, windowStart: now },
        });
        return true;
      }
      if (attempt.attempts >= 8) return false;
      await tx.loginAttempt.update({
        where: { key },
        data: { attempts: { increment: 1 } },
      });
      return true;
    });
    if (!allowed)
      throw new HttpError(429, "Too many attempts. Try again in 15 minutes.");
    const user = await db.user.findUnique({ where: { email: data.email } });
    const valid = await verifyPassword(
      data.password,
      user?.passwordHash ?? (await dummy),
    );
    if (!user || !user.enabled || !valid)
      throw new HttpError(401, "Email or password is incorrect");
    const token = randomBytes(32).toString("hex");
    await db.session.create({
      data: {
        id: hashToken(token),
        userId: user.id,
        expiresAt: new Date(Date.now() + 8 * 3600000),
      },
    });
    await db.loginAttempt.deleteMany({ where: { key } });
    (await cookies()).set("sidebar_session", token, {
      httpOnly: true,
      secure: process.env.APP_ORIGIN?.startsWith("https:") ?? false,
      sameSite: "lax",
      path: "/",
      maxAge: 8 * 3600,
    });
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
