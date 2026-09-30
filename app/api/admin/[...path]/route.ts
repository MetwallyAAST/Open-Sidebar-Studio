import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/server/db";
import {
  apiError,
  HttpError,
  requireUser,
  sameOrigin,
  readBody,
} from "@/lib/server/auth";
import { readDraft, mutateConfig } from "@/lib/server/configuration";
import { configSchema, roleSchema } from "@/lib/sidebar/schema";
import { hashPassword } from "@/lib/server/password";
type Context = { params: Promise<{ path: string[] }> };
const version = z.number().int().positive();
const save = z
  .object({
    config: configSchema,
    expectedVersion: version,
    sidebarId: z.string().max(80).default("reference"),
  })
  .strict();
const action = z
  .object({
    expectedVersion: version,
    sidebarId: z.string().max(80).default("reference"),
  })
  .strict();
async function handle(request: Request, context: Context) {
  try {
    const path = (await context.params).path;
    const resource = path[0];
    const method = request.method;
    const writing = method !== "GET";
    if (writing) sameOrigin(request);
    const permission = ["users", "roles", "groups"].includes(resource)
      ? "access:manage"
      : path[1] === "publish"
        ? "sidebar:publish"
        : writing
          ? "sidebar:write"
          : "sidebar:read";
    const user = await requireUser(permission);
    const url = new URL(request.url);
    const sidebarId = url.searchParams.get("sidebarId") || "reference";
    if (resource === "sidebars" && method === "GET")
      return Response.json(
        await db.sidebar.findMany({
          select: { id: true, name: true, priority: true },
          orderBy: { priority: "desc" },
        }),
      );
    if (resource === "sidebars" && method === "POST") {
      if (!user.permissions.includes("access:manage"))
        throw new HttpError(
          403,
          "Only super administrators can create audience variants",
        );
      const input = z
        .object({
          name: z.string().min(1).max(100),
          priority: z.number().int().min(1).max(100),
        })
        .strict()
        .parse(await readBody(request));
      const source = await readDraft();
      const { writeConfig } = await import("@/lib/server/configuration");
      const row = await db.$transaction(async (tx) => {
        const row = await tx.sidebar.create({ data: input });
        await writeConfig(
          tx,
          row.id,
          "draft",
          { ...source.config, name: input.name, roles: ["SUPER_ADMIN"] },
          1,
        );
        return row;
      });
      return Response.json(row, { status: 201 });
    }
    if (resource === "sidebar") {
      if (method === "GET") return Response.json(await readDraft(sidebarId));
      if (method === "PUT") {
        const data = save.parse(await readBody(request));
        return Response.json(
          await mutateConfig(
            data.sidebarId,
            user.id,
            data.expectedVersion,
            "save",
            data.config,
          ),
        );
      }
      if (method === "POST" && ["publish", "discard"].includes(path[1])) {
        const data = action.parse(await readBody(request));
        return Response.json(
          await mutateConfig(
            data.sidebarId,
            user.id,
            data.expectedVersion,
            path[1] as "publish" | "discard",
          ),
        );
      }
    }
    if (resource === "revisions") {
      if (method === "GET")
        return Response.json(
          await db.sidebarRevision.findMany({
            where: { sidebarId },
            orderBy: { createdAt: "desc" },
            take: 50,
            include: { actor: { select: { name: true, email: true } } },
          }),
        );
      if (method === "POST" && path[2] === "restore") {
        const data = action.parse(await readBody(request));
        return Response.json(
          await mutateConfig(
            data.sidebarId,
            user.id,
            data.expectedVersion,
            "restore",
            undefined,
            path[1],
          ),
        );
      }
    }
    if (resource === "audit" && method === "GET") {
      const offset = z.coerce
        .number()
        .int()
        .min(0)
        .max(100000)
        .parse(url.searchParams.get("offset") || 0);
      return Response.json(
        await db.auditLog.findMany({
          orderBy: { createdAt: "desc" },
          skip: offset,
          take: 50,
          include: { actor: { select: { name: true } } },
        }),
      );
    }
    if (resource === "presets") {
      if (method === "GET")
        return Response.json(
          await db.preset.findMany({ orderBy: { createdAt: "asc" } }),
        );
      if (method === "POST") {
        const data = z
          .object({ name: z.string().min(1).max(100), config: configSchema })
          .strict()
          .parse(await readBody(request));
        return Response.json(
          await db.preset.create({
            data: { name: data.name, snapshot: data.config },
          }),
          { status: 201 },
        );
      }
      const existing = await db.preset.findUnique({ where: { id: path[1] } });
      if (!existing) throw new HttpError(404, "Preset not found");
      if (existing.protected)
        throw new HttpError(403, "The reference preset is protected");
      if (method === "DELETE") {
        await db.preset.delete({ where: { id: existing.id } });
        return Response.json({ ok: true });
      }
      if (method === "PATCH") {
        const data = z
          .object({ name: z.string().min(1).max(100) })
          .strict()
          .parse(await readBody(request));
        return Response.json(
          await db.preset.update({ where: { id: existing.id }, data }),
        );
      }
    }
    if (resource === "roles" && method === "GET")
      return Response.json(
        await db.role.findMany({ include: { permissions: true } }),
      );
    if (resource === "users") {
      if (method === "GET")
        return Response.json(
          await db.user.findMany({
            select: {
              id: true,
              name: true,
              email: true,
              roleName: true,
              enabled: true,
              groups: { include: { group: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 200,
          }),
        );
      if (method === "POST") {
        const data = z
          .object({
            name: z.string().min(1).max(100),
            email: z
              .email()
              .max(254)
              .transform((s) => s.toLowerCase()),
            password: z.string().min(16).max(256),
            roleName: roleSchema,
          })
          .strict()
          .parse(await readBody(request));
        const { password, ...rest } = data;
        const created = await db.$transaction(async (tx) => {
          const result = await tx.user.create({
            data: { ...rest, passwordHash: await hashPassword(password) },
          });
          await tx.auditLog.create({
            data: {
              actorId: user.id,
              action: "USER_CREATED",
              target: result.id,
              after: rest,
            },
          });
          return { id: result.id };
        });
        return Response.json(created, { status: 201 });
      }
      if (method === "PATCH") {
        const data = z
          .object({
            name: z.string().min(1).max(100).optional(),
            roleName: roleSchema.optional(),
            enabled: z.boolean().optional(),
            groups: z.array(z.string()).max(30).optional(),
            password: z.string().min(16).max(256).optional(),
          })
          .strict()
          .parse(await readBody(request));
        if (
          path[1] === user.id &&
          ((data.roleName && data.roleName !== "SUPER_ADMIN") ||
            data.enabled === false)
        )
          throw new HttpError(
            400,
            "You cannot remove your own administrator access",
          );
        await db.$transaction(async (tx) => {
          const previous = await tx.user.findUniqueOrThrow({
            where: { id: path[1] },
          });
          const { groups, password, ...rest } = data;
          await tx.user.update({
            where: { id: path[1] },
            data: {
              ...rest,
              ...(password
                ? { passwordHash: await hashPassword(password) }
                : {}),
              ...(groups
                ? {
                    groups: {
                      deleteMany: {},
                      create: groups.map((groupId) => ({ groupId })),
                    },
                  }
                : {}),
            },
          });
          if (password || data.enabled === false || data.roleName)
            await tx.session.deleteMany({ where: { userId: path[1] } });
          await tx.auditLog.create({
            data: {
              actorId: user.id,
              action: "PERMISSION_CHANGED",
              target: path[1],
              before: { role: previous.roleName, enabled: previous.enabled },
              after: { ...rest, groups, passwordChanged: Boolean(password) },
            },
          });
        });
        return Response.json({ ok: true });
      }
    }
    if (resource === "groups") {
      if (method === "GET")
        return Response.json(
          await db.group.findMany({ orderBy: { name: "asc" } }),
        );
      if (method === "POST") {
        const data = z
          .object({ name: z.string().min(1).max(100) })
          .strict()
          .parse(await readBody(request));
        return Response.json(await db.group.create({ data }), { status: 201 });
      }
    }
    throw new HttpError(404, "Endpoint not found");
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      return Response.json(
        { error: "That name or email is already in use" },
        { status: 409 },
      );
    return apiError(error);
  }
}
export {
  handle as GET,
  handle as POST,
  handle as PUT,
  handle as PATCH,
  handle as DELETE,
};
