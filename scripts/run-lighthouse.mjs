#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { constants } from 'node:fs'
import { access, mkdir, readFile, rm } from 'node:fs/promises'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const host = '127.0.0.1'
const port = 3100
const origin = `http://${host}:${port}`
const productionSwitch = 'CAPTAIN_DOCK_EXTERNAL_PRODUCTION'
const lighthouseRoot = path.join(repoRoot, '.next/lighthouse')
const reportsDir = path.join(lighthouseRoot, 'reports')
const rawDir = path.join(lighthouseRoot, '.lighthouseci')

let nextServer = null
let nextServerExit = null
let cleanupStarted = false

function localBinPath(packageName, binPath) {
  return path.join(repoRoot, 'node_modules', packageName, binPath)
}

async function assertExecutable(filePath, label) {
  try {
    await access(filePath, constants.X_OK)
  } catch (error) {
    throw new Error(`${label} 不存在或不可执行：${filePath} (${error?.message ?? error})`)
  }
}

async function readBuildId() {
  let value
  try {
    value = await readFile(path.join(repoRoot, '.next/BUILD_ID'), 'utf8')
  } catch (error) {
    throw new Error(`BUILD_ID_MISSING: 请先运行 production build (${error?.message ?? error})`)
  }
  const buildId = value.trim()
  if (!buildId) {
    throw new Error('BUILD_ID_EMPTY: .next/BUILD_ID 为空')
  }
  return buildId
}

function assertPortFree(label) {
  return new Promise((resolve, reject) => {
    const probe = net.createServer()
    probe.once('error', (error) => {
      if (error?.code === 'EADDRINUSE') {
        reject(new Error(`PORT_IN_USE: ${label} ${origin} 已被占用；runner 不会终止未知进程`))
        return
      }
      reject(error)
    })
    probe.listen({ host, port }, () => {
      probe.close((error) => {
        if (error) {
          reject(error)
          return
        }
        console.log(`[lighthouse-runner] ${label}: ${origin} 可绑定`)
        resolve()
      })
    })
  })
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function spawnNodeCli(label, cliPath, args, options = {}) {
  const child = spawn(process.execPath, [cliPath, ...args], {
    cwd: options.cwd ?? repoRoot,
    detached: options.detached === true,
    env: options.env ?? process.env,
    stdio: 'inherit',
  })
  child.once('spawn', () => {
    console.log(`[lighthouse-runner] ${label} pid=${child.pid}${options.detached ? ` pgid=${child.pid}` : ''}`)
  })
  return child
}

function waitForChild(child) {
  return new Promise((resolve) => {
    child.once('exit', (code, signal) => {
      resolve({ code, signal })
    })
  })
}

async function runNodeCli(label, cliPath, args, options = {}) {
  const child = spawnNodeCli(label, cliPath, args, options)
  const result = await waitForChild(child)
  if (result.code !== 0) {
    const suffix = result.signal ? `signal=${result.signal}` : `code=${result.code}`
    const error = new Error(`${label} failed: ${suffix}`)
    error.exitCode = typeof result.code === 'number' ? result.code : 1
    throw error
  }
}

function startNextServer(nextCliPath) {
  nextServer = spawnNodeCli(
    'next start',
    nextCliPath,
    ['start', '--hostname', host, '--port', String(port)],
    {
      detached: true,
      env: {
        ...process.env,
        NEXT_PUBLIC_SITE_URL: origin,
      },
    },
  )
  nextServerExit = waitForChild(nextServer)
}

async function waitForReady(buildId) {
  const deadline = Date.now() + 30000
  let lastError = 'not started'

  while (Date.now() < deadline) {
    if (nextServer?.exitCode !== null) {
      throw new Error(`NEXT_START_EXITED: next start 提前退出 code=${nextServer.exitCode}`)
    }
    try {
      const response = await fetch(`${origin}/`, { cache: 'no-store' })
      const html = await response.text()
      if (response.ok && html.includes(buildId)) {
        console.log(`[lighthouse-runner] ready: ${origin}/ 返回当前 BUILD_ID ${buildId}`)
        return
      }
      lastError = `status=${response.status} buildId=${html.includes(buildId)}`
    } catch (error) {
      lastError = error?.message ?? String(error)
    }
    await wait(500)
  }

  throw new Error(`NEXT_START_NOT_READY: ${origin}/ 未在超时内返回当前 BUILD_ID (${lastError})`)
}

async function stopNextServer() {
  if (cleanupStarted) {
    return
  }
  cleanupStarted = true

  if (!nextServer?.pid || nextServer.exitCode !== null || nextServer.signalCode !== null) {
    return
  }

  const processGroup = -nextServer.pid
  console.log(`[lighthouse-runner] cleanup: SIGTERM pgid=${nextServer.pid}`)
  try {
    process.kill(processGroup, 'SIGTERM')
  } catch (error) {
    if (error?.code !== 'ESRCH') {
      throw error
    }
  }

  const terminated = await Promise.race([
    nextServerExit.then(() => true),
    wait(5000).then(() => false),
  ])

  if (!terminated) {
    console.log(`[lighthouse-runner] cleanup: SIGKILL pgid=${nextServer.pid}`)
    try {
      process.kill(processGroup, 'SIGKILL')
    } catch (error) {
      if (error?.code !== 'ESRCH') {
        throw error
      }
    }
    await nextServerExit
  }
}

async function handleSignal(signal) {
  const exitCode = signal === 'SIGINT' ? 130 : 143
  try {
    await stopNextServer()
    await assertPortFree('signal-cleanup')
  } finally {
    process.exit(exitCode)
  }
}

process.once('SIGINT', () => {
  void handleSignal('SIGINT')
})
process.once('SIGTERM', () => {
  void handleSignal('SIGTERM')
})

async function main() {
  const buildId = await readBuildId()
  const nextCliPath = localBinPath('next', 'dist/bin/next')
  const playwrightCliPath = localBinPath('@playwright/test', 'cli.js')
  const lhciCliPath = localBinPath('@lhci/cli', 'src/cli.js')
  const chromePath = chromium.executablePath()

  await Promise.all([
    assertExecutable(nextCliPath, 'Next CLI'),
    assertExecutable(playwrightCliPath, 'Playwright CLI'),
    assertExecutable(lhciCliPath, 'LHCI CLI'),
    assertExecutable(chromePath, 'Playwright Chromium'),
  ])

  await mkdir(lighthouseRoot, { recursive: true })
  await rm(reportsDir, { force: true, recursive: true })
  await rm(rawDir, { force: true, recursive: true })
  await assertPortFree('preflight')

  startNextServer(nextCliPath)

  try {
    await waitForReady(buildId)
    await runNodeCli('production Playwright', playwrightCliPath, ['test', 'tests/e2e/performance.spec.ts', '--config', 'playwright.config.ts'], {
      env: {
        ...process.env,
        [productionSwitch]: '1',
        NEXT_PUBLIC_SITE_URL: origin,
      },
    })
    await runNodeCli('LHCI autorun', lhciCliPath, ['autorun', '--config', path.join(repoRoot, 'lighthouserc.json')], {
      cwd: lighthouseRoot,
      env: {
        ...process.env,
        CHROME_PATH: chromePath,
        NEXT_PUBLIC_SITE_URL: origin,
      },
    })
  } finally {
    await stopNextServer()
    await assertPortFree('post-cleanup')
  }
}

main().catch((error) => {
  console.error(`[lighthouse-runner] ${error?.stack ?? error}`)
  process.exitCode = typeof error?.exitCode === 'number' ? error.exitCode : 1
})
