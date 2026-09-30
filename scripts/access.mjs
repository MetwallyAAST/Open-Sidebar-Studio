import { writeFileSync } from "node:fs";
process.loadEnvFile(".env");
writeFileSync(
  "LOCAL_ACCESS.md",
  `# Local access\n\nOpen ${process.env.APP_ORIGIN}/login\n\nEmail: ${process.env.SEED_ADMIN_EMAIL}\n\nPassword: ${process.env.SEED_ADMIN_PASSWORD}\n\nThis file and .env contain local secrets and are excluded from Git. Rotate the password in Users & roles before sharing this installation.\n`,
);
console.log(
  "Local sign-in details written to LOCAL_ACCESS.md (excluded from Git).",
);
