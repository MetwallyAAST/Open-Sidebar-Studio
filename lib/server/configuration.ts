import { Prisma } from "@prisma/client";
import { db } from "./db";
import { HttpError } from "./auth";
import { configSchema, type Config, type Identity } from "../sidebar/schema";
import { filterConfig } from "../sidebar/engine";
const include = {
  sections: {
    include: { roles: true },
    orderBy: [{ order: "asc" }, { id: "asc" }],
  },
  items: {
    include: { roles: true },
    orderBy: [{ order: "asc" }, { id: "asc" }],
  },
  themes: { orderBy: { id: "asc" } },
  permissions: true,
  assignments: true,
} satisfies Prisma.SidebarConfigurationInclude;
type Loaded = Prisma.SidebarConfigurationGetPayload<{
  include: typeof include;
}>;
type Tx = Prisma.TransactionClient;
const json = (value: unknown) =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
export function decode(row: Loaded): Config {
  return configSchema.parse({
    schemaVersion: row.schemaVersion,
    name: row.name,
    roles: row.permissions.map((p) => p.roleName),
    assignments: {
      users: row.assignments.flatMap((a) => (a.userId ? [a.userId] : [])),
      groups: row.assignments.flatMap((a) => (a.groupId ? [a.groupId] : [])),
    },
    branding: row.branding,
    behavior: row.behavior,
    appearance: row.appearance,
    animations: row.animations,
    activeTheme: row.activeTheme,
    themes: row.themes.map(({ id, name, light, dark }) => ({
      id,
      name,
      light,
      dark,
    })),
    sections: row.sections.map(({ configurationId, roles, ...s }) => {
      void configurationId;
      return { ...s, roles: roles.map((r) => r.roleName) };
    }),
    items: row.items.map(({ configurationId, roles, ...i }) => {
      void configurationId;
      return { ...i, roles: roles.map((r) => r.roleName) };
    }),
  });
}
export async function writeConfig(
  tx: Tx,
  sidebarId: string,
  state: string,
  config: Config,
  version: number,
) {
  const existing = await tx.sidebarConfiguration.findUnique({
    where: { sidebarId_state: { sidebarId, state } },
  });
  if (existing) {
    await tx.sidebarItem.updateMany({
      where: { configurationId: existing.id },
      data: { parentId: null },
    });
    await tx.sidebarConfiguration.delete({ where: { id: existing.id } });
  }
  const row = await tx.sidebarConfiguration.create({
    data: {
      sidebarId,
      state,
      name: config.name,
      version,
      schemaVersion: config.schemaVersion,
      branding: json(config.branding),
      behavior: json(config.behavior),
      appearance: json(config.appearance),
      animations: json(config.animations),
      activeTheme: config.activeTheme,
      permissions: { create: config.roles.map((roleName) => ({ roleName })) },
      assignments: {
        create: [
          ...config.assignments.users.map((userId) => ({ userId })),
          ...config.assignments.groups.map((groupId) => ({ groupId })),
        ],
      },
      themes: {
        create: config.themes.map((t) => ({
          ...t,
          light: json(t.light),
          dark: json(t.dark),
        })),
      },
      sections: {
        create: config.sections.map((s) => ({
          ...s,
          roles: { create: s.roles.map((roleName) => ({ roleName })) },
        })),
      },
    },
  });
  for (const item of config.items) {
    await tx.sidebarItem.create({
      data: {
        ...item,
        configurationId: row.id,
        parentId: null,
        roles: { create: item.roles.map((roleName) => ({ roleName })) },
      },
    });
  }
  for (const item of config.items)
    if (item.parentId)
      await tx.sidebarItem.update({
        where: { configurationId_id: { configurationId: row.id, id: item.id } },
        data: { parentId: item.parentId },
      });
  return row;
}
export async function readDraft(sidebarId = "reference") {
  const row = await db.sidebarConfiguration.findUnique({
    where: { sidebarId_state: { sidebarId, state: "draft" } },
    include,
  });
  if (!row) throw new HttpError(404, "Sidebar not found");
  return { config: decode(row), version: row.version, sidebarId };
}
function auditDiff(before: Config, after: Config) {
  const changes: {
    action: string;
    target: string;
    before?: unknown;
    after?: unknown;
  }[] = [];
  const old = new Map(before.items.map((i) => [i.id, i]));
  for (const item of after.items) {
    const previous = old.get(item.id);
    if (!previous)
      changes.push({
        action: "MENU_ITEM_CREATED",
        target: item.id,
        after: item,
      });
    else if (JSON.stringify(previous) !== JSON.stringify(item))
      changes.push({
        action:
          previous.order !== item.order ||
          previous.parentId !== item.parentId ||
          previous.sectionId !== item.sectionId
            ? "MENU_ITEM_REORDERED"
            : "MENU_ITEM_UPDATED",
        target: item.id,
        before: previous,
        after: item,
      });
    old.delete(item.id);
  }
  for (const item of old.values())
    changes.push({
      action: "MENU_ITEM_DELETED",
      target: item.id,
      before: item,
    });
  if (
    JSON.stringify(before.roles) !== JSON.stringify(after.roles) ||
    JSON.stringify(before.assignments) !== JSON.stringify(after.assignments) ||
    JSON.stringify(before.items.map((i) => i.roles)) !==
      JSON.stringify(after.items.map((i) => i.roles)) ||
    JSON.stringify(before.sections.map((s) => s.roles)) !==
      JSON.stringify(after.sections.map((s) => s.roles))
  )
    changes.push({
      action: "PERMISSION_CHANGED",
      target: after.name,
      before: before.roles,
      after: after.roles,
    });
  if (
    JSON.stringify(before.appearance) !== JSON.stringify(after.appearance) ||
    JSON.stringify(before.themes) !== JSON.stringify(after.themes)
  )
    changes.push({
      action: "THEME_UPDATED",
      target: after.activeTheme,
      before: before.appearance,
      after: after.appearance,
    });
  return changes;
}
export async function mutateConfig(
  sidebarId: string,
  actorId: string,
  expectedVersion: number,
  action: "save" | "publish" | "discard" | "restore",
  input?: unknown,
  revisionId?: string,
) {
  return db.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Sidebar" WHERE id = ${sidebarId} FOR UPDATE`;
      const row = await tx.sidebarConfiguration.findUnique({
        where: { sidebarId_state: { sidebarId, state: "draft" } },
        include,
      });
      if (!row) throw new HttpError(404, "Sidebar not found");
      if (row.version !== expectedVersion)
        throw new HttpError(409, "A newer draft exists. Reload before saving.");
      const before = decode(row);
      let config = before;
      if (action === "save") config = configSchema.parse(input);
      if (action === "discard") {
        const published = await tx.sidebarConfiguration.findUnique({
          where: { sidebarId_state: { sidebarId, state: "published" } },
          include,
        });
        if (!published) throw new HttpError(404, "No published version");
        config = decode(published);
      }
      if (action === "restore") {
        const revision = await tx.sidebarRevision.findFirst({
          where: { id: revisionId, sidebarId },
        });
        if (!revision) throw new HttpError(404, "Revision not found");
        config = configSchema.parse(revision.snapshot);
      }
      const version = row.version + 1;
      await writeConfig(tx, sidebarId, "draft", config, version);
      if (action === "publish")
        await writeConfig(tx, sidebarId, "published", config, version);
      const event =
        action === "publish"
          ? "SIDEBAR_CONFIGURATION_PUBLISHED"
          : action === "restore"
            ? "SIDEBAR_CONFIGURATION_RESTORED"
            : action === "discard"
              ? "DRAFT_DISCARDED"
              : "DRAFT_SAVED";
      await tx.sidebarRevision.create({
        data: {
          sidebarId,
          actorId,
          action: event,
          snapshot: json(config),
          version,
        },
      });
      for (const change of [
        ...auditDiff(before, config),
        {
          action: event,
          target: sidebarId,
          before: undefined,
          after: { version },
        },
      ])
        await tx.auditLog.create({
          data: {
            sidebarId,
            actorId,
            action: change.action,
            target: change.target,
            before:
              change.before === undefined ? Prisma.DbNull : json(change.before),
            after:
              change.after === undefined ? Prisma.DbNull : json(change.after),
          },
        });
      return { config, version, sidebarId };
    },
    { timeout: 20000 },
  );
}
const publishedCache = new Map<string, { config: Config; version: number }>();
export async function publishedConfig(identity: Identity) {
  const rows = await db.sidebarConfiguration.findMany({
    where: { state: "published" },
    select: {
      id: true,
      version: true,
      sidebar: { select: { priority: true } },
    },
    orderBy: { sidebar: { priority: "desc" } },
  });
  for (const row of rows) {
    let cached = publishedCache.get(row.id);
    if (!cached || cached.version !== row.version) {
      const full = await db.sidebarConfiguration.findUniqueOrThrow({
        where: { id: row.id },
        include,
      });
      cached = { config: decode(full), version: row.version };
      if (publishedCache.size > 30) publishedCache.clear();
      publishedCache.set(row.id, cached);
    }
    const result = filterConfig(cached.config, identity);
    if (result) {
      for (const item of result.items) {
        if (item.badgeProvider !== "static")
          item.badge = await badgeProviders[item.badgeProvider](identity);
      }
      return result;
    }
  }
  throw new HttpError(
    403,
    "No navigation configuration is available for this account",
  );
}
// Host applications update BadgeValue or replace these providers with authorized queries.
async function badgeValue(identity: Identity, provider: string) {
  return (
    (
      await db.badgeValue.findUnique({
        where: { userId_provider: { userId: identity.id, provider } },
      })
    )?.value ?? "0"
  );
}
export const badgeProviders = {
  unread: (identity: Identity) => badgeValue(identity, "unread"),
  pendingOrders: (identity: Identity) => badgeValue(identity, "pendingOrders"),
};
