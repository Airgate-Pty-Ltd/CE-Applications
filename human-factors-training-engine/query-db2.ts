import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
async function main() {
  const lesson = await p.$queryRawUnsafe("SELECT * FROM lesson_learned WHERE id='cmsployr00000j4bdj99s831k';");
  const colRaw = await p.$queryRawUnsafe("PRAGMA table_info(mai_content_revision_proposal);") as any[];
  const cols = colRaw.map((r: any) => ({ cid: Number(r.cid), name: r.name, type: r.type }));
  const intCols = await p.$queryRawUnsafe("PRAGMA table_info(learning_intervention);") as any[];
  const intColNames = intCols.map((r: any) => r.name);
  console.log(JSON.stringify({ lesson, cols, intColNames }, null, 2));
  await p.$disconnect();
}
main().catch(e => { console.error(e.message); process.exit(1); });
