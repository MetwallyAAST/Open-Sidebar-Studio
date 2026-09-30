-- CreateTable
CREATE TABLE "Role" (
    "name" TEXT NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "Permission" (
    "name" TEXT NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("name")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleName" TEXT NOT NULL,
    "permissionName" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleName","permissionName")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "roleName" TEXT NOT NULL DEFAULT 'USER',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserGroup" (
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,

    CONSTRAINT "UserGroup_pkey" PRIMARY KEY ("userId","groupId")
);

-- CreateTable
CREATE TABLE "Sidebar" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Sidebar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SidebarConfiguration" (
    "id" TEXT NOT NULL,
    "sidebarId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "version" INTEGER NOT NULL DEFAULT 1,
    "branding" JSONB NOT NULL,
    "behavior" JSONB NOT NULL,
    "appearance" JSONB NOT NULL,
    "animations" JSONB NOT NULL,
    "activeTheme" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SidebarConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SidebarSection" (
    "id" TEXT NOT NULL,
    "configurationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "hideLabel" BOOLEAN NOT NULL,
    "order" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "collapsible" BOOLEAN NOT NULL,
    "defaultExpanded" BOOLEAN NOT NULL,
    "footer" BOOLEAN NOT NULL,

    CONSTRAINT "SidebarSection_pkey" PRIMARY KEY ("configurationId","id")
);

-- CreateTable
CREATE TABLE "SidebarItem" (
    "id" TEXT NOT NULL,
    "configurationId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "parentId" TEXT,
    "label" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "newTab" BOOLEAN NOT NULL,
    "order" INTEGER NOT NULL,
    "activeMatch" TEXT NOT NULL,
    "activePattern" TEXT NOT NULL,
    "tooltip" TEXT NOT NULL,
    "badge" TEXT NOT NULL,
    "badgeColor" TEXT NOT NULL,
    "badgeProvider" TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "visible" BOOLEAN NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "archived" BOOLEAN NOT NULL,
    "action" TEXT NOT NULL,

    CONSTRAINT "SidebarItem_pkey" PRIMARY KEY ("configurationId","id")
);

-- CreateTable
CREATE TABLE "SidebarTheme" (
    "id" TEXT NOT NULL,
    "configurationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "light" JSONB NOT NULL,
    "dark" JSONB NOT NULL,

    CONSTRAINT "SidebarTheme_pkey" PRIMARY KEY ("configurationId","id")
);

-- CreateTable
CREATE TABLE "SidebarPermission" (
    "configurationId" TEXT NOT NULL,
    "roleName" TEXT NOT NULL,

    CONSTRAINT "SidebarPermission_pkey" PRIMARY KEY ("configurationId","roleName")
);

-- CreateTable
CREATE TABLE "SidebarAssignment" (
    "id" TEXT NOT NULL,
    "configurationId" TEXT NOT NULL,
    "userId" TEXT,
    "groupId" TEXT,

    CONSTRAINT "SidebarAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SectionRole" (
    "configurationId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "roleName" TEXT NOT NULL,

    CONSTRAINT "SectionRole_pkey" PRIMARY KEY ("configurationId","sectionId","roleName")
);

-- CreateTable
CREATE TABLE "ItemRole" (
    "configurationId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "roleName" TEXT NOT NULL,

    CONSTRAINT "ItemRole_pkey" PRIMARY KEY ("configurationId","itemId","roleName")
);

-- CreateTable
CREATE TABLE "SidebarRevision" (
    "id" TEXT NOT NULL,
    "sidebarId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "version" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SidebarRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "sidebarId" TEXT,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Preset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "protected" BOOLEAN NOT NULL DEFAULT false,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Preset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginAttempt" (
    "key" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginAttempt_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Group_name_key" ON "Group"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SidebarConfiguration_sidebarId_state_key" ON "SidebarConfiguration"("sidebarId", "state");

-- CreateIndex
CREATE INDEX "SidebarSection_configurationId_order_idx" ON "SidebarSection"("configurationId", "order");

-- CreateIndex
CREATE INDEX "SidebarItem_configurationId_sectionId_parentId_order_idx" ON "SidebarItem"("configurationId", "sectionId", "parentId", "order");

-- CreateIndex
CREATE INDEX "SidebarAssignment_configurationId_idx" ON "SidebarAssignment"("configurationId");

-- CreateIndex
CREATE INDEX "SidebarRevision_sidebarId_createdAt_idx" ON "SidebarRevision"("sidebarId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_sidebarId_createdAt_idx" ON "AuditLog"("sidebarId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Preset_name_key" ON "Preset"("name");

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleName_fkey" FOREIGN KEY ("roleName") REFERENCES "Role"("name") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionName_fkey" FOREIGN KEY ("permissionName") REFERENCES "Permission"("name") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleName_fkey" FOREIGN KEY ("roleName") REFERENCES "Role"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGroup" ADD CONSTRAINT "UserGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGroup" ADD CONSTRAINT "UserGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SidebarConfiguration" ADD CONSTRAINT "SidebarConfiguration_sidebarId_fkey" FOREIGN KEY ("sidebarId") REFERENCES "Sidebar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SidebarSection" ADD CONSTRAINT "SidebarSection_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "SidebarConfiguration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SidebarItem" ADD CONSTRAINT "SidebarItem_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "SidebarConfiguration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SidebarItem" ADD CONSTRAINT "SidebarItem_configurationId_sectionId_fkey" FOREIGN KEY ("configurationId", "sectionId") REFERENCES "SidebarSection"("configurationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SidebarItem" ADD CONSTRAINT "SidebarItem_configurationId_parentId_fkey" FOREIGN KEY ("configurationId", "parentId") REFERENCES "SidebarItem"("configurationId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "SidebarTheme" ADD CONSTRAINT "SidebarTheme_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "SidebarConfiguration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SidebarPermission" ADD CONSTRAINT "SidebarPermission_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "SidebarConfiguration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SidebarPermission" ADD CONSTRAINT "SidebarPermission_roleName_fkey" FOREIGN KEY ("roleName") REFERENCES "Role"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SidebarAssignment" ADD CONSTRAINT "SidebarAssignment_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "SidebarConfiguration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SidebarAssignment" ADD CONSTRAINT "SidebarAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SidebarAssignment" ADD CONSTRAINT "SidebarAssignment_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionRole" ADD CONSTRAINT "SectionRole_configurationId_sectionId_fkey" FOREIGN KEY ("configurationId", "sectionId") REFERENCES "SidebarSection"("configurationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionRole" ADD CONSTRAINT "SectionRole_roleName_fkey" FOREIGN KEY ("roleName") REFERENCES "Role"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemRole" ADD CONSTRAINT "ItemRole_configurationId_itemId_fkey" FOREIGN KEY ("configurationId", "itemId") REFERENCES "SidebarItem"("configurationId", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemRole" ADD CONSTRAINT "ItemRole_roleName_fkey" FOREIGN KEY ("roleName") REFERENCES "Role"("name") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SidebarRevision" ADD CONSTRAINT "SidebarRevision_sidebarId_fkey" FOREIGN KEY ("sidebarId") REFERENCES "Sidebar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SidebarRevision" ADD CONSTRAINT "SidebarRevision_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_sidebarId_fkey" FOREIGN KEY ("sidebarId") REFERENCES "Sidebar"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
