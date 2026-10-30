#!/usr/bin/env node
// Grants or removes the admin role. The person must have signed up on the site first.
//
//   pnpm set-admin someone@example.com           make admin
//   pnpm set-admin someone@example.com --remove  back to a normal customer
//
// They need to sign out and back in (or wait up to an hour) to pick up the change.

import { getAdminAuth } from "../src/firebase.js";

const email = process.argv[2];
const remove = process.argv.includes("--remove");
if (!email || email.startsWith("--")) {
  console.error("Usage: pnpm set-admin <email> [--remove]");
  process.exit(1);
}

const auth = getAdminAuth();
let user;
try {
  user = await auth.getUserByEmail(email);
} catch {
  console.error(`No account for ${email}. Sign up on the website first, then run this again.`);
  process.exit(1);
}

const claims = { ...(user.customClaims ?? {}) };
if (remove) delete claims.admin;
else claims.admin = true;

await auth.setCustomUserClaims(user.uid, claims);
console.log(`${email} is ${remove ? "no longer an admin" : "now an admin"}.`);
