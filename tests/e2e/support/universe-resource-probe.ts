import { expect, type BrowserContext, type Page } from '@playwright/test'

export type UniverseResourceSnapshot = Readonly<{
  activeUniverseContextCount: number
  intersectionObserverCount: number
  listenerCount: number
  pendingAnimationFrameCount: number
  realmToken: string
  universeContextCreateCount: number
}>

type ProbeVisibilityState = 'hidden' | 'visible'

type UniverseResourceProbeApi = {
  restoreDocumentVisibility: () => void
  setDocumentVisibility: (state: ProbeVisibilityState) => void
  snapshot: () => UniverseResourceSnapshot
}

declare global {
  interface Window {
    __captainDockUniverseResourceProbe?: UniverseResourceProbeApi
  }
}

function installProbeInBrowser() {
  if (window.__captainDockUniverseResourceProbe) {
    return
  }

  type ListenerBucket = {
    callbacks: WeakSet<object>
    count: number
  }

  const listenerRecords = new WeakMap<EventTarget, Map<string, ListenerBucket>>()
  const trackedNodeTargets = new Set<Node>()
  let listenerCount = 0
  const originalAddEventListener = EventTarget.prototype.addEventListener
  const originalRemoveEventListener = EventTarget.prototype.removeEventListener
  const realmToken =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `realm-${Date.now()}-${Math.random()}`

  function getCapture(options?: boolean | AddEventListenerOptions) {
    return typeof options === 'boolean' ? options : Boolean(options?.capture)
  }

  function isOnceListener(options?: boolean | AddEventListenerOptions) {
    return typeof options === 'object' && Boolean(options.once)
  }

  function getSignal(options?: boolean | AddEventListenerOptions) {
    return typeof options === 'object' ? options.signal : undefined
  }

  function getListenerKey(type: string, options?: boolean | AddEventListenerOptions) {
    return `${type}:${getCapture(options) ? 'capture' : 'bubble'}`
  }

  function shouldTrackListener(target: EventTarget, type: string) {
    // Next dev runtime 会在首次客户端 warning 后懒加载全局快捷键和 DOMContentLoaded 兜底；它们不是 Universe 生命周期资源。
    return !(
      (target === window && type === 'keydown') ||
      (target === document && type === 'DOMContentLoaded')
    )
  }

  function targetHasTrackedListeners(target: EventTarget) {
    const targetRecords = listenerRecords.get(target)

    if (!targetRecords) {
      return false
    }

    for (const bucket of targetRecords.values()) {
      if (bucket.count > 0) {
        return true
      }
    }

    return false
  }

  function forgetTargetIfEmpty(target: EventTarget) {
    if (!targetHasTrackedListeners(target) && target instanceof Node) {
      trackedNodeTargets.delete(target)
    }
  }

  function untrackListener(target: EventTarget, bucket: ListenerBucket, callback: object) {
    if (bucket.callbacks.delete(callback)) {
      bucket.count = Math.max(0, bucket.count - 1)
      listenerCount = Math.max(0, listenerCount - 1)
      forgetTargetIfEmpty(target)
    }
  }

  function clearDetachedTargetListeners(target: EventTarget) {
    const targetRecords = listenerRecords.get(target)

    if (!targetRecords) {
      return
    }

    for (const bucket of targetRecords.values()) {
      listenerCount = Math.max(0, listenerCount - bucket.count)
      bucket.count = 0
      bucket.callbacks = new WeakSet<object>()
    }

    listenerRecords.delete(target)

    if (target instanceof Node) {
      trackedNodeTargets.delete(target)
    }
  }

  function clearRemovedNodeListeners(node: Node) {
    if (!node.isConnected && node instanceof EventTarget) {
      clearDetachedTargetListeners(node)
    }

    const walker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT)
    let child = walker.nextNode()

    while (child) {
      if (!child.isConnected && child instanceof EventTarget) {
        clearDetachedTargetListeners(child)
      }

      child = walker.nextNode()
    }
  }

  const listenerDetachObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.removedNodes) {
        clearRemovedNodeListeners(node)
      }
    }
  })

  listenerDetachObserver.observe(document, { childList: true, subtree: true })

  function sweepDetachedListenerTargets() {
    for (const target of [...trackedNodeTargets]) {
      if (!target.isConnected) {
        clearDetachedTargetListeners(target)
      }
    }
  }

  EventTarget.prototype.addEventListener = function addEventListener(
    this: EventTarget,
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ) {
    const signal = getSignal(options)

    if (callback && !signal?.aborted && !isOnceListener(options) && shouldTrackListener(this, type)) {
      const key = getListenerKey(type, options)
      let targetRecords = listenerRecords.get(this)

      if (!targetRecords) {
        targetRecords = new Map()
        listenerRecords.set(this, targetRecords)
      }

      let bucket = targetRecords.get(key)

      if (!bucket) {
        bucket = {
          callbacks: new WeakSet<object>(),
          count: 0,
        }
        targetRecords.set(key, bucket)
      }

      const callbackRecord = callback as object

      if (!bucket.callbacks.has(callbackRecord)) {
        bucket.callbacks.add(callbackRecord)
        bucket.count += 1
        listenerCount += 1

        if (this instanceof Node) {
          trackedNodeTargets.add(this)
        }

        if (signal) {
          originalAddEventListener.call(signal, 'abort', () => {
            untrackListener(this, bucket as ListenerBucket, callbackRecord)
          }, { once: true })
        }
      }
    }

    return originalAddEventListener.call(this, type, callback, options)
  }

  EventTarget.prototype.removeEventListener = function removeEventListener(
    this: EventTarget,
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ) {
    if (callback && shouldTrackListener(this, type)) {
      const bucket = listenerRecords.get(this)?.get(getListenerKey(type, options))

      if (bucket) {
        untrackListener(this, bucket, callback as object)
      }
    }

    return originalRemoveEventListener.call(this, type, callback, options)
  }

  const OriginalIntersectionObserver = window.IntersectionObserver
  let intersectionObserverCount = 0

  if (typeof OriginalIntersectionObserver === 'function') {
    window.IntersectionObserver = function IntersectionObserver(
      this: IntersectionObserver,
      callback: IntersectionObserverCallback,
      options?: IntersectionObserverInit,
    ) {
      const observer = new OriginalIntersectionObserver(callback, options)
      const record = {
        count: 0,
        observed: new WeakSet<Element>(),
      }
      const originalObserve = observer.observe.bind(observer)
      const originalUnobserve = observer.unobserve.bind(observer)
      const originalDisconnect = observer.disconnect.bind(observer)

      observer.observe = (element: Element) => {
        if (!record.observed.has(element)) {
          record.observed.add(element)
          record.count += 1
          intersectionObserverCount += 1
        }

        return originalObserve(element)
      }

      observer.unobserve = (element: Element) => {
        if (record.observed.delete(element)) {
          record.count = Math.max(0, record.count - 1)
          intersectionObserverCount = Math.max(0, intersectionObserverCount - 1)
        }

        return originalUnobserve(element)
      }

      observer.disconnect = () => {
        intersectionObserverCount = Math.max(0, intersectionObserverCount - record.count)
        record.count = 0
        record.observed = new WeakSet<Element>()

        return originalDisconnect()
      }

      return observer
    } as unknown as typeof IntersectionObserver
  }

  const originalRequestAnimationFrame = window.requestAnimationFrame.bind(window)
  const originalCancelAnimationFrame = window.cancelAnimationFrame.bind(window)
  const pendingAnimationFrames = new Set<number>()

  window.requestAnimationFrame = (callback: FrameRequestCallback) => {
    const id = originalRequestAnimationFrame((time) => {
      pendingAnimationFrames.delete(id)
      callback(time)
    })

    pendingAnimationFrames.add(id)

    return id
  }

  window.cancelAnimationFrame = (id: number) => {
    pendingAnimationFrames.delete(id)

    return originalCancelAnimationFrame(id)
  }

  const originalGetContext = HTMLCanvasElement.prototype.getContext
  const universeContextTokens = new WeakMap<object, string>()
  const activeUniverseContextTokens = new Set<string>()
  let universeContextCreateCount = 0

  function isWebGLContextId(contextId: string) {
    return contextId === 'webgl' || contextId === 'webgl2' || contextId === 'experimental-webgl'
  }

  function shouldTrackUniverseContext(canvas: HTMLCanvasElement) {
    return canvas.isConnected && canvas.matches('canvas[data-universe-canvas]')
  }

  function trackUniverseContext(canvas: HTMLCanvasElement, context: unknown) {
    if (!context || (typeof context !== 'object' && typeof context !== 'function')) {
      return
    }

    const contextObject = context as object
    let token = universeContextTokens.get(contextObject)

    if (!token) {
      universeContextCreateCount += 1
      token = `universe-context-${universeContextCreateCount}`
      universeContextTokens.set(contextObject, token)

      originalAddEventListener.call(canvas, 'webglcontextlost', () => {
        activeUniverseContextTokens.delete(token as string)
      })
      originalAddEventListener.call(canvas, 'webglcontextrestored', () => {
        activeUniverseContextTokens.add(token as string)
      })
    }

    activeUniverseContextTokens.add(token)
  }

  HTMLCanvasElement.prototype.getContext = function getContext(
    this: HTMLCanvasElement,
    contextId: string,
    ...args: unknown[]
  ) {
    const context = originalGetContext.call(this, contextId, ...args as []) as unknown

    if (isWebGLContextId(contextId) && shouldTrackUniverseContext(this)) {
      trackUniverseContext(this, context)
    }

    return context
  } as typeof HTMLCanvasElement.prototype.getContext

  const originalVisibilityDescriptor = Object.getOwnPropertyDescriptor(document, 'visibilityState')

  function activeUniverseContextCount() {
    return activeUniverseContextTokens.size
  }

  function restoreDocumentVisibility() {
    if (originalVisibilityDescriptor) {
      Object.defineProperty(document, 'visibilityState', originalVisibilityDescriptor)
    } else {
      Reflect.deleteProperty(document, 'visibilityState')
    }

    document.dispatchEvent(new Event('visibilitychange'))
  }

  window.__captainDockUniverseResourceProbe = {
    restoreDocumentVisibility,
    setDocumentVisibility(state: ProbeVisibilityState) {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => state,
      })
      document.dispatchEvent(new Event('visibilitychange'))
    },
    snapshot() {
      sweepDetachedListenerTargets()

      return Object.freeze({
        activeUniverseContextCount: activeUniverseContextCount(),
        intersectionObserverCount,
        listenerCount,
        pendingAnimationFrameCount: pendingAnimationFrames.size,
        realmToken,
        universeContextCreateCount,
      })
    },
  }
}

export async function installUniverseResourceProbe(context: BrowserContext) {
  await context.addInitScript(installProbeInBrowser)
}

export async function readUniverseResourceSnapshot(page: Page) {
  return page.evaluate(() => {
    const probe = window.__captainDockUniverseResourceProbe

    if (!probe) {
      throw new Error('Universe resource probe is not installed.')
    }

    return probe.snapshot()
  })
}

export async function setUniverseDocumentVisibility(page: Page, state: ProbeVisibilityState) {
  await page.evaluate((nextState) => {
    const probe = window.__captainDockUniverseResourceProbe

    if (!probe) {
      throw new Error('Universe resource probe is not installed.')
    }

    probe.setDocumentVisibility(nextState)
  }, state)
}

export async function restoreUniverseDocumentVisibility(page: Page) {
  await page.evaluate(() => {
    const probe = window.__captainDockUniverseResourceProbe

    if (!probe) {
      throw new Error('Universe resource probe is not installed.')
    }

    probe.restoreDocumentVisibility()
  })
}

export async function expectUniverseResourcesAtBaseline(
  page: Page,
  baseline: UniverseResourceSnapshot,
  timeout = 1500,
) {
  const baselineResourceCounts = {
    activeUniverseContextCount: baseline.activeUniverseContextCount,
    intersectionObserverCount: baseline.intersectionObserverCount,
    listenerCount: baseline.listenerCount,
    pendingAnimationFrameCount: baseline.pendingAnimationFrameCount,
    realmToken: baseline.realmToken,
  }

  await expect
    .poll(async () => {
      const snapshot = await readUniverseResourceSnapshot(page)

      return {
        activeUniverseContextCount: snapshot.activeUniverseContextCount,
        intersectionObserverCount: snapshot.intersectionObserverCount,
        listenerCount: snapshot.listenerCount,
        pendingAnimationFrameCount: snapshot.pendingAnimationFrameCount,
        realmToken: snapshot.realmToken,
      }
    }, { timeout })
    .toEqual(baselineResourceCounts)
}
