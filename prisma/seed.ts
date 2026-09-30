import { db } from "../lib/server/db";
import { hashPassword } from "../lib/server/password";
import { writeConfig } from "../lib/server/configuration";
import { referenceConfig, operationsConfig } from "../lib/sidebar/defaults";
import { ROLES } from "../lib/sidebar/schema";
const email = process.env.SEED_ADMIN_EMAIL;
const password = process.env.SEED_ADMIN_PASSWORD;
if (!email || !password || password.length < 16)
  throw new Error(
    "Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (at least 16 characters).",
  );
async function main() {
  for (const name of [
    "sidebar:read",
    "sidebar:write",
    "sidebar:publish",
    "access:manage",
  ])
    await db.permission.upsert({
      where: { name },
      create: { name },
      update: {},
    });
  for (const name of ROLES) {
    await db.role.upsert({ where: { name }, create: { name }, update: {} });
    const permissions =
      name === "SUPER_ADMIN"
        ? ["sidebar:read", "sidebar:write", "sidebar:publish", "access:manage"]
        : name === "ADMIN"
          ? ["sidebar:read", "sidebar:write", "sidebar:publish"]
          : name === "EDITOR"
            ? ["sidebar:read"]
            : [];
    for (const permissionName of permissions)
      await db.rolePermission.upsert({
        where: { roleName_permissionName: { roleName: name, permissionName } },
        create: { roleName: name, permissionName },
        update: {},
      });
  }
  const user = await db.user.upsert({
    where: { email: email! },
    create: {
      email: email!,
      name: "Studio Admin",
      passwordHash: await hashPassword(password!),
      roleName: "SUPER_ADMIN",
    },
    update: {},
  });
  for (const [provider, value] of [
    ["unread", "12"],
    ["pendingOrders", "5"],
  ])
    await db.badgeValue.upsert({
      where: { userId_provider: { userId: user.id, provider } },
      create: { userId: user.id, provider, value },
      update: {},
    });
  await db.$transaction(
    async (tx) => {
      const existing = await tx.sidebar.findUnique({
        where: { id: "reference" },
      });
      if (!existing) {
        await tx.sidebar.create({
          data: { id: "reference", name: "Reference Sidebar" },
        });
        await writeConfig(tx, "reference", "draft", referenceConfig, 1);
        await writeConfig(tx, "reference", "published", referenceConfig, 1);
        await tx.sidebarRevision.create({
          data: {
            sidebarId: "reference",
            actorId: user.id,
            action: "INITIAL_CONFIGURATION",
            snapshot: referenceConfig,
            version: 1,
          },
        });
      }
    },
    { timeout: 20000 },
  );
  for (const [id, config, protectedPreset] of [
    ["reference", referenceConfig, true],
    ["operations", operationsConfig, false],
  ] as const)
    await db.preset.upsert({
      where: { id },
      create: {
        id,
        name: config.name,
        snapshot: config,
        protected: protectedPreset,
      },
      update: {},
    });
  console.log(
    "Seed complete. Existing passwords and configuration were preserved.",
  );
}
main().finally(() => db.$disconnect());
