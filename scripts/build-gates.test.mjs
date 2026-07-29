import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { checkBuildBudgets } from './check-budgets.mjs';
import { checkLinks } from './check-links.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const BUDGET_CLI = path.join(SCRIPT_DIR, 'check-budgets.mjs');
const LINKS_CLI = path.join(SCRIPT_DIR, 'check-links.mjs');
const BUILD_ID = 'fixture-build';

const IMMERSIVE_ROUTES = ['/', '/arc', '/rialo'];
const KIB = 1024;
const ROUTE_DOM_SCENES = new Map([
  ['/', 'home'],
  ['/arc', 'arc'],
  ['/rialo', 'rialo'],
]);
const ROUTE_SCENE_SENTINELS = new Map([
  ['/', 'home-astrolabe'],
  ['/arc', 'arc-orbital-circuit'],
  ['/rialo', 'rialo-reactive-field'],
]);
const ROUTE_SCENE_OWNERS = new Map([
  ['/', 'static/chunks/home-scene.js'],
  ['/arc', 'static/chunks/arc-scene.js'],
  ['/rialo', 'static/chunks/rialo-scene.js'],
]);
const PROJECT_ROUTES = [
  '/arc/signal-ledger',
  '/arc/hadron',
  '/arc/arcpredict',
  '/rialo/rialo-captain',
];
const PUBLIC_ROUTES = [...IMMERSIVE_ROUTES, '/about', ...PROJECT_ROUTES];
const PROJECT_IMAGE_REFERENCES = new Map([
  ['/arc/signal-ledger', '/projects/arc/signal-ledger/live.webp'],
  ['/arc/hadron', '/_next/image?url=%2F_next%2Fstatic%2Fmedia%2Fhadron.webp&w=640&q=75'],
  ['/arc/arcpredict', '/_next/static/media/arcpredict.webp'],
  ['/rialo/rialo-captain', '/projects/rialo/rialo-captain/tower.webp'],
]);

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

async function writeText(filePath, content) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, 'utf8');
}

async function writeBytes(filePath, bytes) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const buffer = Buffer.alloc(bytes);
  let state = 0x9e3779b9;
  for (let index = 0; index < bytes; index += 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    buffer[index] = (state >>> 24) & 0xff;
  }
  await writeFile(filePath, buffer);
}

async function writeNoisyText(filePath, prefix, bytes) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const buffer = Buffer.alloc(bytes);
  let state = 0x85ebca6b;
  for (let index = 0; index < bytes; index += 1) {
    state = (Math.imul(state, 22695477) + 1) >>> 0;
    buffer[index] = (state >>> 24) & 0xff;
  }
  await writeFile(filePath, Buffer.concat([Buffer.from(prefix, 'utf8'), buffer]));
}

function scriptTag(chunk) {
  return `<script src="/_next/${chunk}" async=""></script>`;
}

function routeHtml(route, scripts, body = '') {
  const links = [
    '<a href="#main-content">跳至正文</a>',
    '<a href="/">Home</a>',
    '<a href="/arc">Arc</a>',
    '<a href="/rialo">Rialo</a>',
    '<a href="/about">About</a>',
    '<a href="https://example.com/work">External work</a>',
  ].join('');
  const scene = ROUTE_DOM_SCENES.get(route);
  const sceneStart = scene
    ? `<div data-universe-scene="${scene}"><figure data-static-scene="${scene}">`
    : '';
  const sceneEnd = scene ? '</figure></div>' : '';
  return [
    '<!doctype html><html><head>',
    scripts.map(scriptTag).join(''),
    '</head><body id="top">',
    links,
    sceneStart,
    `<main id="main-content" data-route="${route}">`,
    body,
    '</main>',
    sceneEnd,
    '<footer><a href="#top">返回顶部</a></footer>',
    `<script>self.__next_f={b:"${BUILD_ID}"}</script>`,
    '</body></html>',
  ].join('');
}

function clientReferenceManifest(appKey, chunks) {
  const payload = {
    moduleLoading: { prefix: '', crossOrigin: null },
    clientModules: {
      [`[project]${appKey}.tsx`]: {
        id: 1,
        name: '*',
        chunks: chunks.map((chunk) => `/_next/${chunk}`),
        async: false,
      },
    },
    entryCSSFiles: {},
    entryJSFiles: {
      [`[project]${appKey}.tsx`]: chunks,
    },
  };
  return `globalThis.__RSC_MANIFEST = globalThis.__RSC_MANIFEST || {};\nglobalThis.__RSC_MANIFEST["${appKey}"] = ${JSON.stringify(payload)};\n`;
}

async function writeRouteManifests(buildRoot, appKey, chunks) {
  const relativeAppPath = appKey.replace(/^\//, '');
  const routeDir = path.join(buildRoot, 'server/app', relativeAppPath);
  await writeText(
    path.join(routeDir, 'react-loadable-manifest.json'),
    JSON.stringify({ 101: { id: 101, files: chunks } }),
  );
  await writeText(path.join(routeDir, 'build-manifest.json'), JSON.stringify({ files: chunks }));
  await writeText(path.join(routeDir, 'app-paths-manifest.json'), JSON.stringify({ [appKey]: 'page.js' }));
  await writeText(path.join(routeDir, 'server-reference-manifest.json'), '{}');
  await writeText(path.join(routeDir, 'next-font-manifest.json'), '{}');
  await writeText(
    path.join(buildRoot, 'server/app', `${relativeAppPath}_client-reference-manifest.js`),
    clientReferenceManifest(appKey, chunks),
  );
}

async function makeFixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'captain-dock-build-gates-'));
  const buildRoot = path.join(root, '.next');
  const publicRoot = path.join(root, 'public');

  await writeText(path.join(buildRoot, 'BUILD_ID'), BUILD_ID);
  await writeText(
    path.join(buildRoot, 'app-path-routes-manifest.json'),
    JSON.stringify({
      '/(case-files)/[ecosystem]/[project]/page': '/[ecosystem]/[project]',
      '/(content)/about/page': '/about',
      '/(immersive)/[ecosystem]/page': '/[ecosystem]',
      '/(immersive)/page': '/',
      '/_not-found/page': '/_not-found',
    }),
  );
  await writeText(
    path.join(buildRoot, 'prerender-manifest.json'),
    JSON.stringify({
      version: 4,
      routes: Object.fromEntries(
        [...PUBLIC_ROUTES, '/_not-found'].map((route) => [
          route,
          {
            initialRevalidateSeconds: false,
            srcRoute: route === '/arc' || route === '/rialo' ? '/[ecosystem]' : route,
            dataRoute: `${route === '/' ? '/index' : route}.rsc`,
          },
        ]),
      ),
    }),
  );
  await writeText(
    path.join(buildRoot, 'build-manifest.json'),
    JSON.stringify({
      pages: { '/_app': [] },
      polyfillFiles: ['static/chunks/polyfill.js'],
      rootMainFiles: ['static/chunks/runtime.js'],
      lowPriorityFiles: [],
    }),
  );

  const chunks = new Map([
    ['static/chunks/polyfill.js', '/* polyfill */'],
    ['static/chunks/runtime.js', '/* runtime */'],
    ['static/chunks/immersive-shell.js', 'import "static/chunks/canvas-owner.js";'],
    [
      'static/chunks/canvas-owner.js',
      'export const CAPTAIN_DOCK_UNIVERSE_CANVAS_V1 = "CAPTAIN_DOCK_UNIVERSE_CANVAS_V1"; import "static/chunks/scene-router.js";',
    ],
    [
      'static/chunks/scene-router.js',
      'import "static/chunks/home-scene.js"; import "static/chunks/arc-scene.js"; import "static/chunks/rialo-scene.js";',
    ],
    ['static/chunks/home-scene.js', 'export const scene = "home-astrolabe";'],
    ['static/chunks/arc-scene.js', 'export const scene = "arc-orbital-circuit";'],
    ['static/chunks/rialo-scene.js', 'export const scene = "rialo-reactive-field";'],
    ['static/chunks/about.js', '/* cold about */'],
    ['static/chunks/case.js', '/* cold project case */'],
    ['static/chunks/not-found.js', '/* cold 404 */'],
  ]);
  for (const [chunk, content] of chunks) {
    await writeText(path.join(buildRoot, chunk), content);
  }
  await writeBytes(path.join(buildRoot, 'static/media/hadron.webp'), 1024);
  await writeBytes(path.join(buildRoot, 'static/media/arcpredict.webp'), 1024);
  await writeBytes(path.join(publicRoot, 'projects/arc/signal-ledger/live.webp'), 1024);
  await writeBytes(path.join(publicRoot, 'projects/rialo/rialo-captain/tower.webp'), 1024);

  const routeScripts = new Map([
    ['/', ['static/chunks/runtime.js', 'static/chunks/immersive-shell.js']],
    ['/arc', ['static/chunks/runtime.js', 'static/chunks/immersive-shell.js']],
    ['/rialo', ['static/chunks/runtime.js', 'static/chunks/immersive-shell.js']],
    ['/about', ['static/chunks/runtime.js', 'static/chunks/about.js']],
    ['/arc/signal-ledger', ['static/chunks/runtime.js', 'static/chunks/case.js']],
    ['/arc/hadron', ['static/chunks/runtime.js', 'static/chunks/case.js']],
    ['/arc/arcpredict', ['static/chunks/runtime.js', 'static/chunks/case.js']],
    ['/rialo/rialo-captain', ['static/chunks/runtime.js', 'static/chunks/case.js']],
    ['/_not-found', ['static/chunks/runtime.js', 'static/chunks/not-found.js']],
  ]);

  for (const [route, htmlFile] of ROUTE_HTML) {
    let body = '';
    if (PROJECT_IMAGE_REFERENCES.has(route)) {
      body = `<img src="${PROJECT_IMAGE_REFERENCES.get(route)}" alt="project image">`;
    }
    await writeText(path.join(buildRoot, 'server/app', htmlFile), routeHtml(route, routeScripts.get(route), body));
  }

  const pageChunks = {
    '/(immersive)/page': ['static/chunks/immersive-shell.js'],
    '/(immersive)/[ecosystem]/page': ['static/chunks/immersive-shell.js'],
    '/(content)/about/page': ['static/chunks/about.js'],
    '/(case-files)/[ecosystem]/[project]/page': ['static/chunks/case.js'],
    '/_not-found/page': ['static/chunks/not-found.js'],
  };
  for (const [appKey, chunksForPage] of Object.entries(pageChunks)) {
    await writeRouteManifests(buildRoot, appKey, chunksForPage);
  }

  return { root, buildRoot, publicRoot };
}

async function withFixture(callback) {
  const fixture = await makeFixture();
  try {
    return await callback(fixture);
  } finally {
    await rm(fixture.root, { force: true, recursive: true });
  }
}

async function expectBudgetFailure(mutate, expected) {
  await withFixture(async (fixture) => {
    const { buildRoot, publicRoot } = fixture;
    await mutate(fixture);
    const report = await checkBuildBudgets({ buildRoot, publicRoot, origin: 'http://127.0.0.1:3100' });
    assert.equal(report.ok, false);
    assert.match(report.errors.join('\n'), expected);
  });
}

async function expectLinkFailure(mutate, expected) {
  await withFixture(async (fixture) => {
    const { buildRoot, publicRoot } = fixture;
    await mutate(fixture);
    const report = await checkLinks({ buildRoot, publicRoot, origin: 'http://127.0.0.1:3100' });
    assert.equal(report.ok, false);
    assert.match(report.errors.join('\n'), expected);
  });
}

async function expectCliMissingValueFailure(cliPath, args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    encoding: 'utf8',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /缺少参数/);
}

test('完整合法 fixture 通过预算与链接门禁，证明 checker 不是 always-fail', async () => {
  await withFixture(async ({ buildRoot, publicRoot }) => {
    const budgets = await checkBuildBudgets({ buildRoot, publicRoot, origin: 'http://127.0.0.1:3100' });
    assert.equal(budgets.ok, true, budgets.errors.join('\n'));
    assert.ok(budgets.summary.enhancedGzipBytes > 0);
    assert.equal(budgets.summary.routes.length, 9);
    for (const routeBudget of budgets.summary.routeBudgets) {
      const expectedOwner = ROUTE_SCENE_OWNERS.get(routeBudget.route);
      assert.ok(routeBudget.chunks.includes(expectedOwner), `${routeBudget.route} 缺少当前 scene owner`);
      for (const [route, owner] of ROUTE_SCENE_OWNERS) {
        if (route !== routeBudget.route) {
          assert.ok(!routeBudget.chunks.includes(owner), `${routeBudget.route} 不应包含 ${owner}`);
        }
      }
    }

    const links = await checkLinks({ buildRoot, publicRoot, origin: 'http://127.0.0.1:3100' });
    assert.equal(links.ok, true, links.errors.join('\n'));
    assert.ok(links.summary.linksChecked > 0);
    assert.ok(links.summary.externalHttpsLinks > 0);
  });
});

test('CLI 对 invalid fixture 返回非零并输出中文失败摘要', async () => {
  const missingBuildRoot = path.join(tmpdir(), `missing-${Date.now()}`);
  for (const cliPath of [BUDGET_CLI, LINKS_CLI]) {
    const result = spawnSync(process.execPath, [cliPath, '--build-root', missingBuildRoot], {
      encoding: 'utf8',
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /失败/);
  }
});

test('fail closed: 两个 CLI 的必填参数缺值或下一项仍是 flag 会失败', async () => {
  for (const cliPath of [BUDGET_CLI, LINKS_CLI]) {
    await expectCliMissingValueFailure(cliPath, ['--build-root']);
    await expectCliMissingValueFailure(cliPath, ['--origin', '--public-root', 'public']);
  }
});

test('fail closed: CLI flag 后接另一个 flag 不能被当作参数值', async () => {
  await expectCliMissingValueFailure(BUDGET_CLI, ['--origin', '--public-root', 'public']);
  await expectCliMissingValueFailure(LINKS_CLI, ['--public-root', '--origin', 'http://127.0.0.1:3100']);
});

test('fail closed: 链接解析遵循真实 DOM first-attribute、base 禁用且忽略 comment/script 伪 anchor', async () => {
  await expectLinkFailure(
    ({ buildRoot }) =>
      writeText(
        path.join(buildRoot, 'server/app/index.html'),
        routeHtml(
          '/',
          ['static/chunks/runtime.js', 'static/chunks/immersive-shell.js'],
          '<a href="javascript:alert(1)" href="/about">duplicate href keeps first</a>',
        ),
      ),
    /LINK_INSECURE_SCHEME/,
  );
  await expectLinkFailure(
    ({ buildRoot }) =>
      writeText(
        path.join(buildRoot, 'server/app/index.html'),
        routeHtml('/', ['static/chunks/runtime.js', 'static/chunks/immersive-shell.js']).replace(
          '<head>',
          '<head><base href="https://example.com/">',
        ),
      ),
    /HTML_BASE_UNSUPPORTED/,
  );
  await withFixture(async ({ buildRoot, publicRoot }) => {
    await writeText(
      path.join(buildRoot, 'server/app/index.html'),
      routeHtml(
        '/',
        ['static/chunks/runtime.js', 'static/chunks/immersive-shell.js'],
        '<!-- <a href="javascript:alert(1)">comment</a> --><script>const pseudo = `<a href="http://example.com">script</a>`;</script>',
      ),
    );
    const report = await checkLinks({ buildRoot, publicRoot, origin: 'http://127.0.0.1:3100' });
    assert.equal(report.ok, true, report.errors.join('\n'));
  });
});

test('fail closed: base href 出现在页面时直接失败', async () => {
  await expectLinkFailure(
    ({ buildRoot }) =>
      writeText(
        path.join(buildRoot, 'server/app/index.html'),
        routeHtml('/', ['static/chunks/runtime.js', 'static/chunks/immersive-shell.js']).replace(
          '<head>',
          '<head><base href="https://example.com/">',
        ),
      ),
    /HTML_BASE_UNSUPPORTED/,
  );
});

test('comment 与 script raw text 里的伪 anchor 不参与链接门禁', async () => {
  await withFixture(async ({ buildRoot, publicRoot }) => {
    await writeText(
      path.join(buildRoot, 'server/app/index.html'),
      routeHtml(
        '/',
        ['static/chunks/runtime.js', 'static/chunks/immersive-shell.js'],
        '<!-- <a href="javascript:alert(1)">comment</a> --><script>const pseudo = `<a href="http://example.com">script</a>`;</script>',
      ),
    );
    const report = await checkLinks({ buildRoot, publicRoot, origin: 'http://127.0.0.1:3100' });
    assert.equal(report.ok, true, report.errors.join('\n'));
  });
});

test('fail closed: check-links 读取 final HTML symlink 逃逸时外部字节不得进入 routes 与 link counts', async () => {
  await withFixture(async ({ root, buildRoot, publicRoot }) => {
    const outsideHtml = path.join(root, 'outside-about.html');
    await writeText(
      outsideHtml,
      routeHtml('/about', ['static/chunks/runtime.js', 'static/chunks/about.js'], '<a href="/external-final-symlink-route">external byte</a>'),
    );
    const aboutHtml = path.join(buildRoot, 'server/app/about.html');
    await rm(aboutHtml, { force: true });
    await symlink(outsideHtml, aboutHtml);

    const report = await checkLinks({ buildRoot, publicRoot, origin: 'http://127.0.0.1:3100' });
    const errors = report.errors.join('\n');
    assert.equal(report.ok, false);
    assert.match(errors, /PATH_ESCAPE/);
    assert.doesNotMatch(errors, /external-final-symlink-route/);
    assert.ok(!report.summary.routes.includes('/about'));
  });
});

test('fail closed: check-links 读取 server/app 中间目录 symlink 逃逸时不得使用外部 HTML', async () => {
  await withFixture(async ({ root, buildRoot, publicRoot }) => {
    const appRoot = path.join(buildRoot, 'server/app');
    const outsideApp = path.join(root, 'outside-app');
    await rename(appRoot, outsideApp);
    await writeText(
      path.join(outsideApp, 'index.html'),
      routeHtml('/', ['static/chunks/runtime.js', 'static/chunks/immersive-shell.js'], '<a href="/external-intermediate-symlink-route">external byte</a>'),
    );
    await symlink(outsideApp, appRoot, 'dir');

    const report = await checkLinks({ buildRoot, publicRoot, origin: 'http://127.0.0.1:3100' });
    const errors = report.errors.join('\n');
    assert.equal(report.ok, false);
    assert.match(errors, /PATH_ESCAPE/);
    assert.doesNotMatch(errors, /external-intermediate-symlink-route/);
    assert.equal(report.summary.routes.length, 0);
    assert.equal(report.summary.linksChecked, 0);
  });
});

test('fail closed: check-links 读取 prerender-manifest symlink 逃逸时直接拒绝', async () => {
  await withFixture(async ({ root, buildRoot, publicRoot }) => {
    const outsideManifest = path.join(root, 'outside-prerender-manifest.json');
    await writeText(
      outsideManifest,
      JSON.stringify({
        version: 4,
        routes: Object.fromEntries([...PUBLIC_ROUTES, '/_not-found'].map((route) => [route, { initialRevalidateSeconds: false }])),
      }),
    );
    const manifestPath = path.join(buildRoot, 'prerender-manifest.json');
    await rm(manifestPath, { force: true });
    await symlink(outsideManifest, manifestPath);

    const report = await checkLinks({ buildRoot, publicRoot, origin: 'http://127.0.0.1:3100' });
    assert.equal(report.ok, false);
    assert.match(report.errors.join('\n'), /PATH_ESCAPE/);
  });
});

test('fail closed: fragment 使用真实 DOM 精确匹配并结构化处理畸形编码', async () => {
  await expectLinkFailure(
    ({ buildRoot }) =>
      writeText(
        path.join(buildRoot, 'server/app/index.html'),
        routeHtml('/', ['static/chunks/runtime.js', 'static/chunks/immersive-shell.js'], '<a href="/about#Main-Content">case mismatch</a>'),
      ),
    /LINK_FRAGMENT_MISSING/,
  );
  await expectLinkFailure(async ({ buildRoot }) => {
    await writeText(
      path.join(buildRoot, 'server/app/about.html'),
      routeHtml('/about', ['static/chunks/runtime.js', 'static/chunks/about.js'], '<script>const fake = `<div id="script-fragment"></div>`;</script>'),
    );
    await writeText(
      path.join(buildRoot, 'server/app/index.html'),
      routeHtml('/', ['static/chunks/runtime.js', 'static/chunks/immersive-shell.js'], '<a href="/about#script-fragment">script id</a>'),
    );
  }, /LINK_FRAGMENT_MISSING/);
  await withFixture(async ({ buildRoot, publicRoot }) => {
    await writeText(
      path.join(buildRoot, 'server/app/index.html'),
      routeHtml('/', ['static/chunks/runtime.js', 'static/chunks/immersive-shell.js'], '<a href="/about#%E0%A4%A">bad encoding</a>'),
    );
    const report = await checkLinks({ buildRoot, publicRoot, origin: 'http://127.0.0.1:3100' }).catch((error) => error);
    assert.ok(!(report instanceof Error), report.stack);
    assert.equal(report.ok, false);
    assert.match(report.errors.join('\n'), /LINK_FRAGMENT_INVALID/);
  });
});

test('fail closed: Next image wrapper 的 inner source 必须校验 origin、protocol 与 credentials', async () => {
  const innerSources = [
    ['remote https', 'https://evil.invalid/_next/static/media/hadron.webp'],
    ['protocol-relative remote', '//evil.invalid/_next/static/media/hadron.webp'],
    ['same-origin credential', 'http://user:secret@127.0.0.1:3100/_next/static/media/hadron.webp'],
    ['other scheme', 'custom:/_next/static/media/hadron.webp'],
  ];

  for (const [label, innerSource] of innerSources) {
    await withFixture(async ({ buildRoot, publicRoot }) => {
      await writeText(
        path.join(buildRoot, 'server/app/arc/hadron.html'),
        routeHtml(
          '/arc/hadron',
          ['static/chunks/runtime.js', 'static/chunks/case.js'],
          `<img src="/_next/image?url=${encodeURIComponent(innerSource)}&w=640&q=75" alt="${label}">`,
        ),
      );

      const report = await checkBuildBudgets({ buildRoot, publicRoot, origin: 'http://127.0.0.1:3100' });
      const errors = report.errors.join('\n');
      assert.equal(report.ok, false, `${label} should fail`);
      assert.match(errors, /IMAGE_URL_EXTERNAL/);
      assert.ok(
        !report.summary.images.some((image) => image.route === '/arc/hadron' && image.localPath === '/_next/static/media/hadron.webp'),
        `${label} 不应把 inner source same-path twin 计为本地图片`,
      );
    });
  }
});

test('fail closed: script raw text 里的伪 id 不满足 fragment 目标', async () => {
  await expectLinkFailure(async ({ buildRoot }) => {
    await writeText(
      path.join(buildRoot, 'server/app/about.html'),
      routeHtml('/about', ['static/chunks/runtime.js', 'static/chunks/about.js'], '<script>const fake = `<div id="script-fragment"></div>`;</script>'),
    );
    await writeText(
      path.join(buildRoot, 'server/app/index.html'),
      routeHtml('/', ['static/chunks/runtime.js', 'static/chunks/immersive-shell.js'], '<a href="/about#script-fragment">script id</a>'),
    );
  }, /LINK_FRAGMENT_MISSING/);
});

test('fail closed: fragment 畸形 percent 编码返回结构化错误', async () => {
  await withFixture(async ({ buildRoot, publicRoot }) => {
    await writeText(
      path.join(buildRoot, 'server/app/index.html'),
      routeHtml('/', ['static/chunks/runtime.js', 'static/chunks/immersive-shell.js'], '<a href="/about#%E0%A4%A">bad encoding</a>'),
    );
    const report = await checkLinks({ buildRoot, publicRoot, origin: 'http://127.0.0.1:3100' }).catch((error) => error);
    assert.ok(!(report instanceof Error), report.stack);
    assert.equal(report.ok, false);
    assert.match(report.errors.join('\n'), /LINK_FRAGMENT_INVALID/);
  });
});

test('fail closed: loopback alias 只有协议与端口一致时才按本站解析', async () => {
  await expectLinkFailure(
    ({ buildRoot }) =>
      writeText(
        path.join(buildRoot, 'server/app/index.html'),
        routeHtml(
          '/',
          ['static/chunks/runtime.js', 'static/chunks/immersive-shell.js'],
          '<a href="http://127.0.0.1:3101/about">wrong port</a>',
        ),
      ),
    /LINK_EXTERNAL_HTTP/,
  );
});

test('route 预算按 shared enhanced base 加当前 scene closure 计算，不把其他 lazy scene 计入首屏', async () => {
  await withFixture(async ({ buildRoot, publicRoot }) => {
    await writeNoisyText(
      path.join(buildRoot, 'static/chunks/canvas-owner.js'),
      'export const CAPTAIN_DOCK_UNIVERSE_CANVAS_V1 = "CAPTAIN_DOCK_UNIVERSE_CANVAS_V1"; import "static/chunks/scene-router.js";',
      244 * KIB,
    );
    for (const [route, owner] of ROUTE_SCENE_OWNERS) {
      await writeNoisyText(
        path.join(buildRoot, owner),
        `export const scene = "${ROUTE_SCENE_SENTINELS.get(route)}"; ${path.basename(owner)}`,
        3 * KIB,
      );
    }

    const report = await checkBuildBudgets({ buildRoot, publicRoot, origin: 'http://127.0.0.1:3100' });
    assert.equal(report.ok, true, report.errors.join('\n'));
    assert.ok(report.summary.enhancedGzipBytes > 250 * KIB, '完整增强闭包应允许高于 route 首屏预算');
    assert.ok(report.summary.enhancedGzipBytes < 260 * KIB, '完整增强闭包仍受 260KiB 预算约束');
    for (const routeBudget of report.summary.routeBudgets) {
      assert.ok(routeBudget.gzipBytes < 250 * KIB, `${routeBudget.route} 首屏 3D 预算应低于 250KiB`);
      const expectedOwner = ROUTE_SCENE_OWNERS.get(routeBudget.route);
      assert.ok(routeBudget.chunks.includes(expectedOwner), `${routeBudget.route} 缺少当前 scene owner`);
      for (const [route, owner] of ROUTE_SCENE_OWNERS) {
        if (route !== routeBudget.route) {
          assert.ok(!routeBudget.chunks.includes(owner), `${routeBudget.route} 不应包含其他 scene owner ${owner}`);
        }
      }
    }
  });
});

test('route 预算从三条 immersive HTML 中一致且可达 Canvas 的 loader root 计算', async () => {
  await withFixture(async ({ buildRoot, publicRoot }) => {
    await writeText(path.join(buildRoot, 'static/chunks/html-loader.js'), 'import "static/chunks/dynamic-payload.js";');
    await writeText(path.join(buildRoot, 'static/chunks/dynamic-payload.js'), 'import "static/chunks/canvas-owner.js";');
    await writeText(path.join(buildRoot, 'static/chunks/route-dom-only.js'), 'export const routeOnly = "dom";');

    for (const route of IMMERSIVE_ROUTES) {
      await writeText(
        path.join(buildRoot, 'server/app', ROUTE_HTML.get(route)),
        routeHtml(route, ['static/chunks/runtime.js', 'static/chunks/html-loader.js', 'static/chunks/route-dom-only.js']),
      );
    }
    await writeRouteManifests(buildRoot, '/(immersive)/page', ['static/chunks/dynamic-payload.js']);
    await writeRouteManifests(buildRoot, '/(immersive)/[ecosystem]/page', ['static/chunks/dynamic-payload.js']);

    const report = await checkBuildBudgets({ buildRoot, publicRoot, origin: 'http://127.0.0.1:3100' });
    assert.equal(report.ok, true, report.errors.join('\n'));
    assert.ok(report.summary.immersiveHtmlLoaderRoots, 'summary 应暴露 immersive HTML loader roots');
    for (const route of IMMERSIVE_ROUTES) {
      assert.deepEqual(report.summary.immersiveHtmlLoaderRoots[route], ['static/chunks/html-loader.js']);
    }
    assert.ok(report.summary.enhancedClosure.includes('static/chunks/html-loader.js'));
    assert.ok(report.summary.enhancedClosure.includes('static/chunks/dynamic-payload.js'));
    assert.ok(!report.summary.enhancedClosure.includes('static/chunks/route-dom-only.js'));
    for (const routeBudget of report.summary.routeBudgets) {
      assert.ok(routeBudget.chunks.includes('static/chunks/html-loader.js'), `${routeBudget.route} 应计入 HTML loader root`);
      assert.ok(!routeBudget.chunks.includes('static/chunks/route-dom-only.js'), `${routeBudget.route} 不应计入 route-only DOM chunk`);
    }
  });
});

test('fail closed: final chunk symlink 逃逸时外部字节不能影响 sentinel 扫描', async () => {
  await withFixture(async ({ root, buildRoot, publicRoot }) => {
    await writeText(
      path.join(root, 'external-canvas.js'),
      'export const CAPTAIN_DOCK_UNIVERSE_CANVAS_V1 = "CAPTAIN_DOCK_UNIVERSE_CANVAS_V1";',
    );
    await symlink(path.join(root, 'external-canvas.js'), path.join(buildRoot, 'static/chunks/external-canvas.js'));

    const report = await checkBuildBudgets({ buildRoot, publicRoot, origin: 'http://127.0.0.1:3100' });
    const errors = report.errors.join('\n');
    assert.equal(report.ok, false);
    assert.match(errors, /PATH_ESCAPE/);
    assert.doesNotMatch(errors, /CANVAS_SENTINEL_DUPLICATE/);
  });
});

test('fail closed: static/chunks 中间目录 symlink 逃逸时外部 chunks 不得参与图谱', async () => {
  await withFixture(async ({ root, buildRoot, publicRoot }) => {
    const chunkRoot = path.join(buildRoot, 'static/chunks');
    const outsideChunks = path.join(root, 'outside-chunks');
    await rename(chunkRoot, outsideChunks);
    await writeText(
      path.join(outsideChunks, 'external-canvas.js'),
      'export const CAPTAIN_DOCK_UNIVERSE_CANVAS_V1 = "CAPTAIN_DOCK_UNIVERSE_CANVAS_V1";',
    );
    await symlink(outsideChunks, chunkRoot, 'dir');

    const report = await checkBuildBudgets({ buildRoot, publicRoot, origin: 'http://127.0.0.1:3100' });
    const errors = report.errors.join('\n');
    assert.equal(report.ok, false);
    assert.match(errors, /PATH_ESCAPE/);
    assert.doesNotMatch(errors, /CANVAS_SENTINEL_DUPLICATE/);
  });
});

test('fail closed: public/projects 中间目录 symlink 逃逸时外部图片不得计入本地图片', async () => {
  await withFixture(async ({ root, buildRoot, publicRoot }) => {
    const projectsRoot = path.join(publicRoot, 'projects');
    const outsideProjects = path.join(root, 'outside-projects');
    await rename(projectsRoot, outsideProjects);
    await symlink(outsideProjects, projectsRoot, 'dir');

    const report = await checkBuildBudgets({ buildRoot, publicRoot, origin: 'http://127.0.0.1:3100' });
    const errors = report.errors.join('\n');
    assert.equal(report.ok, false);
    assert.match(errors, /PATH_ESCAPE/);
    assert.ok(
      !report.summary.images.some((image) => image.localPath === '/projects/arc/signal-ledger/live.webp'),
      '逃逸的 public/projects 图片不应进入 summary',
    );
  });
});

test('fail closed: server/app 中间目录 symlink 逃逸时 HTML 与 route manifests 不得被读取', async () => {
  await withFixture(async ({ root, buildRoot, publicRoot }) => {
    const appRoot = path.join(buildRoot, 'server/app');
    const outsideApp = path.join(root, 'outside-app');
    await rename(appRoot, outsideApp);
    await symlink(outsideApp, appRoot, 'dir');

    const report = await checkBuildBudgets({ buildRoot, publicRoot, origin: 'http://127.0.0.1:3100' });
    const errors = report.errors.join('\n');
    assert.equal(report.ok, false);
    assert.match(errors, /PATH_ESCAPE/);
    assert.equal(report.summary.routes.find((route) => route.route === '/')?.rootChunks.length, 0);
  });
});

test('fail closed: Turbopack loader 数组混合 literal 与 computed chunk 必须失败', async () => {
  await expectBudgetFailure(
    ({ buildRoot }) =>
      writeText(
        path.join(buildRoot, 'static/chunks/partial-loader.js'),
        'Promise.all(["static/chunks/home-scene.js", computeHeavyChunk()].map((chunk) => runtime.l(chunk)))',
      ),
    /CHUNK_DYNAMIC_LOADER_UNRESOLVED/,
  );
});

test('fail closed: build asset 绝对 URL 不得剥离 origin 后按本地 chunk 接受', async () => {
  await expectBudgetFailure(
    ({ buildRoot }) =>
      writeText(
        path.join(buildRoot, 'server/app/index.html'),
        routeHtml('/', ['static/chunks/runtime.js', 'static/chunks/immersive-shell.js']).replace(
          '/_next/static/chunks/immersive-shell.js',
          'https://evil.invalid/_next/static/chunks/immersive-shell.js',
        ),
      ),
    /BUILD_ASSET_EXTERNAL/,
  );
});

test('fail closed: chunk 内容里的外部 build asset URL 不得先截断 origin 后匹配本地 twin', async () => {
  await withFixture(async ({ buildRoot, publicRoot }) => {
    const externalTwins = [
      ['https-twin.js', 'https://evil.invalid/_next/static/chunks/https-twin.js'],
      ['nested/https-twin.js', 'https://evil.invalid/_next/static/chunks/nested/https-twin.js'],
      ['protocol-twin.js', '//evil.invalid/_next/static/chunks/protocol-twin.js'],
      ['credential-twin.js', 'https://user:secret@evil.invalid/_next/static/chunks/credential-twin.js'],
      ['ftp-twin.js', 'ftp://evil.invalid/_next/static/chunks/ftp-twin.js'],
      ['custom-twin.js', 'custom:/_next/static/chunks/custom-twin.js'],
    ];
    for (const [fileName] of externalTwins) {
      await writeText(path.join(buildRoot, 'static/chunks', fileName), `export const localTwin = "${fileName}";`);
    }
    await writeText(
      path.join(buildRoot, 'static/chunks/immersive-shell.js'),
      [
        'import "static/chunks/canvas-owner.js";',
        ...externalTwins.map(([, reference]) => `void "${reference}";`),
      ].join('\n'),
    );

    const report = await checkBuildBudgets({ buildRoot, publicRoot, origin: 'http://127.0.0.1:3100' });
    const errors = report.errors.join('\n');
    assert.equal(report.ok, false);
    assert.equal(report.errors.filter((error) => error.startsWith('BUILD_ASSET_EXTERNAL')).length, externalTwins.length);
    assert.match(errors, /BUILD_ASSET_EXTERNAL/);
    const homeRoute = report.summary.routes.find((route) => route.route === '/');
    for (const [fileName] of externalTwins) {
      assert.ok(!homeRoute.closureChunks.includes(`static/chunks/${fileName}`), `${fileName} 不应作为本地边进入 closure`);
    }
  });
});

test('chunk 内容里的合法 nested 本地 chunk 引用应计入 reachable graph', async () => {
  await withFixture(async ({ buildRoot, publicRoot }) => {
    await writeText(path.join(buildRoot, 'static/chunks/nested/local.js'), 'export const nestedLocal = "reachable";');
    await writeText(
      path.join(buildRoot, 'static/chunks/immersive-shell.js'),
      'import "static/chunks/canvas-owner.js"; import "static/chunks/nested/local.js";',
    );

    const report = await checkBuildBudgets({ buildRoot, publicRoot, origin: 'http://127.0.0.1:3100' });
    assert.equal(report.ok, true, report.errors.join('\n'));
    const homeRoute = report.summary.routes.find((route) => route.route === '/');
    assert.ok(homeRoute.closureChunks.includes('static/chunks/nested/local.js'));
  });
});

test('fail closed: 一致 manifest roots 必须从一致 HTML loader roots 可达', async () => {
  await expectBudgetFailure(async ({ buildRoot }) => {
    await writeText(path.join(buildRoot, 'static/chunks/html-loader.js'), 'import "static/chunks/canvas-owner.js";');
    await writeText(path.join(buildRoot, 'static/chunks/unreachable-payload.js'), 'import "static/chunks/canvas-owner.js";');
    for (const route of IMMERSIVE_ROUTES) {
      await writeText(
        path.join(buildRoot, 'server/app', ROUTE_HTML.get(route)),
        routeHtml(route, ['static/chunks/runtime.js', 'static/chunks/html-loader.js']),
      );
    }
    await writeRouteManifests(buildRoot, '/(immersive)/page', ['static/chunks/unreachable-payload.js']);
    await writeRouteManifests(buildRoot, '/(immersive)/[ecosystem]/page', ['static/chunks/unreachable-payload.js']);
  }, /ENHANCED_MANIFEST_ROOT_UNREACHABLE/);
});

test('fail closed: HTML 必须绑定 BUILD_ID，immersive route DOM scene 必须匹配契约', async () => {
  await expectBudgetFailure(
    ({ buildRoot }) =>
      writeText(
        path.join(buildRoot, 'server/app/index.html'),
        routeHtml('/', ['static/chunks/runtime.js', 'static/chunks/immersive-shell.js']).replace(BUILD_ID, 'stale-build'),
      ),
    /HTML_BUILD_ID_MISSING/,
  );
  await expectBudgetFailure(
    ({ buildRoot }) =>
      writeText(
        path.join(buildRoot, 'server/app/arc.html'),
        routeHtml('/arc', ['static/chunks/runtime.js', 'static/chunks/immersive-shell.js']).replace(
          'data-static-scene="arc"',
          'data-static-scene="rialo"',
        ),
      ),
    /ROUTE_SCENE_MISMATCH/,
  );
});

test('fail closed: immersive route DOM scene 漂移会失败', async () => {
  await expectBudgetFailure(
    ({ buildRoot }) =>
      writeText(
        path.join(buildRoot, 'server/app/rialo.html'),
        routeHtml('/rialo', ['static/chunks/runtime.js', 'static/chunks/immersive-shell.js']).replace(
          'data-universe-scene="rialo"',
          'data-universe-scene="arc"',
        ),
      ),
    /ROUTE_SCENE_MISMATCH/,
  );
});

test('fail closed: BUILD_ID 缺失或为空会失败', async () => {
  await expectBudgetFailure(({ buildRoot }) => rm(path.join(buildRoot, 'BUILD_ID')), /BUILD_ID_MISSING/);
  await expectBudgetFailure(({ buildRoot }) => writeText(path.join(buildRoot, 'BUILD_ID'), ''), /BUILD_ID_EMPTY/);
});

test('fail closed: 必要 manifest 缺失、空、损坏或 schema 异常会失败', async () => {
  await expectBudgetFailure(
    ({ buildRoot }) => rm(path.join(buildRoot, 'app-path-routes-manifest.json')),
    /MANIFEST_MISSING/,
  );
  await expectBudgetFailure(
    ({ buildRoot }) => writeText(path.join(buildRoot, 'prerender-manifest.json'), ''),
    /MANIFEST_EMPTY/,
  );
  await expectBudgetFailure(
    ({ buildRoot }) => writeText(path.join(buildRoot, 'prerender-manifest.json'), '{not json'),
    /MANIFEST_INVALID_JSON/,
  );
  await expectBudgetFailure(
    ({ buildRoot }) => writeText(path.join(buildRoot, 'app-path-routes-manifest.json'), JSON.stringify([])),
    /MANIFEST_SCHEMA/,
  );
});

test('fail closed: manifest 引用不存在 chunk 或路径逃逸会失败', async () => {
  await expectBudgetFailure(
    ({ buildRoot }) =>
      writeRouteManifests(buildRoot, '/(immersive)/page', ['static/chunks/does-not-exist.js']),
    /MANIFEST_CHUNK_MISSING/,
  );
  await expectBudgetFailure(
    ({ buildRoot }) => writeRouteManifests(buildRoot, '/(immersive)/page', ['../escape.js']),
    /PATH_ESCAPE/,
  );
});

test('fail closed: manifest chunk symlink 不得逃逸 build root', async () => {
  await expectBudgetFailure(async ({ root, buildRoot }) => {
    await writeText(path.join(root, 'outside-chunk.js'), '/* outside build root */');
    await symlink(path.join(root, 'outside-chunk.js'), path.join(buildRoot, 'static/chunks/symlink-escape.js'));
    await writeRouteManifests(buildRoot, '/(content)/about/page', ['static/chunks/symlink-escape.js']);
  }, /PATH_ESCAPE/);
});

test('fail closed: Canvas sentinel 缺失、重复 owner 或不可达会失败', async () => {
  await expectBudgetFailure(
    ({ buildRoot }) => writeText(path.join(buildRoot, 'static/chunks/canvas-owner.js'), 'import "static/chunks/scene-router.js";'),
    /CANVAS_SENTINEL_MISSING/,
  );
  await expectBudgetFailure(
    ({ buildRoot }) => writeText(path.join(buildRoot, 'static/chunks/duplicate-canvas.js'), 'CAPTAIN_DOCK_UNIVERSE_CANVAS_V1'),
    /CANVAS_SENTINEL_DUPLICATE/,
  );
  await expectBudgetFailure(
    ({ buildRoot }) => writeText(path.join(buildRoot, 'static/chunks/immersive-shell.js'), '/* no canvas reference */'),
    /CANVAS_SENTINEL_UNREACHABLE/,
  );
});

test('fail closed: enhanced closure 空、immersive root 不一致或 cold route 可达 3D 会失败', async () => {
  await expectBudgetFailure(
    ({ buildRoot }) =>
      writeText(
        path.join(buildRoot, 'static/chunks/canvas-owner.js'),
        'export const CAPTAIN_DOCK_UNIVERSE_CANVAS_V1 = "CAPTAIN_DOCK_UNIVERSE_CANVAS_V1";',
      ),
    /ENHANCED_CLOSURE_EMPTY/,
  );
  await expectBudgetFailure(async ({ buildRoot }) => {
    await writeText(path.join(buildRoot, 'static/chunks/alternate-shell.js'), 'import "static/chunks/canvas-owner.js";');
    await writeRouteManifests(buildRoot, '/(immersive)/[ecosystem]/page', ['static/chunks/alternate-shell.js']);
  }, /ENHANCED_ROOT_MISMATCH/);
  await expectBudgetFailure(
    ({ buildRoot }) =>
      writeText(
        path.join(buildRoot, 'server/app/about.html'),
        routeHtml('/about', ['static/chunks/runtime.js', 'static/chunks/immersive-shell.js']),
      ),
    /COLD_ROUTE_3D_REACHABLE/,
  );
});

test('fail closed: cold route 只泄漏增强依赖也会与 full enhanced closure 相交失败', async () => {
  await expectBudgetFailure(async ({ buildRoot }) => {
    await writeText(path.join(buildRoot, 'static/chunks/shared-three.js'), 'export const shared = "three-runtime";');
    await writeText(
      path.join(buildRoot, 'static/chunks/canvas-owner.js'),
      'export const CAPTAIN_DOCK_UNIVERSE_CANVAS_V1 = "CAPTAIN_DOCK_UNIVERSE_CANVAS_V1"; import "static/chunks/shared-three.js"; import "static/chunks/scene-router.js";',
    );
    await writeText(path.join(buildRoot, 'static/chunks/about.js'), 'import "static/chunks/shared-three.js";');
  }, /COLD_ROUTE_3D_REACHABLE/);
});

test('fail closed: scene sentinel 缺失、重复 owner 或 owner 不独立会失败', async () => {
  await expectBudgetFailure(
    ({ buildRoot }) => writeText(path.join(buildRoot, 'static/chunks/home-scene.js'), '/* missing scene */'),
    /SCENE_SENTINEL_MISSING/,
  );
  await expectBudgetFailure(
    ({ buildRoot }) => writeText(path.join(buildRoot, 'static/chunks/duplicate-scene.js'), 'home-astrolabe'),
    /SCENE_SENTINEL_DUPLICATE/,
  );
  await expectBudgetFailure(
    async ({ buildRoot }) => {
      await writeText(path.join(buildRoot, 'static/chunks/home-scene.js'), 'home-astrolabe arc-orbital-circuit');
      await writeText(path.join(buildRoot, 'static/chunks/arc-scene.js'), '/* moved */');
    },
    /SCENE_SENTINEL_OWNER_NOT_DISTINCT/,
  );
});

test('fail closed: 3D 增量、单路由初始传输和单 scene 闭包超预算会失败', async () => {
  await expectBudgetFailure(
    ({ buildRoot }) =>
      writeNoisyText(
        path.join(buildRoot, 'static/chunks/canvas-owner.js'),
        'CAPTAIN_DOCK_UNIVERSE_CANVAS_V1 import "static/chunks/scene-router.js";',
        270 * 1024,
      ),
    /BUDGET_3D_TOTAL_EXCEEDED/,
  );
  await expectBudgetFailure(
    async ({ buildRoot }) => {
      await writeText(path.join(buildRoot, 'static/chunks/route-fat.js'), 'import "static/chunks/canvas-owner.js";');
      await writeBytes(path.join(buildRoot, 'static/chunks/route-fat-extra.js'), 255 * 1024);
      await writeText(
        path.join(buildRoot, 'static/chunks/canvas-owner.js'),
        'CAPTAIN_DOCK_UNIVERSE_CANVAS_V1 import "static/chunks/scene-router.js"; import "static/chunks/route-fat-extra.js";',
      );
    },
    /BUDGET_ROUTE_3D_EXCEEDED/,
  );
  await expectBudgetFailure(
    ({ buildRoot }) => writeNoisyText(path.join(buildRoot, 'static/chunks/home-scene.js'), 'home-astrolabe', 50 * 1024),
    /BUDGET_SCENE_EXCEEDED/,
  );
});

test('fail closed: shared enhanced base 加当前 scene 超过 250KiB 会报 route 预算错误', async () => {
  await expectBudgetFailure(
    async ({ buildRoot }) => {
      await writeNoisyText(
        path.join(buildRoot, 'static/chunks/canvas-owner.js'),
        'export const CAPTAIN_DOCK_UNIVERSE_CANVAS_V1 = "CAPTAIN_DOCK_UNIVERSE_CANVAS_V1"; import "static/chunks/scene-router.js";',
        248 * KIB,
      );
      await writeNoisyText(path.join(buildRoot, 'static/chunks/home-scene.js'), 'home-astrolabe', 3 * KIB);
    },
    /BUDGET_ROUTE_3D_EXCEEDED/,
  );
});

test('shared enhanced base 从 manifest roots 遍历并在 scene owner 前停止，保留 base 与 scene 重叠依赖', async () => {
  await withFixture(async ({ buildRoot, publicRoot }) => {
    await writeText(path.join(buildRoot, 'static/chunks/base-scene-overlap.js'), 'export const overlap = true;');
    await writeText(
      path.join(buildRoot, 'static/chunks/canvas-owner.js'),
      'export const CAPTAIN_DOCK_UNIVERSE_CANVAS_V1 = "CAPTAIN_DOCK_UNIVERSE_CANVAS_V1"; import "static/chunks/base-scene-overlap.js"; import "static/chunks/scene-router.js";',
    );
    for (const [route, owner] of ROUTE_SCENE_OWNERS) {
      await writeText(
        path.join(buildRoot, owner),
        `export const scene = "${ROUTE_SCENE_SENTINELS.get(route)}"; import "static/chunks/base-scene-overlap.js";`,
      );
    }
    const report = await checkBuildBudgets({ buildRoot, publicRoot, origin: 'http://127.0.0.1:3100' });
    assert.equal(report.ok, true, report.errors.join('\n'));
    assert.ok(report.summary.sharedEnhancedBase.includes('static/chunks/base-scene-overlap.js'));
  });
});

test('fail closed: 本地项目图片缺失或超过 300KiB 会失败', async () => {
  await expectBudgetFailure(
    ({ publicRoot }) => rm(path.join(publicRoot, 'projects/arc/signal-ledger/live.webp')),
    /IMAGE_MISSING/,
  );
  await expectBudgetFailure(
    ({ publicRoot }) => writeBytes(path.join(publicRoot, 'projects/arc/signal-ledger/live.webp'), 301 * 1024),
    /IMAGE_TOO_LARGE/,
  );
});

test('fail closed: 每个 canonical 项目 route 必须至少有本地图片，static media 同样执行 300KiB 上限', async () => {
  await expectBudgetFailure(
    ({ buildRoot }) =>
      writeText(
        path.join(buildRoot, 'server/app/arc/arcpredict.html'),
        routeHtml('/arc/arcpredict', ['static/chunks/runtime.js', 'static/chunks/case.js'], '<p>No image here</p>'),
      ),
    /IMAGE_ROUTE_MISSING/,
  );
  await expectBudgetFailure(
    ({ buildRoot }) => writeBytes(path.join(buildRoot, 'static/media/arcpredict.webp'), 300 * KIB + 1),
    /IMAGE_TOO_LARGE/,
  );
});

test('fail closed: .next static media 图片超过 300KiB 会失败', async () => {
  await expectBudgetFailure(
    ({ buildRoot }) => writeBytes(path.join(buildRoot, 'static/media/arcpredict.webp'), 300 * KIB + 1),
    /IMAGE_TOO_LARGE/,
  );
});

test('fail closed: 本地 route 或 fragment 不存在会失败', async () => {
  await expectLinkFailure(
    ({ buildRoot }) =>
      writeText(
        path.join(buildRoot, 'server/app/index.html'),
        routeHtml('/', ['static/chunks/runtime.js', 'static/chunks/immersive-shell.js'], '<a href="/missing">bad route</a>'),
      ),
    /LINK_ROUTE_MISSING/,
  );
  await expectLinkFailure(
    ({ buildRoot }) =>
      writeText(
        path.join(buildRoot, 'server/app/index.html'),
        routeHtml('/', ['static/chunks/runtime.js', 'static/chunks/immersive-shell.js'], '<a href="/about#missing">bad fragment</a>'),
      ),
    /LINK_FRAGMENT_MISSING/,
  );
});

test('fail closed: 空 href、协议相对 URL、credential 和危险协议会失败', async () => {
  const cases = [
    ['<a href="">empty</a>', /LINK_EMPTY_HREF/],
    ['<a href="//example.com/path">protocol relative</a>', /LINK_PROTOCOL_RELATIVE/],
    ['<a href="https://user:pass@example.com/path">credentials</a>', /LINK_CREDENTIALS/],
    ['<a href="javascript:alert(1)">javascript</a>', /LINK_INSECURE_SCHEME/],
    ['<a href="data:text/html,bad">data</a>', /LINK_INSECURE_SCHEME/],
    ['<a href="file:///tmp/x">file</a>', /LINK_INSECURE_SCHEME/],
    ['<a href="vbscript:msgbox(1)">vbscript</a>', /LINK_INSECURE_SCHEME/],
    ['<a href="http://example.com/path">external http</a>', /LINK_EXTERNAL_HTTP/],
  ];
  for (const [anchor, expected] of cases) {
    await expectLinkFailure(
      ({ buildRoot }) =>
        writeText(
          path.join(buildRoot, 'server/app/index.html'),
          routeHtml('/', ['static/chunks/runtime.js', 'static/chunks/immersive-shell.js'], anchor),
        ),
      expected,
    );
  }
});

test('外部 HTTPS 只做语法检查，loopback/current origin 按本站解析且不发起请求', async () => {
  await withFixture(async ({ buildRoot, publicRoot }) => {
    await writeText(
      path.join(buildRoot, 'server/app/index.html'),
      routeHtml(
        '/',
        ['static/chunks/runtime.js', 'static/chunks/immersive-shell.js'],
        '<a href="https://does-not-need-network.invalid/path">external</a><a href="http://127.0.0.1:3100/about#main-content">local origin</a>',
      ),
    );
    const report = await checkLinks({ buildRoot, publicRoot, origin: 'http://127.0.0.1:3100' });
    assert.equal(report.ok, true, report.errors.join('\n'));
    assert.ok(report.summary.externalHttpsLinks >= 1);
  });
});
