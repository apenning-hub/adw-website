#!/usr/bin/env bash
# Double-click this file to commit and push your local changes to GitHub.
# After Cloudflare Pages picks up the push, the live site updates in ~1–2 min.

cd "$(dirname "$0")" || exit 1

clear
echo "═══════════════════════════════════════════════════════"
echo "  ADW website — push to GitHub"
echo "═══════════════════════════════════════════════════════"
echo

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "✗ Not in a git repository. Aborting."
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi

echo "→ Local changes:"
git status --short
echo

if [ -z "$(git status --porcelain)" ]; then
  echo "✓ Nothing to commit. Pulling any remote updates anyway..."
  echo
  git pull --rebase origin main
  echo
  echo "✓ Up to date."
  read -n 1 -s -r -p "Press any key to close..."
  exit 0
fi

echo "───────────────────────────────────────────────────────"
read -r -p "Commit message (Enter for an auto-dated message): " MSG
echo

if [ -z "$MSG" ]; then
  MSG="Update content — $(date '+%Y-%m-%d %H:%M')"
fi

echo "→ Staging all changes..."
git add -A || { echo "✗ git add failed"; read -n 1 -s -r; exit 1; }

echo "→ Committing: $MSG"
git commit -m "$MSG" || { echo "✗ git commit failed"; read -n 1 -s -r; exit 1; }

echo "→ Pulling latest from GitHub (rebase) so we don't conflict..."
if ! git pull --rebase origin main; then
  echo
  echo "✗ Rebase hit a conflict. Open the repo in your editor and resolve manually."
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi

echo "→ Pushing to GitHub..."
if git push origin main; then
  echo
  echo "✓ Pushed successfully."
  echo "  Cloudflare Pages will redeploy in ~1–2 minutes."
else
  echo
  echo "✗ Push failed. Run \`git status\` to investigate."
fi

echo
read -n 1 -s -r -p "Press any key to close..."
