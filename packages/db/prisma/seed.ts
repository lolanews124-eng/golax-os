import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";

const prisma = new PrismaClient();

// NOTE: this is a placeholder seed. The real password hashing happens in the
// API using bcrypt. Here we only insert a demo user so the dashboard has data.
function quickHash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function main() {
  const email = "demo@golax.os";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Demo user already exists:", email);
    return;
  }

  const user = await prisma.user.create({
    data: {
      name: "Demo User",
      email,
      // Replace via API register; this is not a valid bcrypt hash.
      passwordHash: quickHash("changeme"),
    },
  });

  console.log("Seeded demo user:", user.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
