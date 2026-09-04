#!/usr/bin/env node
/**
 * graphify.mjs — Generate docs/architecture-graph.svg from the repo's import graph.
 *
 * Strategy (in order):
 *   1. If `madge` is installed → use it to emit a DOT/SVG graph.
 *   2. Else if `dependency-cruiser` is installed → use it.
 *   3. Else → regex-parse `import`/`require` statements in src/ and emit a simple SVG.
 *
 * Always exits 0 (warning on stderr if no tool available and fallback graph is minimal).
 * Never throws in CI — missing optional deps are gracefully skipped.
 */

import { execSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const SRC_DIR = 'src';
const OUT_SVG = 'docs/architecture-graph.svg';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function hasBin(bin) {
  try {
    execSync(`node -e "require.resolve('${bin}/package.json')"`, { stdio: 'ignore' });
    return true;
  } catch { /* ignore */ }
  // Also try npx --no-install
  const r = spawnSync('npx', ['--no-install', bin, '--version'], { stdio: 'ignore', timeout: 5000 });
  return r.status === 0;
}

function hasDep(pkg) {
  try { execSync(`node -e "require.resolve('${pkg}/package.json')"`, { stdio: 'ignore' }); return true; } catch { return false; }
}

function ensureOutDir() {
  const dir = path.dirname(OUT_SVG);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

// ---------------------------------------------------------------------------
// 1) madge path
// ---------------------------------------------------------------------------
function tryMadge() {
  // madge --image docs/architecture-graph.svg src --extensions ts,tsx,js,jsx --image
  // madge can emit svg via graphviz or built-in dot. We try --image and fall back to --dot.
  if (!hasDep('madge') && !hasBin('madge')) return false;
  try {
    ensureOutDir();
    // Try svg via madge image output (requires graphviz `dot` on PATH)
    const cmd = `npx --no-install madge --image "${OUT_SVG}" --extensions ts,tsx,js,jsx "${SRC_DIR}" 2>&1 || npx madge --image "${OUT_SVG}" --extensions ts,tsx,js,jsx "${SRC_DIR}" 2>&1`;
    execSync(cmd, { stdio: 'pipe', timeout: 30000 });
    if (existsSync(OUT_SVG) && statSync(OUT_SVG).size > 0) {
      console.log(`[graphify] Generated ${OUT_SVG} via madge.`);
      return true;
    }
  } catch (e) {
    const msg = e?.stdout?.toString() || e?.stderr?.toString() || e?.message || '';
    // If graphviz missing, madge writes a .dot file — convert if possible
    const dotPath = OUT_SVG.replace(/\.svg$/, '.dot');
    if (existsSync(dotPath)) {
      try {
        execSync(`dot -Tsvg "${dotPath}" -o "${OUT_SVG}"`, { stdio: 'pipe', timeout: 15000 });
        console.log(`[graphify] Generated ${OUT_SVG} via madge (.dot → svg).`);
        return true;
      } catch { /* graphviz not installed */ }
      console.warn(`[graphify] madge produced ${dotPath} but graphviz 'dot' is not available — falling back to regex graph.`);
      return false;
    }
    console.warn(`[graphify] madge failed: ${msg.split('\n').slice(0, 3).join(' ') } — trying next strategy.`);
  }
  return false;
}

// ---------------------------------------------------------------------------
// 2) dependency-cruiser path
// ---------------------------------------------------------------------------
function tryDepCruiser() {
  if (!hasDep('dependency-cruiser') && !hasBin('depcruise')) return false;
  // Try common bin names
  const bins = ['depcruise', 'dependency-cruiser'];
  for (const bin of bins) {
    try {
      ensureOutDir();
      // dependency-cruiser can output dot: depcruise --output-type dot src | dot -Tsvg > docs/architecture-graph.svg
      const dotTmp = OUT_SVG.replace(/\.svg$/, '.dot');
      const cmd = `npx --no-install ${bin} --output-type dot "${SRC_DIR}" > "${dotTmp}" 2>&1 || npx ${bin} --output-type dot "${SRC_DIR}" > "${dotTmp}" 2>&1`;
      execSync(cmd, { stdio: 'pipe', timeout: 30000 });
      if (existsSync(dotTmp) && statSync(dotTmp).size > 0) {
        try {
          execSync(`dot -Tsvg "${dotTmp}" -o "${OUT_SVG}"`, { stdio: 'pipe', timeout: 15000 });
          console.log(`[graphify] Generated ${OUT_SVG} via ${bin} (.dot → svg).`);
          return true;
        } catch {
          // No graphviz — keep the .dot as artifact and fall back
          console.warn(`[graphify] ${bin} produced ${dotTmp} but graphviz 'dot' not available — falling back to regex graph.`);
          return false;
        }
      }
    } catch { /* try next bin */ }
  }
  return false;
}

// ---------------------------------------------------------------------------
// 3) Fallback — regex import graph → SVG
// ---------------------------------------------------------------------------
const IMPORT_RE = /^\s*import\s+(?:[^'"]*from\s+)?['"]([^'"]+)['"]/gm;
const REQUIRE_RE = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
const DYNAMIC_IMPORT_RE = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

function walkFiles(dir, exts) {
  const out = [];
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', '.next', 'dist', 'build', '.git', 'coverage'].includes(e.name)) continue;
      out.push(...walkFiles(full, exts));
    } else if (exts.some(ext => full.endsWith(ext))) {
      out.push(full);
    }
  }
  return out;
}

function topoLabel(filePath) {
  // Group by top-level directory under src (components, pages, hooks, utils, etc.)
  const rel = filePath.replace(/\\/g, '/');
  const m = rel.match(/^src\/([^/]+)(?:\/|$)/);
  return m ? `src/${m[1]}` : 'src';
}

function buildFallbackGraph() {
  const files = walkFiles(SRC_DIR, ['.ts', '.tsx', '.js', '.jsx']);
  if (files.length === 0) {
    console.warn('[graphify] No source files found — writing placeholder graph.');
    return { nodes: new Set(['(empty)']), edges: [] };
  }

  // Collect edges at file granularity, then roll up to group granularity
  const fileEdges = [];
  const fileNodes = new Set();

  for (const file of files) {
    const rel = file.replace(/\\/g, '/');
    fileNodes.add(rel);
    let content;
    try { content = readFileSync(file, 'utf8'); } catch { continue; }
    const specs = new Set();
    for (const m of content.matchAll(IMPORT_RE)) specs.add(m[1]);
    for (const m of content.matchAll(REQUIRE_RE)) specs.add(m[1]);
    for (const m of content.matchAll(DYNAMIC_IMPORT_RE)) specs.add(m[1]);

    for (const spec of specs) {
      if (!spec.startsWith('.') && !spec.startsWith('@/') && !spec.startsWith('src/')) continue; // external dep — skip
      // Resolve relative spec to a rel path (best-effort, no FS check)
      let target = spec;
      if (spec.startsWith('.')) {
        const base = path.posix.dirname(rel);
        target = path.posix.join(base, spec);
        // normalize . and .. segments
        target = path.posix.normalize(target);
      } else if (spec.startsWith('@/')) {
        target = 'src/' + spec.slice(2);
      }
      // Strip extension if present, keep as prefix match
      target = target.replace(/\.(ts|tsx|js|jsx)$/, '');
      // Find the actual file(s) that match this prefix
      // Edge at group level is enough: map both endpoints to groups
      const srcGroup = topoLabel(rel);
      // Try to find best matching file for target
      let tgtGroup = null;
      for (const f of files) {
        const fNoExt = f.replace(/\\/g, '/').replace(/\.(ts|tsx|js|jsx)$/, '');
        if (fNoExt === target || fNoExt === target + '/index') { tgtGroup = topoLabel(f); break; }
      }
      if (!tgtGroup) {
        // Derive group from target path directly if file not found
        tgtGroup = topoLabel(target);
        if (tgtGroup === 'src' && !target.startsWith('src/')) tgtGroup = null;
      }
      if (tgtGroup && srcGroup !== tgtGroup) {
        fileEdges.push([srcGroup, tgtGroup]);
      }
    }
  }

  // Roll up to group graph
  const nodes = new Set();
  const edgeSet = new Set();
  const edges = [];
  for (const f of files) nodes.add(topoLabel(f));
  for (const [a, b] of fileEdges) {
    const k = `${a}→${b}`;
    if (!edgeSet.has(k)) { edgeSet.add(k); edges.push([a, b]); }
  }
  return { nodes, edges, fileCount: files.length };
}

function renderSvg({ nodes, edges, fileCount }) {
  const nodeList = [...nodes].sort();
  const W = 960;
  const H = Math.max(320, 120 + nodeList.length * 56);
  const BOX_W = 220;
  const BOX_H = 36;
  const GAP_Y = 16;
  const COLS = 3;
  const COL_W = Math.floor((W - 40) / COLS);
  const START_X = 20;
  const START_Y = 60;

  // Position nodes in columns
  const pos = new Map();
  nodeList.forEach((n, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const x = START_X + col * COL_W + (COL_W - BOX_W) / 2;
    const y = START_Y + row * (BOX_H + GAP_Y);
    pos.set(n, { x, y, cx: x + BOX_W / 2, cy: y + BOX_H / 2 });
  });

  // Build SVG string
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const edgeLines = edges.map(([a, b]) => {
    const pa = pos.get(a), pb = pos.get(b);
    if (!pa || !pb) return '';
    // Simple straight arrow; color by source hue
    return `  <line x1="${pa.cx}" y1="${pa.cy}" x2="${pb.cx}" y2="${pb.cy}" stroke="#00f0ff" stroke-opacity="0.35" stroke-width="1.5" marker-end="url(#arrow)" />`;
  }).filter(Boolean).join('\n');

  const boxes = nodeList.map(n => {
    const p = pos.get(n);
    // Color by group
    const palette = {
      'src/components': '#00f0ff', 'src/pages': '#ff00aa', 'src/hooks': '#ffaa00',
      'src/utils': '#39ff14', 'src/styles': '#8a2be2', 'src/config': '#00aaff',
      'src/types': '#b8b8c0',
    };
    const stroke = palette[n] || '#4a4a4a';
    return `  <g>
    <rect x="${p.x}" y="${p.y}" width="${BOX_W}" height="${BOX_H}" rx="6" fill="#1a1a1a" stroke="${stroke}" stroke-width="1.2" />
    <text x="${p.cx}" y="${p.cy + 5}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="11" fill="#ffffff">${esc(n)}</text>
  </g>`;
  }).join('\n');

  const timestamp = new Date().toISOString();
  const subtitle = fileCount ? `${fileCount} files · ${edges.length} group edges · regex fallback` : `${edges.length} edges · regex fallback`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="title desc">
  <title id="title">Architecture graph — portfolio</title>
  <desc id="desc">Import graph grouped by src/* top-level directory. Generated ${timestamp} (fallback regex).</desc>
  <rect width="100%" height="100%" fill="#0a0a0a" />
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#00f0ff" fill-opacity="0.6" />
    </marker>
  </defs>
  <text x="${W / 2}" y="28" text-anchor="middle" font-family="Audiowide, sans-serif" font-size="14" letter-spacing="0.08em" fill="#ffffff">ARCHITECTURE GRAPH</text>
  <text x="${W / 2}" y="46" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" fill="#8a8a92">${esc(subtitle)}</text>
${edgeLines}
${boxes}
  <text x="${W - 10}" y="${H - 8}" text-anchor="end" font-family="JetBrains Mono, monospace" font-size="8" fill="#4a4a4a">generated ${esc(timestamp)} — install madge or dependency-cruiser for a richer graph</text>
</svg>
`;
}

function runFallback() {
  ensureOutDir();
  const graph = buildFallbackGraph();
  const svg = renderSvg(graph);
  writeFileSync(OUT_SVG, svg, 'utf8');
  console.log(`[graphify] Generated ${OUT_SVG} via regex fallback (${graph.nodes.size} groups, ${graph.edges.length} edges).`);
  console.warn('[graphify] For a richer graph, install one of: npm i -D madge  OR  npm i -D dependency-cruiser  (and graphviz `dot` for SVG).');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node scripts/graphify.mjs [--help]\n\nGenerates docs/architecture-graph.svg from the import graph.\nTries madge → dependency-cruiser → regex fallback. Never fails (exit 0).');
    process.exit(0);
  }

  // Allow forcing fallback for testing: --fallback
  if (args.includes('--fallback')) {
    runFallback();
    process.exit(0);
  }

  if (tryMadge()) process.exit(0);
  if (tryDepCruiser()) process.exit(0);
  runFallback();
  process.exit(0);
}

try {
  main();
} catch (err) {
  console.warn('[graphify] Unexpected error — writing fallback graph. ' + (err?.message || err));
  try { runFallback(); } catch { /* ignore */ }
  process.exit(0);
}
