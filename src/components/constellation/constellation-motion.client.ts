'use client'

import { useEffect } from 'react'

import {
  CURSOR_LERP_MULTIPLIER,
  RESPONSIVENESS,
  SENSITIVITY,
} from '../../lib/constellation-motion'

type ConstellationPointerTarget = Readonly<{
  x: number
  y: number
}>

const pointerTarget = {
  x: 0,
  y: 0,
}

export const CONSTELLATION_STARFIELD_LERP = Math.min(
  1,
  RESPONSIVENESS * SENSITIVITY,
)

export const CONSTELLATION_CURSOR_LERP = Math.min(
  1,
  RESPONSIVENESS * CURSOR_LERP_MULTIPLIER,
)

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum)
}

export function interpolateConstellationValue(
  current: number,
  target: number,
  factor: number,
) {
  return current + (target - current) * clamp(factor, 0, 1)
}

// 指针事件只记录目标值，视觉变换统一交给渲染循环插值。
export function recordConstellationPointer(
  clientX: number,
  clientY: number,
  viewportWidth: number,
  viewportHeight: number,
) {
  if (viewportWidth <= 0 || viewportHeight <= 0) {
    resetConstellationPointer()
    return
  }

  pointerTarget.x = clamp((clientX / viewportWidth) * 2 - 1, -1, 1)
  pointerTarget.y = clamp(1 - (clientY / viewportHeight) * 2, -1, 1)
}

export function resetConstellationPointer() {
  pointerTarget.x = 0
  pointerTarget.y = 0
}

export function getConstellationPointerTarget(): ConstellationPointerTarget {
  return {
    x: pointerTarget.x,
    y: pointerTarget.y,
  }
}

export function useConstellationPointerTracking(
  enabled: boolean,
  requestFrame: () => void,
) {
  useEffect(() => {
    if (!enabled) {
      resetConstellationPointer()
      return
    }

    const record = (event: PointerEvent) => {
      recordConstellationPointer(
        event.clientX,
        event.clientY,
        window.innerWidth,
        window.innerHeight,
      )
      requestFrame()
    }
    const reset = () => {
      resetConstellationPointer()
      requestFrame()
    }

    window.addEventListener('pointermove', record, { passive: true })
    window.addEventListener('blur', reset)

    return () => {
      window.removeEventListener('pointermove', record)
      window.removeEventListener('blur', reset)
      resetConstellationPointer()
    }
  }, [enabled, requestFrame])
}
