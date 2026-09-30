import { PrismaClient } from "@prisma/client";
const globalDB = globalThis as unknown as { sidebarDB?: PrismaClient };
export const db = globalDB.sidebarDB ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalDB.sidebarDB = db;
