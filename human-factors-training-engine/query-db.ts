import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
async function main() {
  const orgs = await p.$queryRawUnsafe("SELECT id, name FROM Organization LIMIT 5;");
  const profiles = await p.$queryRawUnsafe("SELECT * FROM mai_authority_profile LIMIT 1;");
  const lessons = await p.$queryRawUnsafe("SELECT id, status, title FROM lesson_learned LIMIT 5;");
  const users = await p.$queryRawUnsafe("SELECT id, email FROM User LIMIT 3;");
  console.log(JSON.stringify({ orgs, profiles, lessons, users }, null, 2));
  await p.$disconnect();
}
main().catch(e => { console.error(e.message); process.exit(1); });
