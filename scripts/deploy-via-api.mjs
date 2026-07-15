import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

const TOKEN = process.env.GH_TOKEN;
const OWNER = "souzafabricio28-blip";
const REPO = "receita-justa";
const BRANCH = "main";
const ROOT = process.cwd();

const IGNORE = new Set([
  ".next", "node_modules", ".git", ".vercel",
  "package-lock.json", "dev.db",
  ".env",
  "scripts/deploy-via-api.mjs",
]);

async function api(path, opts = {}) {
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      "User-Agent": "opencode-deploy",
      ...opts.headers,
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub API ${res.status}: ${err}`);
  }
  return res.json();
}

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

async function main() {
  console.log("Scanning files...");
  const files = walk(ROOT).filter((f) => !f.includes("node_modules") && !f.includes(".next"));
  console.log(`Found ${files.length} files`);

  // Get current branch ref
  const ref = await api(`/git/refs/heads/${BRANCH}`);
  console.log(`Current HEAD: ${ref.object.sha}`);

  // Create blobs for each file
  console.log("Creating blobs...");
  const treeItems = [];
  for (const file of files) {
    const content = readFileSync(file);
    const isText = file.match(/\.(ts|tsx|js|mjs|json|css|prisma|env|toml|md|ps1|txt|mts)$/);
    
    let blob;
    if (isText) {
      blob = await api("/git/blobs", {
        method: "POST",
        body: JSON.stringify({ content: content.toString("utf-8"), encoding: "utf-8" }),
      });
    } else {
      blob = await api("/git/blobs", {
        method: "POST",
        body: JSON.stringify({ content: content.toString("base64"), encoding: "base64" }),
      });
    }

    const relPath = relative(ROOT, file).replace(/\\/g, "/");
    treeItems.push({
      path: relPath,
      mode: "100644",
      type: "blob",
      sha: blob.sha,
    });
  }

  // Create tree
  console.log("Creating tree...");
  const tree = await api("/git/trees", {
    method: "POST",
    body: JSON.stringify({
      base_tree: ref.object.sha,
      tree: treeItems,
    }),
  });

  // Create commit
  console.log("Creating commit...");
  const commit = await api("/git/commits", {
    method: "POST",
    body: JSON.stringify({
      message: "feat: overhaul completa - services, schema, seguranca, neon db",
      tree: tree.sha,
      parents: [ref.object.sha],
    }),
  });

  // Update branch
  console.log("Updating branch...");
  await api(`/git/refs/heads/${BRANCH}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commit.sha, force: false }),
  });

  console.log(`✅ Deploy triggered! SHA: ${commit.sha}`);
  console.log(`URL: https://github.com/${OWNER}/${REPO}/commit/${commit.sha}`);
}

main().catch(console.error);
