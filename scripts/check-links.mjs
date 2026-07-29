import { readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';

const IMMERSIVE_ROUTES = ['/', '/arc', '/rialo'];
const PROJECT_ROUTES = [
  '/arc/signal-ledger',
  '/arc/hadron',
  '/arc/arcpredict',
  '/rialo/rialo-captain',
];
const PUBLIC_ROUTES = [...IMMERSIVE_ROUTES, '/about', ...PROJECT_ROUTES];
const ROUTES_TO_CHECK = [...PUBLIC_ROUTES, '/_not-found'];
const DANGEROUS_SCHEMES = new Set(['javascript:', 'data:', 'file:', 'vbscript:']);

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

function repoRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

function defaultBuildRoot() {
  return path.join(repoRoot(), '.next');
}

function defaultPublicRoot() {
  return path.join(repoRoot(), 'public');
}

function addError(errors, code, detail) {
  errors.push(detail ? `${code}: ${detail}` : code);
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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

async function readRequiredText(root, relativePath, errors, code, label) {
  const fileInfo = await resolveExistingInside(root, relativePath, errors, label, {
    missingCode: code,
    missingDetail: label,
  });
  if (!fileInfo) {
    return null;
  }
  try {
    return await readFile(fileInfo.realPath, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') {
      addError(errors, code, label);
      return null;
    }
    throw error;
  }
}

async function readRequiredJson(root, relativePath, errors, label) {
  const text = await readRequiredText(root, relativePath, errors, 'MANIFEST_MISSING', label);
  if (text === null) {
    return null;
  }
  if (text.trim() === '') {
    addError(errors, 'MANIFEST_EMPTY', label);
    return null;
  }
  try {
    const parsed = JSON.parse(text);
    if (!isPlainObject(parsed)) {
      addError(errors, 'MANIFEST_SCHEMA', label);
      return null;
    }
    return parsed;
  } catch {
    addError(errors, 'MANIFEST_INVALID_JSON', label);
    return null;
  }
}

function normalizeRoute(pathname) {
  let value = pathname;
  try {
    value = decodeURI(value);
  } catch {
    // 保持原始路径，后续 route map 会 fail closed。
  }
  if (value.length > 1 && value.endsWith('/')) {
    value = value.slice(0, -1);
  }
  return value || '/';
}

function parseDocument(html, errors, route) {
  const document = new JSDOM(html).window.document;
  if (document.querySelector('base')) {
    addError(errors, 'HTML_BASE_UNSUPPORTED', route);
  }
  return document;
}

function hasFragment(document, fragment) {
  if (!fragment) {
    return false;
  }
  if (document.getElementById(fragment)) {
    return true;
  }
  for (const anchor of document.querySelectorAll('a[name]')) {
    if (anchor.getAttribute('name') === fragment) {
      return true;
    }
  }
  return false;
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

function routeBaseUrl(originUrl, route) {
  return new URL(route === '/' ? '/' : route, originUrl);
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

function classifyHref(rawHref, originUrl, currentRoute) {
  const href = rawHref.trim();
  if (href === '') {
    return { kind: 'error', code: 'LINK_EMPTY_HREF' };
  }
  if (href.startsWith('//')) {
    return { kind: 'error', code: 'LINK_PROTOCOL_RELATIVE', detail: href };
  }

  const schemeMatch = href.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  if (schemeMatch && DANGEROUS_SCHEMES.has(`${schemeMatch[1].toLowerCase()}:`)) {
    return { kind: 'error', code: 'LINK_INSECURE_SCHEME', detail: href };
  }

  let parsed;
  try {
    parsed = new URL(href, routeBaseUrl(originUrl, currentRoute));
  } catch {
    return { kind: 'error', code: 'LINK_URL_INVALID', detail: href };
  }

  if (parsed.username || parsed.password) {
    return { kind: 'error', code: 'LINK_CREDENTIALS', detail: href };
  }

  if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
    if (isLocalUrl(parsed, originUrl)) {
      return {
        kind: 'local',
        route: normalizeRoute(parsed.pathname),
        fragment: decodeFragment(parsed.hash, href),
        href,
      };
    }
    if (parsed.protocol === 'https:') {
      return { kind: 'external-https', href };
    }
    return { kind: 'error', code: 'LINK_EXTERNAL_HTTP', detail: href };
  }

  return { kind: 'error', code: 'LINK_INSECURE_SCHEME', detail: href };
}

function decodeFragment(hash, href) {
  if (!hash) {
    return { ok: true, value: '' };
  }
  try {
    return { ok: true, value: decodeURIComponent(hash.slice(1)) };
  } catch {
    return { ok: false, code: 'LINK_FRAGMENT_INVALID', detail: href };
  }
}

function validatePrerenderRoutes(prerenderManifest, errors) {
  if (!isPlainObject(prerenderManifest) || !isPlainObject(prerenderManifest.routes)) {
    addError(errors, 'MANIFEST_SCHEMA', 'prerender-manifest.json 缺少 routes 对象');
    return new Set();
  }
  const routeSet = new Set(Object.keys(prerenderManifest.routes).map(normalizeRoute));
  for (const route of ROUTES_TO_CHECK) {
    if (!routeSet.has(route)) {
      addError(errors, 'MANIFEST_SCHEMA', `prerender-manifest.json 缺少静态 route ${route}`);
    }
  }
  return routeSet;
}

export async function checkLinks(options = {}) {
  const buildRoot = path.resolve(options.buildRoot ?? defaultBuildRoot());
  // publicRoot 是可注入 API 的一部分；链接门禁当前只读生产 HTML，不扫描 public。
  const publicRoot = path.resolve(options.publicRoot ?? defaultPublicRoot());
  const originUrl = new URL(options.origin ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000');
  const errors = [];

  const prerenderManifest = await readRequiredJson(buildRoot, 'prerender-manifest.json', errors, 'prerender-manifest.json');
  const routeSet = prerenderManifest ? validatePrerenderRoutes(prerenderManifest, errors) : new Set();

  const documentsByRoute = new Map();
  for (const route of ROUTES_TO_CHECK) {
    const htmlFile = ROUTE_HTML.get(route);
    const html = await readRequiredText(buildRoot, `server/app/${htmlFile}`, errors, 'HTML_MISSING', `${route} -> ${htmlFile}`);
    if (html !== null) {
      documentsByRoute.set(route, parseDocument(html, errors, route));
    }
  }

  let linksChecked = 0;
  let localLinks = 0;
  let externalHttpsLinks = 0;

  for (const [route, document] of documentsByRoute) {
    for (const anchor of document.querySelectorAll('a[href]')) {
      linksChecked += 1;
      const rawHref = anchor.getAttribute('href') ?? '';
      const classification = classifyHref(rawHref, originUrl, route);

      if (classification.kind === 'error') {
        addError(errors, classification.code, `${route} -> ${classification.detail ?? rawHref}`);
        continue;
      }

      if (classification.kind === 'external-https') {
        externalHttpsLinks += 1;
        continue;
      }

      if (!classification.fragment.ok) {
        addError(errors, classification.fragment.code, `${route} -> ${classification.fragment.detail}`);
        continue;
      }

      localLinks += 1;
      if (!routeSet.has(classification.route) || !documentsByRoute.has(classification.route)) {
        addError(errors, 'LINK_ROUTE_MISSING', `${route} -> ${classification.href}`);
        continue;
      }

      if (classification.fragment.value) {
        const targetDocument = documentsByRoute.get(classification.route);
        if (!hasFragment(targetDocument, classification.fragment.value)) {
          addError(errors, 'LINK_FRAGMENT_MISSING', `${route} -> ${classification.href}`);
        }
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    summary: {
      buildRoot,
      publicRoot,
      linksChecked,
      localLinks,
      externalHttpsLinks,
      routes: [...documentsByRoute.keys()],
    },
  };
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

export async function runLinksCli(argv = process.argv.slice(2)) {
  const options = parseCliArgs(argv);
  if (options.help) {
    console.log('用法：node scripts/check-links.mjs [--build-root .next] [--public-root public] [--origin http://127.0.0.1:3100]');
    return 0;
  }
  if (options.errors.length > 0) {
    console.error(`链接门禁失败：${options.errors.join('，')}`);
    return 1;
  }
  if (options.unknown) {
    console.error(`链接门禁失败：未知参数 ${options.unknown}`);
    return 1;
  }

  const report = await checkLinks(options);
  if (!report.ok) {
    console.error(`链接门禁失败：${report.errors.length} 项`);
    for (const error of report.errors) {
      console.error(`- ${error}`);
    }
    return 1;
  }

  console.log(
    `链接门禁通过：检查 ${report.summary.linksChecked} 个链接，本地 ${report.summary.localLinks} 个，外部 HTTPS ${report.summary.externalHttpsLinks} 个。`,
  );
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const code = await runLinksCli();
  process.exitCode = code;
}
