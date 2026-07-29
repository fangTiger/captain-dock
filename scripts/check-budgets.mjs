import { readdir, readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import { JSDOM } from 'jsdom';

const KIB = 1024;
const CANVAS_SENTINEL = 'CAPTAIN_DOCK_UNIVERSE_CANVAS_V1';
const SCENE_SENTINELS = ['home-astrolabe', 'arc-orbital-circuit', 'rialo-reactive-field'];
const ROUTE_SCENE_SENTINELS = new Map([
  ['/', 'home-astrolabe'],
  ['/arc', 'arc-orbital-circuit'],
  ['/rialo', 'rialo-reactive-field'],
]);
const ROUTE_DOM_SCENES = new Map([
  ['/', 'home'],
  ['/arc', 'arc'],
  ['/rialo', 'rialo'],
]);
const IMAGE_EXTENSIONS = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp']);

const THRESHOLDS = {
  enhanced3dGzipBytes: 260 * KIB,
  immersiveRoute3dGzipBytes: 250 * KIB,
  sceneClosureGzipBytes: 45 * KIB,
  localProjectImageBytes: 300 * KIB,
};

const IMMERSIVE_ROUTES = ['/', '/arc', '/rialo'];
const PROJECT_ROUTES = [
  '/arc/signal-ledger',
  '/arc/hadron',
  '/arc/arcpredict',
  '/rialo/rialo-captain',
];
const PUBLIC_ROUTES = [...IMMERSIVE_ROUTES, '/about', ...PROJECT_ROUTES];
const ROUTES_TO_CHECK = [...PUBLIC_ROUTES, '/_not-found'];
const COLD_ROUTES = ['/about', ...PROJECT_ROUTES, '/_not-found'];

const ROUTE_HTML = new Map([
  ['/', 'index.html'],
  ['/arc', 'arc.html'],
  ['/rialo', 'rialo.html'],
  ['/about', 'about.html'],
  ['/arc/signal-ledger', 'arc/signal-ledger.html'],
  ['/arc/hadron', 'arc/hadron.html'],
  ['/arc/arcpredict', 'arc/arcpredict.html'],
  ['/rialo/rialo-captain', 'rialo/rialo-captain.html'],
  ['/_not-found', '_not-found.html'],
]);

const ROUTE_APP_KEYS = new Map([
  ['/', '/(immersive)/page'],
  ['/arc', '/(immersive)/[ecosystem]/page'],
  ['/rialo', '/(immersive)/[ecosystem]/page'],
  ['/about', '/(content)/about/page'],
  ['/arc/signal-ledger', '/(case-files)/[ecosystem]/[project]/page'],
  ['/arc/hadron', '/(case-files)/[ecosystem]/[project]/page'],
  ['/arc/arcpredict', '/(case-files)/[ecosystem]/[project]/page'],
  ['/rialo/rialo-captain', '/(case-files)/[ecosystem]/[project]/page'],
  ['/_not-found', '/_not-found/page'],
]);

const REQUIRED_APP_PATHS = new Map([
  ['/(immersive)/page', '/'],
  ['/(immersive)/[ecosystem]/page', '/[ecosystem]'],
  ['/(content)/about/page', '/about'],
  ['/(case-files)/[ecosystem]/[project]/page', '/[ecosystem]/[project]'],
  ['/_not-found/page', '/_not-found'],
]);
const IMMERSIVE_APP_KEYS = ['/(immersive)/page', '/(immersive)/[ecosystem]/page'];

function repoRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

function defaultBuildRoot() {
  return path.join(repoRoot(), '.next');
}

function defaultPublicRoot() {
  return path.join(repoRoot(), 'public');
}

function createReport(errors, summary) {
  return {
    ok: errors.length === 0,
    errors,
    summary,
  };
}

function addError(errors, code, detail) {
  errors.push(detail ? `${code}: ${detail}` : code);
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toPosixPath(value) {
  return value.split(path.sep).join('/');
}

function htmlDecode(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}

function parseDocument(html, errors, route) {
  const document = new JSDOM(html).window.document;
  if (document.querySelector('base')) {
    addError(errors, 'HTML_BASE_UNSUPPORTED', route);
  }
  return document;
}

function extractRouteScriptChunks(document, errors, route) {
  const chunks = new Set();
  for (const script of document.querySelectorAll('script[src]')) {
    const source = script.getAttribute('src');
    if (!source) {
      continue;
    }
    const normalized = normalizeBuildAssetReference(source, errors, `script ${route}`);
    if (normalized && normalized.startsWith('static/chunks/') && normalized.endsWith('.js')) {
      chunks.add(normalized);
    }
  }
  for (const link of document.querySelectorAll('link[href]')) {
    const href = link.getAttribute('href');
    const asValue = link.getAttribute('as')?.toLowerCase();
    const relValue = link.getAttribute('rel')?.toLowerCase();
    if (!href || (asValue !== 'script' && relValue !== 'modulepreload')) {
      continue;
    }
    const normalized = normalizeBuildAssetReference(href, errors, `script preload ${route}`);
    if (normalized && normalized.startsWith('static/chunks/') && normalized.endsWith('.js')) {
      chunks.add(normalized);
    }
  }
  return chunks;
}

function extractChunkReferences(content, errors, owner) {
  const refs = new Set();
  for (const reference of extractBuildAssetStringReferences(content)) {
    const normalized = normalizeBuildAssetReference(reference, errors, `chunk ref ${owner}`);
    if (normalized) {
      refs.add(normalized);
    }
  }

  const loaderReferences = collectTurbopackLoaderReferences(content, errors, owner);
  for (const ref of loaderReferences.refs) {
    refs.add(ref);
  }

  const unparsedContent = maskRanges(content, loaderReferences.ranges);
  if (/\.l\(/.test(unparsedContent)) {
    addError(errors, 'CHUNK_DYNAMIC_LOADER_UNRESOLVED', owner);
  }
  return refs;
}

function extractBuildAssetStringReferences(content) {
  const references = [];
  for (const literal of extractStaticStringLiterals(content)) {
    const value = literal.trim();
    if (isBuildAssetReferenceCandidate(value)) {
      references.push(value);
    }
  }
  return references;
}

function extractStaticStringLiterals(content) {
  const literals = [];
  let index = 0;

  while (index < content.length) {
    const quote = content[index];
    if (quote !== '"' && quote !== "'" && quote !== '`') {
      index += 1;
      continue;
    }

    index += 1;
    let value = '';
    let dynamicTemplate = false;
    while (index < content.length) {
      const char = content[index];
      if (char === '\\') {
        if (index + 1 >= content.length) {
          break;
        }
        value += content[index + 1];
        index += 2;
        continue;
      }
      if (quote === '`' && char === '$' && content[index + 1] === '{') {
        dynamicTemplate = true;
      }
      if (char === quote) {
        index += 1;
        if (!dynamicTemplate) {
          literals.push(value);
        }
        break;
      }
      value += char;
      index += 1;
    }
  }

  return literals;
}

function isBuildAssetReferenceCandidate(reference) {
  if (!reference || reference.includes('\n') || reference.includes('\r')) {
    return false;
  }

  const pathOnly = reference.split('?')[0].split('#')[0];
  const hasExternalSyntax = /^[A-Za-z][A-Za-z0-9+.-]*:/.test(pathOnly) || pathOnly.startsWith('//');
  const assetPath = buildAssetPathFromReferenceCandidate(pathOnly, hasExternalSyntax);
  if (!assetPath || !assetPath.startsWith('static/chunks/')) {
    return false;
  }
  if (hasExternalSyntax) {
    return /^[^\s\\]+\.js$/.test(assetPath);
  }

  return isSafeBuildChunkAssetPath(assetPath);
}

function buildAssetPathFromReferenceCandidate(reference, hasExternalSyntax) {
  let value = reference;
  if (hasExternalSyntax) {
    try {
      const parsed = new URL(reference, 'http://build.local');
      value = parsed.pathname;
    } catch {
      return null;
    }
  }
  if (value.startsWith('/_next/')) {
    return value.slice('/_next/'.length);
  }
  if (value.startsWith('_next/')) {
    return value.slice('_next/'.length);
  }
  if (value.startsWith('.next/')) {
    return value.slice('.next/'.length);
  }
  return value;
}

function isSafeBuildChunkAssetPath(assetPath) {
  if (!assetPath.startsWith('static/chunks/') || /[\s\\]/.test(assetPath)) {
    return false;
  }
  const chunkPath = assetPath.slice('static/chunks/'.length);
  if (!chunkPath.endsWith('.js')) {
    return false;
  }
  const segments = chunkPath.split('/');
  return segments.every((segment) => segment !== '' && segment !== '.' && segment !== '..');
}

function collectTurbopackLoaderReferences(content, errors, owner) {
  const refs = new Set();
  const ranges = [];
  const loaderPattern =
    /Promise\.all\(\s*\[([\s\S]*?)\]\s*\.map\(\s*\(?\s*([A-Za-z_$][\w$]*)\s*\)?\s*=>\s*[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*\.l\(\s*\2\s*\)\s*\)\s*\)/g;

  for (const match of content.matchAll(loaderPattern)) {
    ranges.push([match.index, match.index + match[0].length]);
    const parsed = parseStringLiteralArray(match[1]);
    if (!parsed.ok) {
      addError(errors, 'CHUNK_DYNAMIC_LOADER_UNRESOLVED', owner);
      continue;
    }
    for (const ref of parsed.values) {
      const normalized = normalizeBuildAssetReference(ref, errors, `chunk loader ${owner}`);
      if (normalized) {
        refs.add(normalized);
      }
    }
  }

  return { refs, ranges };
}

function parseStringLiteralArray(source) {
  const values = [];
  let index = 0;
  let expectingValue = true;

  const skipWhitespace = () => {
    while (index < source.length && /\s/.test(source[index])) {
      index += 1;
    }
  };

  while (index < source.length) {
    skipWhitespace();
    if (index >= source.length) {
      return { ok: !expectingValue && values.length > 0, values };
    }
    if (!expectingValue) {
      return { ok: false, values };
    }

    const quote = source[index];
    if (quote !== '"' && quote !== "'" && quote !== '`') {
      return { ok: false, values };
    }
    index += 1;

    let value = '';
    let closed = false;
    while (index < source.length) {
      const char = source[index];
      if (char === '\\') {
        if (index + 1 >= source.length) {
          return { ok: false, values };
        }
        value += source[index + 1];
        index += 2;
        continue;
      }
      if (char === quote) {
        index += 1;
        closed = true;
        break;
      }
      if (quote === '`' && char === '$' && source[index + 1] === '{') {
        return { ok: false, values };
      }
      value += char;
      index += 1;
    }
    if (!closed || value.trim() === '') {
      return { ok: false, values };
    }
    values.push(value);

    skipWhitespace();
    if (index >= source.length) {
      return { ok: true, values };
    }
    if (source[index] !== ',') {
      return { ok: false, values };
    }
    index += 1;
    expectingValue = true;
  }

  return { ok: false, values };
}

function maskRanges(content, ranges) {
  if (ranges.length === 0) {
    return content;
  }
  let cursor = 0;
  const pieces = [];
  for (const [start, end] of ranges.sort((left, right) => left[0] - right[0])) {
    pieces.push(content.slice(cursor, start));
    pieces.push(' '.repeat(end - start));
    cursor = end;
  }
  pieces.push(content.slice(cursor));
  return pieces.join('');
}

function normalizeBuildAssetReference(reference, errors, context) {
  if (typeof reference !== 'string' || reference.trim() === '') {
    addError(errors, 'PATH_ESCAPE', `${context} 引用了空路径`);
    return null;
  }

  let value = htmlDecode(reference.trim());
  const withoutQueryFragment = value.split('?')[0].split('#')[0];
  if (withoutQueryFragment.startsWith('//') || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(withoutQueryFragment)) {
    addError(errors, 'BUILD_ASSET_EXTERNAL', `${context} 使用外部构建资源 ${reference}`);
    return null;
  }
  const pathOnly = value.split('?')[0].split('#')[0];
  if (pathOnly.split('/').includes('..')) {
    addError(errors, 'PATH_ESCAPE', `${context} 逃逸构建根 ${reference}`);
    return null;
  }
  value = withoutQueryFragment;

  if (value.startsWith('/_next/')) {
    value = value.slice('/_next/'.length);
  } else if (value.startsWith('_next/')) {
    value = value.slice('_next/'.length);
  } else if (value.startsWith('.next/')) {
    value = value.slice('.next/'.length);
  } else if (value.startsWith('/')) {
    addError(errors, 'PATH_ESCAPE', `${context} 使用非 _next 绝对路径 ${reference}`);
    return null;
  }

  try {
    const parsed = new URL(value, 'http://build.local');
    value = parsed.pathname;
  } catch {
    value = value.split('?')[0].split('#')[0];
  }
  if (value.startsWith('/')) {
    value = value.slice(1);
  }

  const normalized = path.posix.normalize(value);
  if (
    normalized === '.' ||
    normalized.startsWith('../') ||
    normalized.includes('/../') ||
    path.posix.isAbsolute(normalized)
  ) {
    addError(errors, 'PATH_ESCAPE', `${context} 逃逸构建根 ${reference}`);
    return null;
  }

  return normalized;
}

function resolveInside(root, relativePath, errors, context) {
  const resolved = path.resolve(root, relativePath);
  const normalizedRoot = path.resolve(root);
  if (resolved !== normalizedRoot && !resolved.startsWith(`${normalizedRoot}${path.sep}`)) {
    addError(errors, 'PATH_ESCAPE', `${context} 逃逸根目录 ${relativePath}`);
    return null;
  }
  return resolved;
}

const realRootCache = new Map();

function isInsideRealRoot(rootRealPath, targetRealPath) {
  const relative = path.relative(rootRealPath, targetRealPath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

async function realRootPath(root) {
  const resolvedRoot = path.resolve(root);
  if (!realRootCache.has(resolvedRoot)) {
    realRootCache.set(resolvedRoot, await realpath(resolvedRoot));
  }
  return realRootCache.get(resolvedRoot);
}

async function resolveExistingInside(root, relativePath, errors, context, options = {}) {
  const resolved = resolveInside(root, relativePath, errors, context);
  if (!resolved) {
    return null;
  }

  let rootRealPath;
  try {
    rootRealPath = await realRootPath(root);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      if (options.missingCode) {
        addError(errors, options.missingCode, options.missingDetail ?? context);
      }
      return null;
    }
    throw error;
  }

  let targetRealPath;
  try {
    targetRealPath = await realpath(resolved);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      if (options.missingCode) {
        addError(errors, options.missingCode, options.missingDetail ?? context);
      }
      return null;
    }
    throw error;
  }

  if (!isInsideRealRoot(rootRealPath, targetRealPath)) {
    addError(errors, 'PATH_ESCAPE', `${context} symlink 逃逸根目录 ${relativePath}`);
    return null;
  }

  return { resolved, realPath: targetRealPath };
}

async function readRequiredText(root, relativePath, errors, missingCode, label) {
  const fileInfo = await resolveExistingInside(root, relativePath, errors, label, {
    missingCode,
    missingDetail: label,
  });
  if (!fileInfo) {
    return null;
  }
  try {
    return await readFile(fileInfo.realPath, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') {
      addError(errors, missingCode, label);
      return null;
    }
    throw error;
  }
}

async function readRequiredJson(root, relativePath, errors, label, validate) {
  const text = await readRequiredText(root, relativePath, errors, 'MANIFEST_MISSING', label);
  if (text === null) {
    return null;
  }
  if (text.trim() === '') {
    addError(errors, 'MANIFEST_EMPTY', label);
    return null;
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    addError(errors, 'MANIFEST_INVALID_JSON', label);
    return null;
  }
  if (validate && !validate(parsed)) {
    addError(errors, 'MANIFEST_SCHEMA', label);
    return null;
  }
  return parsed;
}

async function validatedFileStat(root, relativePath, errors, context) {
  const fileInfo = await resolveExistingInside(root, relativePath, errors, context);
  if (!fileInfo) {
    return null;
  }
  try {
    const stats = await stat(fileInfo.realPath);
    return { ...fileInfo, stats };
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function readContainedBytes(root, relativePath, errors, missingCode, label) {
  const fileInfo = await resolveExistingInside(root, relativePath, errors, label, {
    missingCode,
    missingDetail: label,
  });
  if (!fileInfo) {
    return null;
  }
  try {
    return await readFile(fileInfo.realPath);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      addError(errors, missingCode, label);
      return null;
    }
    throw error;
  }
}

async function validateReferencedBuildAsset(buildRoot, reference, errors, label) {
  const normalized = normalizeBuildAssetReference(reference, errors, label);
  if (!normalized) {
    return null;
  }
  const fileInfo = await validatedFileStat(buildRoot, normalized, errors, label);
  if (!fileInfo || !fileInfo.stats.isFile()) {
    addError(errors, 'MANIFEST_CHUNK_MISSING', `${label} -> ${normalized}`);
    return null;
  }
  return normalized;
}

function collectBuildManifestReferences(manifest) {
  const refs = new Set();
  const visit = (value) => {
    if (typeof value === 'string') {
      if (value.includes('static/chunks/')) {
        refs.add(value);
      }
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        visit(item);
      }
      return;
    }
    if (isPlainObject(value)) {
      for (const item of Object.values(value)) {
        visit(item);
      }
    }
  };
  visit(manifest);
  return refs;
}

function parseClientReferenceManifest(text, errors, label) {
  if (text.trim() === '') {
    addError(errors, 'MANIFEST_EMPTY', label);
    return null;
  }
  const marker = 'globalThis.__RSC_MANIFEST[';
  const markerIndex = text.indexOf(marker);
  const assignmentIndex = markerIndex === -1 ? -1 : text.indexOf('=', markerIndex + marker.length);
  if (assignmentIndex === -1) {
    addError(errors, 'MANIFEST_SCHEMA', label);
    return null;
  }
  const jsonText = text.slice(assignmentIndex + 1).trim().replace(/;\s*$/, '');
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    addError(errors, 'MANIFEST_INVALID_JSON', label);
    return null;
  }
  if (!isPlainObject(parsed) || !isPlainObject(parsed.clientModules)) {
    addError(errors, 'MANIFEST_SCHEMA', label);
    return null;
  }
  return parsed;
}

function collectClientReferenceChunks(manifest, errors, label) {
  const chunks = new Set();
  for (const [moduleName, moduleInfo] of Object.entries(manifest.clientModules)) {
    if (!isPlainObject(moduleInfo) || !Array.isArray(moduleInfo.chunks)) {
      addError(errors, 'MANIFEST_SCHEMA', `${label} client module ${moduleName}`);
      continue;
    }
    for (const chunk of moduleInfo.chunks) {
      chunks.add(chunk);
    }
  }
  if (isPlainObject(manifest.entryJSFiles)) {
    for (const [entry, files] of Object.entries(manifest.entryJSFiles)) {
      if (!Array.isArray(files)) {
        addError(errors, 'MANIFEST_SCHEMA', `${label} entryJSFiles ${entry}`);
        continue;
      }
      for (const file of files) {
        chunks.add(file);
      }
    }
  }
  return chunks;
}

function collectReactLoadableChunks(manifest, errors, label) {
  const chunks = new Set();
  if (!isPlainObject(manifest)) {
    addError(errors, 'MANIFEST_SCHEMA', label);
    return chunks;
  }
  for (const [id, entry] of Object.entries(manifest)) {
    if (!isPlainObject(entry) || !Array.isArray(entry.files)) {
      addError(errors, 'MANIFEST_SCHEMA', `${label} entry ${id}`);
      continue;
    }
    for (const file of entry.files) {
      chunks.add(file);
    }
  }
  return chunks;
}

async function readRouteManifests(buildRoot, errors) {
  const references = new Set();
  const reactLoadableRootsByAppKey = new Map();
  const uniqueAppKeys = new Set(ROUTE_APP_KEYS.values());

  for (const appKey of uniqueAppKeys) {
    const appPath = appKey.replace(/^\//, '');
    const routeDir = `server/app/${appPath}`;

    const reactLoadable = await readRequiredJson(
      buildRoot,
      `${routeDir}/react-loadable-manifest.json`,
      errors,
      `${appKey}/react-loadable-manifest.json`,
      isPlainObject,
    );
    if (reactLoadable) {
      const reactLoadableChunks = collectReactLoadableChunks(reactLoadable, errors, `${appKey}/react-loadable-manifest.json`);
      reactLoadableRootsByAppKey.set(appKey, reactLoadableChunks);
      for (const ref of reactLoadableChunks) {
        references.add(ref);
      }
    }

    const routeBuildManifest = await readRequiredJson(
      buildRoot,
      `${routeDir}/build-manifest.json`,
      errors,
      `${appKey}/build-manifest.json`,
      isPlainObject,
    );
    if (routeBuildManifest) {
      for (const ref of collectBuildManifestReferences(routeBuildManifest)) {
        references.add(ref);
      }
    }

    await readRequiredJson(buildRoot, `${routeDir}/app-paths-manifest.json`, errors, `${appKey}/app-paths-manifest.json`, isPlainObject);
    await readRequiredJson(
      buildRoot,
      `${routeDir}/server-reference-manifest.json`,
      errors,
      `${appKey}/server-reference-manifest.json`,
      isPlainObject,
    );
    await readRequiredJson(buildRoot, `${routeDir}/next-font-manifest.json`, errors, `${appKey}/next-font-manifest.json`, isPlainObject);

    const clientReferenceText = await readRequiredText(
      buildRoot,
      `server/app/${appPath}_client-reference-manifest.js`,
      errors,
      'MANIFEST_MISSING',
      `${appKey}_client-reference-manifest.js`,
    );
    if (clientReferenceText !== null) {
      const clientReference = parseClientReferenceManifest(clientReferenceText, errors, `${appKey}_client-reference-manifest.js`);
      if (clientReference) {
        for (const ref of collectClientReferenceChunks(clientReference, errors, `${appKey}_client-reference-manifest.js`)) {
          references.add(ref);
        }
      }
    }
  }

  return { references, reactLoadableRootsByAppKey };
}

async function walkFiles(root, startRelativePath, predicate, errors, context) {
  const results = [];
  async function visit(relativeDir) {
    const dirInfo = await resolveExistingInside(root, relativeDir, errors, context);
    if (!dirInfo) {
      return;
    }
    let entries;
    try {
      entries = await readdir(dirInfo.realPath, { withFileTypes: true });
    } catch (error) {
      if (error?.code === 'ENOENT') {
        return;
      }
      throw error;
    }
    for (const entry of entries) {
      const relativePath = path.posix.join(toPosixPath(relativeDir), entry.name);
      if (entry.isDirectory()) {
        await visit(relativePath);
      } else if (!predicate || predicate(relativePath)) {
        results.push(relativePath);
      }
    }
  }
  await visit(startRelativePath);
  return results;
}

async function buildChunkGraph(buildRoot, errors) {
  const chunkFiles = await walkFiles(buildRoot, 'static/chunks', (filePath) => filePath.endsWith('.js'), errors, 'static/chunks');
  const contents = new Map();
  const graph = new Map();
  const rawBuffers = new Map();

  for (const relativePath of chunkFiles) {
    const bytes = await readContainedBytes(buildRoot, relativePath, errors, 'MANIFEST_CHUNK_MISSING', relativePath);
    if (bytes === null) {
      continue;
    }
    const content = bytes.toString('utf8');
    contents.set(relativePath, content);
    rawBuffers.set(relativePath, bytes);
  }

  for (const [relativePath, content] of contents) {
    const refs = new Set();
    for (const ref of extractChunkReferences(content, errors, relativePath)) {
      if (!contents.has(ref)) {
        addError(errors, 'CHUNK_REFERENCE_MISSING', `${relativePath} -> ${ref}`);
      } else {
        refs.add(ref);
      }
    }
    graph.set(relativePath, refs);
  }

  return { contents, graph, rawBuffers };
}

function closureFrom(roots, graph) {
  const visited = new Set();
  const stack = [...roots].filter((root) => graph.has(root));
  while (stack.length > 0) {
    const current = stack.pop();
    if (visited.has(current)) {
      continue;
    }
    visited.add(current);
    for (const next of graph.get(current) ?? []) {
      if (!visited.has(next)) {
        stack.push(next);
      }
    }
  }
  return visited;
}

function closureUntil(roots, graph, stopRoots) {
  const visited = new Set();
  const stack = [...roots].filter((root) => graph.has(root));
  while (stack.length > 0) {
    const current = stack.pop();
    if (visited.has(current) || stopRoots.has(current)) {
      continue;
    }
    visited.add(current);
    for (const next of graph.get(current) ?? []) {
      if (!visited.has(next)) {
        stack.push(next);
      }
    }
  }
  return visited;
}

function unionSets(sets) {
  const result = new Set();
  for (const set of sets) {
    for (const value of set) {
      result.add(value);
    }
  }
  return result;
}

function intersectSets(left, right) {
  const result = new Set();
  for (const value of left) {
    if (right.has(value)) {
      result.add(value);
    }
  }
  return result;
}

function findSentinelOwners(contents, sentinel) {
  const owners = [];
  for (const [relativePath, content] of contents) {
    if (content.includes(sentinel)) {
      owners.push(relativePath);
    }
  }
  return owners.sort();
}

async function gzipBytesForSetAsync(buildRoot, chunkSet, rawBuffers, errors) {
  let total = 0;
  for (const relativePath of [...chunkSet].sort()) {
    let bytes = rawBuffers.get(relativePath);
    if (!bytes) {
      bytes = await readContainedBytes(buildRoot, relativePath, errors, 'MANIFEST_CHUNK_MISSING', relativePath);
      if (bytes === null) {
        continue;
      }
      rawBuffers.set(relativePath, bytes);
    }
    total += gzipSync(bytes, { level: 9 }).length;
  }
  return total;
}

function extractSrcsetUrls(value) {
  return value
    .split(',')
    .map((part) => part.trim().split(/\s+/)[0])
    .filter(Boolean);
}

function looksLikeImagePath(pathname) {
  return IMAGE_EXTENSIONS.has(path.posix.extname(pathname).toLowerCase());
}

function isLoopbackHost(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]';
}

function effectivePort(url) {
  if (url.port) {
    return url.port;
  }
  if (url.protocol === 'http:') {
    return '80';
  }
  if (url.protocol === 'https:') {
    return '443';
  }
  return '';
}

function isLocalUrl(url, originUrl) {
  if (url.origin === originUrl.origin) {
    return true;
  }
  return (
    isLoopbackHost(url.hostname) &&
    isLoopbackHost(originUrl.hostname) &&
    url.protocol === originUrl.protocol &&
    effectivePort(url) === effectivePort(originUrl)
  );
}

function localUrlPathFromReference(rawReference, originUrl, errors, context) {
  const reference = htmlDecode(rawReference.trim());
  if (!reference || reference.startsWith('data:')) {
    return null;
  }
  let parsed;
  try {
    parsed = new URL(reference, originUrl);
  } catch {
    if (reference.startsWith('/') || reference.startsWith('./') || reference.startsWith('../')) {
      addError(errors, 'IMAGE_URL_INVALID', `${context} -> ${reference}`);
    }
    return null;
  }
  if (!isLocalUrl(parsed, originUrl)) {
    return null;
  }
  if (parsed.pathname === '/_next/image') {
    const encodedSource = parsed.searchParams.get('url');
    if (!encodedSource) {
      addError(errors, 'IMAGE_URL_INVALID', `${context} -> ${reference}`);
      return null;
    }
    let innerUrl;
    try {
      innerUrl = new URL(encodedSource, originUrl);
    } catch {
      addError(errors, 'IMAGE_URL_INVALID', `${context} -> ${reference}`);
      return null;
    }
    if (
      (innerUrl.protocol !== 'http:' && innerUrl.protocol !== 'https:') ||
      innerUrl.username ||
      innerUrl.password ||
      !isLocalUrl(innerUrl, originUrl)
    ) {
      addError(errors, 'IMAGE_URL_EXTERNAL', `${context} -> ${encodedSource}`);
      return null;
    }
    return innerUrl.pathname;
  }
  return parsed.pathname;
}

function collectImageReferences(document) {
  const references = new Set();
  for (const image of document.querySelectorAll('img')) {
    const src = image.getAttribute('src');
    const srcset = image.getAttribute('srcset');
    if (src) {
      references.add(src);
    }
    if (srcset) {
      for (const url of extractSrcsetUrls(srcset)) {
        references.add(url);
      }
    }
  }
  for (const source of document.querySelectorAll('source')) {
    const src = source.getAttribute('src');
    const srcset = source.getAttribute('srcset');
    if (src) {
      references.add(src);
    }
    if (srcset) {
      for (const url of extractSrcsetUrls(srcset)) {
        references.add(url);
      }
    }
  }
  for (const link of document.querySelectorAll('link')) {
    if (link.getAttribute('as')?.toLowerCase() !== 'image') {
      continue;
    }
    const href = link.getAttribute('href');
    const imagesrcset = link.getAttribute('imagesrcset');
    if (href) {
      references.add(href);
    }
    if (imagesrcset) {
      for (const url of extractSrcsetUrls(imagesrcset)) {
        references.add(url);
      }
    }
  }
  return references;
}

async function checkLocalImages({ buildRoot, publicRoot, originUrl, documentsByRoute, errors }) {
  const checked = new Map();
  const validImagesByRoute = new Map(PROJECT_ROUTES.map((route) => [route, 0]));

  for (const [route, document] of documentsByRoute) {
    for (const reference of collectImageReferences(document)) {
      const localPath = localUrlPathFromReference(reference, originUrl, errors, `image ${route}`);
      if (!localPath || !looksLikeImagePath(localPath)) {
        continue;
      }

      let fileInfo = null;
      if (localPath.startsWith('/_next/static/')) {
        fileInfo = await validatedFileStat(buildRoot, localPath.slice('/_next/'.length), errors, `image ${route}`);
      } else if (localPath.startsWith('/')) {
        fileInfo = await validatedFileStat(publicRoot, localPath.slice(1), errors, `image ${route}`);
      }

      if (!fileInfo || !fileInfo.stats.isFile()) {
        addError(errors, 'IMAGE_MISSING', `${route} -> ${localPath}`);
        continue;
      }

      const key = `${route}:${localPath}`;
      if (checked.has(key)) {
        continue;
      }

      if (fileInfo.stats.size > THRESHOLDS.localProjectImageBytes) {
        addError(errors, 'IMAGE_TOO_LARGE', `${route} -> ${localPath} ${fileInfo.stats.size}B`);
      } else if (validImagesByRoute.has(route)) {
        validImagesByRoute.set(route, validImagesByRoute.get(route) + 1);
      }
      checked.set(key, { route, localPath, bytes: fileInfo.stats.size });
    }
  }

  for (const [route, count] of validImagesByRoute) {
    if (count === 0) {
      addError(errors, 'IMAGE_ROUTE_MISSING', route);
    }
  }

  return [...checked.values()].filter(Boolean);
}

function validateAppPathRoutes(appPathRoutes, errors) {
  if (!isPlainObject(appPathRoutes)) {
    addError(errors, 'MANIFEST_SCHEMA', 'app-path-routes-manifest.json 必须是对象');
    return;
  }
  for (const [appKey, expectedRoute] of REQUIRED_APP_PATHS) {
    if (appPathRoutes[appKey] !== expectedRoute) {
      addError(errors, 'MANIFEST_SCHEMA', `app-path-routes-manifest.json 缺少 ${appKey} -> ${expectedRoute}`);
    }
  }
}

function validatePrerenderRoutes(prerenderManifest, errors) {
  if (!isPlainObject(prerenderManifest) || !isPlainObject(prerenderManifest.routes)) {
    addError(errors, 'MANIFEST_SCHEMA', 'prerender-manifest.json 缺少 routes 对象');
    return;
  }
  for (const route of ROUTES_TO_CHECK) {
    if (!isPlainObject(prerenderManifest.routes[route])) {
      addError(errors, 'MANIFEST_SCHEMA', `prerender-manifest.json 缺少静态 route ${route}`);
    }
  }
}

function formatBytes(bytes) {
  return `${(bytes / KIB).toFixed(1)}KiB`;
}

function validateImmersiveRouteScene(route, document, errors) {
  const expectedScene = ROUTE_DOM_SCENES.get(route);
  if (!expectedScene) {
    return;
  }
  const universeScenes = [...document.querySelectorAll('[data-universe-scene]')].map((node) =>
    node.getAttribute('data-universe-scene'),
  );
  const staticScenes = [...document.querySelectorAll('[data-static-scene]')].map((node) =>
    node.getAttribute('data-static-scene'),
  );
  if (universeScenes.length !== 1 || universeScenes[0] !== expectedScene) {
    addError(errors, 'ROUTE_SCENE_MISMATCH', `${route} data-universe-scene ${universeScenes.join(',')}`);
  }
  if (staticScenes.length !== 1 || staticScenes[0] !== expectedScene) {
    addError(errors, 'ROUTE_SCENE_MISMATCH', `${route} data-static-scene ${staticScenes.join(',')}`);
  }
}

async function normalizeChunkReferenceSet(buildRoot, refs, errors, label) {
  const normalized = new Set();
  for (const ref of refs ?? []) {
    const chunk = await validateReferencedBuildAsset(buildRoot, ref, errors, label);
    if (chunk && chunk.startsWith('static/chunks/') && chunk.endsWith('.js')) {
      normalized.add(chunk);
    }
  }
  return normalized;
}

function setKey(set) {
  return JSON.stringify([...set].sort());
}

export async function checkBuildBudgets(options = {}) {
  const buildRoot = path.resolve(options.buildRoot ?? defaultBuildRoot());
  const publicRoot = path.resolve(options.publicRoot ?? defaultPublicRoot());
  const originUrl = new URL(options.origin ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000');
  const errors = [];

  const buildId = await readRequiredText(buildRoot, 'BUILD_ID', errors, 'BUILD_ID_MISSING', 'BUILD_ID');
  if (buildId !== null && buildId.trim() === '') {
    addError(errors, 'BUILD_ID_EMPTY', 'BUILD_ID');
  }

  const appPathRoutes = await readRequiredJson(
    buildRoot,
    'app-path-routes-manifest.json',
    errors,
    'app-path-routes-manifest.json',
    isPlainObject,
  );
  if (appPathRoutes) {
    validateAppPathRoutes(appPathRoutes, errors);
  }

  const prerenderManifest = await readRequiredJson(
    buildRoot,
    'prerender-manifest.json',
    errors,
    'prerender-manifest.json',
    isPlainObject,
  );
  if (prerenderManifest) {
    validatePrerenderRoutes(prerenderManifest, errors);
  }

  const buildManifest = await readRequiredJson(
    buildRoot,
    'build-manifest.json',
    errors,
    'build-manifest.json',
    isPlainObject,
  );
  const manifestReferences = buildManifest ? collectBuildManifestReferences(buildManifest) : new Set();
  const routeManifestInfo = await readRouteManifests(buildRoot, errors);
  for (const ref of routeManifestInfo.references) {
    manifestReferences.add(ref);
  }
  for (const ref of manifestReferences) {
    await validateReferencedBuildAsset(buildRoot, ref, errors, 'manifest chunk');
  }

  const documentsByRoute = new Map();
  const routeRoots = new Map();
  const buildIdValue = buildId?.trim() ?? '';
  for (const route of ROUTES_TO_CHECK) {
    const htmlFile = ROUTE_HTML.get(route);
    const html = await readRequiredText(
      buildRoot,
      `server/app/${htmlFile}`,
      errors,
      'HTML_MISSING',
      `${route} -> ${htmlFile}`,
    );
    if (html !== null) {
      if (buildIdValue && !html.includes(buildIdValue)) {
        addError(errors, 'HTML_BUILD_ID_MISSING', `${route} -> ${htmlFile}`);
      }
      const document = parseDocument(html, errors, route);
      documentsByRoute.set(route, document);
      validateImmersiveRouteScene(route, document, errors);
      const roots = extractRouteScriptChunks(document, errors, route);
      routeRoots.set(route, roots);
      for (const root of roots) {
        await validateReferencedBuildAsset(buildRoot, root, errors, `HTML script ${route}`);
      }
    }
  }

  const { contents, graph, rawBuffers } = await buildChunkGraph(buildRoot, errors);
  const routeClosures = new Map();
  for (const route of ROUTES_TO_CHECK) {
    routeClosures.set(route, closureFrom(routeRoots.get(route) ?? new Set(), graph));
  }

  const immersiveManifestRootsByAppKey = new Map();
  for (const appKey of IMMERSIVE_APP_KEYS) {
    const roots = await normalizeChunkReferenceSet(
      buildRoot,
      routeManifestInfo.reactLoadableRootsByAppKey.get(appKey) ?? new Set(),
      errors,
      `${appKey}/react-loadable root`,
    );
    immersiveManifestRootsByAppKey.set(appKey, roots);
    if (roots.size === 0) {
      addError(errors, 'ENHANCED_ROOT_EMPTY', `${appKey}/react-loadable-manifest.json`);
    }
  }
  const rootKeys = new Set([...immersiveManifestRootsByAppKey.values()].map(setKey));
  if (rootKeys.size > 1) {
    addError(
      errors,
      'ENHANCED_ROOT_MISMATCH',
      [...immersiveManifestRootsByAppKey].map(([appKey, roots]) => `${appKey}:${[...roots].sort().join(',')}`).join(' vs '),
    );
  }
  const enhancedManifestRoots = immersiveManifestRootsByAppKey.get(IMMERSIVE_APP_KEYS[0]) ?? new Set();

  const canvasOwners = findSentinelOwners(contents, CANVAS_SENTINEL);
  let canvasOwner = null;
  if (canvasOwners.length === 0) {
    addError(errors, 'CANVAS_SENTINEL_MISSING', CANVAS_SENTINEL);
  } else if (canvasOwners.length > 1) {
    addError(errors, 'CANVAS_SENTINEL_DUPLICATE', canvasOwners.join(', '));
  } else {
    canvasOwner = canvasOwners[0];
  }

  const sceneOwners = new Map();
  for (const sentinel of SCENE_SENTINELS) {
    const owners = findSentinelOwners(contents, sentinel);
    if (owners.length === 0) {
      addError(errors, 'SCENE_SENTINEL_MISSING', sentinel);
    } else if (owners.length > 1) {
      addError(errors, 'SCENE_SENTINEL_DUPLICATE', `${sentinel}: ${owners.join(', ')}`);
    } else {
      sceneOwners.set(sentinel, owners[0]);
    }
  }
  if (sceneOwners.size === SCENE_SENTINELS.length && new Set(sceneOwners.values()).size !== SCENE_SENTINELS.length) {
    addError(errors, 'SCENE_SENTINEL_OWNER_NOT_DISTINCT', [...sceneOwners.entries()].map(([name, owner]) => `${name}:${owner}`).join(', '));
  }

  const immersiveHtmlLoaderRootsByRoute = new Map();
  if (canvasOwner) {
    for (const route of IMMERSIVE_ROUTES) {
      const roots = new Set(
        [...(routeRoots.get(route) ?? new Set())].filter((root) => closureFrom([root], graph).has(canvasOwner)),
      );
      immersiveHtmlLoaderRootsByRoute.set(route, roots);
      if (roots.size === 0) {
        addError(errors, 'ENHANCED_ROOT_EMPTY', `${route} HTML roots cannot reach ${canvasOwner}`);
      }
    }
    const htmlRootKeys = new Set([...immersiveHtmlLoaderRootsByRoute.values()].map(setKey));
    if (htmlRootKeys.size > 1) {
      addError(
        errors,
        'ENHANCED_ROOT_MISMATCH',
        [...immersiveHtmlLoaderRootsByRoute].map(([route, roots]) => `${route}:${[...roots].sort().join(',')}`).join(' vs '),
      );
    }
  }
  const enhancedHtmlLoaderRoots = immersiveHtmlLoaderRootsByRoute.get(IMMERSIVE_ROUTES[0]) ?? new Set();
  const enhancedClosure = closureFrom(enhancedHtmlLoaderRoots, graph);

  for (const manifestRoot of enhancedManifestRoots) {
    if (!enhancedClosure.has(manifestRoot)) {
      addError(errors, 'ENHANCED_MANIFEST_ROOT_UNREACHABLE', manifestRoot);
    }
  }

  if (canvasOwner) {
    if (!enhancedClosure.has(canvasOwner)) {
      addError(errors, 'CANVAS_SENTINEL_UNREACHABLE', `HTML loader roots cannot reach ${canvasOwner}`);
    }
  }

  const sceneOwnerFiles = new Set(sceneOwners.values());
  const reachableSceneOwners = intersectSets(enhancedClosure, sceneOwnerFiles);
  if (sceneOwners.size > 0 && reachableSceneOwners.size === 0) {
    addError(errors, 'ENHANCED_CLOSURE_EMPTY', 'enhanced closure cannot reach any scene sentinel owner');
  }
  for (const [sentinel, owner] of sceneOwners) {
    if (!enhancedClosure.has(owner)) {
      addError(errors, 'SCENE_SENTINEL_UNREACHABLE', `${sentinel} -> ${owner}`);
    }
  }

  const threeDimensionalOwners = new Set([canvasOwner, ...sceneOwnerFiles].filter(Boolean));
  for (const route of COLD_ROUTES) {
    const closure = routeClosures.get(route) ?? new Set();
    const leakedEnhancedChunks = intersectSets(closure, enhancedClosure);
    if (leakedEnhancedChunks.size > 0) {
      addError(errors, 'COLD_ROUTE_3D_REACHABLE', `${route} reaches ${[...leakedEnhancedChunks].sort().join(', ')}`);
    }
    for (const owner of threeDimensionalOwners) {
      if (closure.has(owner)) {
        addError(errors, 'COLD_ROUTE_3D_REACHABLE', `${route} reaches ${owner}`);
      }
    }
  }

  let enhancedGzipBytes = 0;
  const routeBudgetSummaries = [];
  const sceneBudgetSummaries = [];
  if (enhancedClosure.size > 0) {
    enhancedGzipBytes = await gzipBytesForSetAsync(buildRoot, enhancedClosure, rawBuffers, errors);
    if (enhancedGzipBytes > THRESHOLDS.enhanced3dGzipBytes) {
      addError(
        errors,
        'BUDGET_3D_TOTAL_EXCEEDED',
        `${formatBytes(enhancedGzipBytes)} > ${formatBytes(THRESHOLDS.enhanced3dGzipBytes)}`,
      );
    }
  }

  const sceneClosureBySentinel = new Map();
  for (const [sentinel, owner] of sceneOwners) {
    const sceneClosure = closureFrom([owner], graph);
    sceneClosureBySentinel.set(sentinel, sceneClosure);
    const gzipBytes = await gzipBytesForSetAsync(buildRoot, sceneClosure, rawBuffers, errors);
    sceneBudgetSummaries.push({ sentinel, owner, gzipBytes, chunks: [...sceneClosure].sort() });
    if (gzipBytes > THRESHOLDS.sceneClosureGzipBytes) {
      addError(
        errors,
        'BUDGET_SCENE_EXCEEDED',
        `${sentinel} ${formatBytes(gzipBytes)} > ${formatBytes(THRESHOLDS.sceneClosureGzipBytes)}`,
      );
    }
  }

  const sharedEnhancedBase = closureUntil(enhancedHtmlLoaderRoots, graph, sceneOwnerFiles);
  for (const route of IMMERSIVE_ROUTES) {
    const sentinel = ROUTE_SCENE_SENTINELS.get(route);
    const currentSceneClosure = sceneClosureBySentinel.get(sentinel) ?? new Set();
    const route3dClosure = unionSets([sharedEnhancedBase, currentSceneClosure]);
    const gzipBytes = route3dClosure.size > 0 ? await gzipBytesForSetAsync(buildRoot, route3dClosure, rawBuffers, errors) : 0;
    routeBudgetSummaries.push({ route, sentinel, gzipBytes, chunks: [...route3dClosure].sort() });
    if (gzipBytes > THRESHOLDS.immersiveRoute3dGzipBytes) {
      addError(
        errors,
        'BUDGET_ROUTE_3D_EXCEEDED',
        `${route} ${formatBytes(gzipBytes)} > ${formatBytes(THRESHOLDS.immersiveRoute3dGzipBytes)}`,
      );
    }
  }

  const images = await checkLocalImages({ buildRoot, publicRoot, originUrl, documentsByRoute, errors });

  return createReport(errors, {
    buildRoot,
    publicRoot,
    buildId: buildIdValue,
    thresholds: THRESHOLDS,
    routes: ROUTES_TO_CHECK.map((route) => ({
      route,
      appKey: ROUTE_APP_KEYS.get(route),
      rootChunks: [...(routeRoots.get(route) ?? new Set())].sort(),
      closureChunks: [...(routeClosures.get(route) ?? new Set())].sort(),
    })),
    canvasOwner,
    sceneOwners: Object.fromEntries(sceneOwners),
    immersiveManifestRoots: Object.fromEntries(
      [...immersiveManifestRootsByAppKey].map(([appKey, roots]) => [appKey, [...roots].sort()]),
    ),
    immersiveHtmlLoaderRoots: Object.fromEntries(
      [...immersiveHtmlLoaderRootsByRoute].map(([route, roots]) => [route, [...roots].sort()]),
    ),
    enhancedClosure: [...enhancedClosure].sort(),
    enhancedGzipBytes,
    sharedEnhancedBase: [...sharedEnhancedBase].sort(),
    sceneClosures: Object.fromEntries(
      [...sceneClosureBySentinel].map(([sentinel, closure]) => [sentinel, [...closure].sort()]),
    ),
    routeBudgets: routeBudgetSummaries,
    sceneBudgets: sceneBudgetSummaries,
    images,
  });
}

function parseCliArgs(argv) {
  const options = { errors: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--build-root') {
      index = readOptionValue(argv, index, options, 'buildRoot', arg);
    } else if (arg === '--public-root') {
      index = readOptionValue(argv, index, options, 'publicRoot', arg);
    } else if (arg === '--origin') {
      index = readOptionValue(argv, index, options, 'origin', arg);
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      options.unknown = arg;
    }
  }
  return options;
}

function readOptionValue(argv, index, options, key, flag) {
  const next = argv[index + 1];
  if (!next || next.startsWith('-')) {
    options.errors.push(`缺少参数 ${flag}`);
    return index;
  }
  options[key] = next;
  return index + 1;
}

export async function runBudgetCli(argv = process.argv.slice(2)) {
  const options = parseCliArgs(argv);
  if (options.help) {
    console.log('用法：node scripts/check-budgets.mjs [--build-root .next] [--public-root public] [--origin http://127.0.0.1:3100]');
    return 0;
  }
  if (options.errors.length > 0) {
    console.error(`预算门禁失败：${options.errors.join('，')}`);
    return 1;
  }
  if (options.unknown) {
    console.error(`预算门禁失败：未知参数 ${options.unknown}`);
    return 1;
  }

  const report = await checkBuildBudgets(options);
  if (!report.ok) {
    console.error(`预算门禁失败：${report.errors.length} 项`);
    for (const error of report.errors) {
      console.error(`- ${error}`);
    }
    return 1;
  }

  console.log(`预算门禁通过：full enhanced ${formatBytes(report.summary.enhancedGzipBytes)} / ${formatBytes(THRESHOLDS.enhanced3dGzipBytes)}`);
  for (const routeBudget of report.summary.routeBudgets) {
    console.log(
      `- route ${routeBudget.route}: ${formatBytes(routeBudget.gzipBytes)} / ${formatBytes(THRESHOLDS.immersiveRoute3dGzipBytes)} (${routeBudget.chunks.length} chunks)`,
    );
  }
  for (const sceneBudget of report.summary.sceneBudgets) {
    console.log(
      `- scene ${sceneBudget.sentinel}: ${formatBytes(sceneBudget.gzipBytes)} / ${formatBytes(THRESHOLDS.sceneClosureGzipBytes)} (${sceneBudget.chunks.length} chunks)`,
    );
  }
  const largestImage = report.summary.images.reduce((largest, image) => (image.bytes > (largest?.bytes ?? 0) ? image : largest), null);
  console.log(
    `- images: ${report.summary.images.length} checked${largestImage ? `, largest ${largestImage.localPath} ${formatBytes(largestImage.bytes)}` : ''}`,
  );
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const code = await runBudgetCli();
  process.exitCode = code;
}
