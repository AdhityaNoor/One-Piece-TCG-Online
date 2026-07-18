/**
 * One-time CLI bootstrap for the FIRST admin account — there is no public
 * signup route for admins by design (see adminAuth/routes.ts doc comment),
 * so this script is the only way to create one from nothing.
 *
 * Usage (from server/):
 *   npm run seed:admin -- --email admin@example.com --password 'something-long' --name "Ops Team"
 *
 * Requires the same MONGODB_URI env var the server itself uses. Safe to
 * re-run: if the email already exists, it updates the password/display name
 * instead of failing, so it also doubles as a password-reset tool for the
 * bootstrap account.
 */
import { connectMongo, closeMongo, admins } from '../db/mongo';
import { hashPassword } from '../auth/password';

function arg(name: string): string | null {
  const flag = `--${name}`;
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx + 1 >= process.argv.length) return null;
  return process.argv[idx + 1];
}

async function main(): Promise<void> {
  const email = arg('email');
  const password = arg('password');
  const displayName = arg('name') ?? 'Admin';

  if (!email || !password) {
    console.error('Usage: npm run seed:admin -- --email <email> --password <password> [--name "Display Name"]');
    process.exitCode = 1;
    return;
  }
  if (password.length < 12) {
    console.error('Admin passwords must be at least 12 characters.');
    process.exitCode = 1;
    return;
  }

  await connectMongo();
  const emailLower = email.trim().toLowerCase();
  const passwordHash = await hashPassword(password);
  const existing = await admins().findOne({ emailLower });

  if (existing) {
    await admins().updateOne({ _id: existing._id }, { $set: { passwordHash, displayName } });
    console.log(`Updated existing admin account: ${email}`);
  } else {
    await admins().insertOne({
      email: email.trim(),
      emailLower,
      displayName,
      passwordHash,
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
    });
    console.log(`Created admin account: ${email}`);
  }

  await closeMongo();
}

main().catch((err) => {
  console.error('[seed:admin] failed:', err);
  process.exitCode = 1;
});
