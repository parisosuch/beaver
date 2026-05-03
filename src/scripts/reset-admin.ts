import { parseArgs } from "util";
import { db } from "../lib/db/db";
import { users, sessions } from "../lib/db/schema";
import { eq } from "drizzle-orm";

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    username: { type: "string" },
    password: { type: "string" },
  },
  strict: true,
});

if (!values.username) {
  console.error("Usage: bun run reset-admin --username <username> [--password <password>]");
  process.exit(1);
}

const [user] = await db
  .select()
  .from(users)
  .where(eq(users.userName, values.username))
  .limit(1);

if (!user) {
  console.error(`Error: user "${values.username}" not found.`);
  process.exit(1);
}

if (!user.isAdmin) {
  console.error(`Error: "${values.username}" is not an admin. Use the admin panel to reset non-admin passwords.`);
  process.exit(1);
}

let newPassword = values.password ?? "";

if (!newPassword) {
  process.stdout.write("New password: ");
  newPassword = await new Promise<string>((resolve) => {
    let input = "";
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk: string) => {
      input += chunk;
      if (input.includes("\n")) {
        process.stdin.pause();
        resolve(input.trim());
      }
    });
  });
  process.stdout.write("\n");
}

if (newPassword.length < 8) {
  console.error("Error: password must be at least 8 characters.");
  process.exit(1);
}

const hashedPassword = await Bun.password.hash(newPassword);

await db
  .update(users)
  .set({ password: hashedPassword, tempPassword: null, mustChangePassword: false })
  .where(eq(users.id, user.id));

await db.delete(sessions).where(eq(sessions.userId, user.id));

console.log(`✓ Password reset for @${user.userName}. All sessions have been invalidated.`);
process.exit(0);
