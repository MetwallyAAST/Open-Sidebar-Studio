ALTER TABLE "SidebarConfiguration" ADD CONSTRAINT "configuration_state" CHECK ("state" IN ('draft', 'published'));
ALTER TABLE "SidebarConfiguration" ADD CONSTRAINT "configuration_version" CHECK ("version" > 0 AND "schemaVersion" = 1);
ALTER TABLE "SidebarAssignment" ADD CONSTRAINT "assignment_target" CHECK (("userId" IS NOT NULL)::int + ("groupId" IS NOT NULL)::int = 1);
ALTER TABLE "SidebarItem" ADD CONSTRAINT "item_not_self_parent" CHECK ("parentId" IS NULL OR "parentId" <> "id");
ALTER TABLE "SidebarItem" ADD CONSTRAINT "item_order" CHECK ("order" >= 0);
ALTER TABLE "SidebarSection" ADD CONSTRAINT "section_order" CHECK ("order" >= 0);
