import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const errors = [];
const htmlFiles = (await readdir(root)).filter((name) => name.endsWith(".html"));

function fail(message) { errors.push(message); }
function stripQueryHash(value) { return value.split(/[?#]/, 1)[0]; }

const pages = new Map();
for (const file of htmlFiles) {
  const source = await readFile(path.join(root, file), "utf8");
  const ids = [...source.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) fail(`${file}: duplicate id "${id}"`);
    seen.add(id);
  }
  pages.set(file, { source, ids: seen });
}

for (const [file, page] of pages) {
  const refs = [
    ...page.source.matchAll(/\b(?:href|src)\s*=\s*["']([^"']+)["']/gi),
  ];
  for (const match of refs) {
    const raw = match[1].trim();
    if (!raw || /^(?:[a-z]+:|\/\/|#|\{)/i.test(raw)) {
      if (raw.startsWith("#") && raw.length > 1 && !page.ids.has(decodeURIComponent(raw.slice(1)))) {
        fail(`${file}: missing in-page fragment "${raw}"`);
      }
      continue;
    }
    const localPath = stripQueryHash(raw);
    if (!localPath) continue;
    const resolved = path.resolve(root, path.dirname(file), decodeURIComponent(localPath));
    if (!resolved.startsWith(root + path.sep)) {
      fail(`${file}: reference escapes repository root: "${raw}"`);
      continue;
    }
    try {
      const info = await stat(resolved);
      if (!info.isFile()) fail(`${file}: reference is not a file: "${raw}"`);
      if (raw.includes("#") && path.extname(resolved) === ".html") {
        const fragment = decodeURIComponent(raw.split("#").slice(1).join("#"));
        if (fragment) {
          const targetName = path.relative(root, resolved);
          const target = pages.get(targetName);
          if (target && !target.ids.has(fragment)) fail(`${file}: ${raw} points to missing fragment "${fragment}"`);
        }
      }
    } catch {
      fail(`${file}: missing local reference "${raw}"`);
    }
  }
}

const chessHtml = pages.get("multiplayer-chess.html")?.source ?? "";
const chessSql = await readFile(path.join(root, "supabase/live-chess-moves.sql"), "utf8").catch(() => "");
const edgePath = path.join(root, "supabase/functions/submit-chess-move/index.ts");
const edge = await readFile(edgePath, "utf8").catch(() => "");
if (!chessHtml.includes("functions.invoke('submit-chess-move'")) fail("multiplayer-chess.html must submit moves through the submit-chess-move Edge Function");
if (chessHtml.includes("rpc('submit_chess_move'")) fail("multiplayer-chess.html still calls the retired client-side chess RPC");
if (!edge.includes('npm:chess.js@1.4.0')) fail("Chess Edge Function must use chess.js to validate moves");
if (!edge.includes("It is not your turn.")) fail("Chess Edge Function must enforce turn order");
if (!edge.includes("auth.getUser()")) fail("Chess Edge Function must authenticate the caller");
if (!edge.includes("submit_validated_chess_move")) fail("Chess Edge Function must persist through the restricted atomic RPC");
if (!chessSql.includes("grant execute on function public.submit_validated_chess_move") || !chessSql.includes("to service_role")) fail("Chess move RPC must be restricted to service_role");
if (!chessSql.includes("from public, anon, authenticated")) fail("Chess move RPC must revoke client execution privileges");
if (chessSql.includes("create or replace function public.submit_chess_move")) fail("Retired client-callable chess RPC must not be recreated");

if (errors.length) {
  console.error("Nexora Play validation failed:");
  for (const error of errors) console.error(` - ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Nexora Play validation passed: ${htmlFiles.length} HTML pages, local references, IDs, and chess server-validation guardrails checked.`);
}
