// npm run encrypt-git-push — seal protected content, then commit + push everything as you, in one step.
//
//   npm run encrypt-git-push                 # commits with the default message
//   npm run encrypt-git-push -- "some note"  # optional one-off message override
//
// Steps: (1) node scripts/encrypt.mjs (idempotent — no-op if nothing changed), (2) git add -A,
// (3) commit with a fixed message, (4) git push. Skips the commit + push when the tree is clean.
//
// Note: this stages ALL working-tree changes (git add -A), not just drafts, and pushes to the
// current branch's upstream using your own git credentials. Edit DEFAULT_MESSAGE below to taste.

import { execFileSync } from "node:child_process";

const DEFAULT_MESSAGE = "update content";
const message = process.argv.slice(2).join(" ").trim() || DEFAULT_MESSAGE;

const git = (...args) => execFileSync("git", args, { stdio: "inherit" });
const gitOut = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();

try {
  // 1. seal drafts / master-key-protected content
  execFileSync("node", ["scripts/encrypt.mjs"], { stdio: "inherit" });

  // 2. stage everything
  git("add", "-A");

  // 3. commit only if there is actually something staged
  if (!gitOut("diff", "--cached", "--name-only")) {
    console.log("\nNothing to commit — working tree clean. Nothing pushed.");
    process.exit(0);
  }
  git("commit", "-m", message);

  // 4. push to the current branch's upstream
  git("push");
  console.log("\nDone — sealed, committed, and pushed.");
} catch (err) {
  console.error(`\nencrypt-git-push failed: ${err.message}`);
  process.exit(1);
}
