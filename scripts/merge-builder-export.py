#!/usr/bin/env python3
"""Merge a builder source export into this repo — SCREENS / CLIENT ONLY.

Usage:
    python3 scripts/merge-builder-export.py "<path to unzipped builder export folder>"

It copies the builder's src/ and public/ (and a short allow-list of root config files) into the
repo, and NEVER touches backend, deploy config, or files the repo owns (supabase/, netlify/,
scripts/, claude/, vite.config.ts, the service worker, redirects, etc.). After running, review the
diff with `git status` / `git diff` before committing.
"""
import os, shutil, sys

if len(sys.argv) < 2:
    print("Usage: python3 scripts/merge-builder-export.py '<unzipped export folder>'"); sys.exit(1)

EXPORT = sys.argv[1]
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Root files the builder is allowed to update (client/config it legitimately owns).
ROOTKEEP = {
    "package.json", "package-check.json",
    "tsconfig.json", "tsconfig.app.json", "tsconfig.node.json",
    "components.json", "eslint.config.js", "postcss.config.js",
    "tailwind.config.ts", "index.html",
}

# Directories the repo OWNS — an export must never overwrite these.
SKIP_DIRS = {".git", "node_modules", "dist", "supabase", "netlify", "scripts", "claude", ".netlify"}

# Individual files the repo owns (reliability / deploy config) — never overwrite from an export.
SKIP_FILES = {
    "vite.config.ts", "vitest.config.ts", "netlify.toml", ".gitignore",
    "public/_redirects", "public/sw.js", "README.md",
}

copied, skipped = 0, 0
for d, ds, fs in os.walk(EXPORT):
    ds[:] = [x for x in ds if x not in SKIP_DIRS]
    for f in fs:
        if f == ".DS_Store":
            continue
        rel = os.path.relpath(os.path.join(d, f), EXPORT).replace("\\", "/")
        top = rel.split("/")[0]
        allowed = (top == "src") or (top == "public") or (rel in ROOTKEEP)
        if rel in SKIP_FILES or not allowed:
            skipped += 1
            continue
        dest = os.path.join(REPO, rel)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        shutil.copyfile(os.path.join(EXPORT, rel), dest)
        copied += 1

print(f"Merged export: copied {copied} file(s), skipped {skipped}.")
print("Now review with:  git status   and   git diff   before committing.")
