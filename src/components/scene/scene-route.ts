import type { ImmersiveSceneId } from './scene-types'

export const IMMERSIVE_SCENE_ROUTE_MAP = {
  '/': 'home',
  '/arc': 'arc',
  '/rialo': 'rialo',
} as const satisfies Record<'/' | '/arc' | '/rialo', ImmersiveSceneId>

type ImmersiveScenePathname = keyof typeof IMMERSIVE_SCENE_ROUTE_MAP

function isImmersiveScenePathname(pathname: string): pathname is ImmersiveScenePathname {
  return Object.hasOwn(IMMERSIVE_SCENE_ROUTE_MAP, pathname)
}

export function getImmersiveSceneForPathname(pathname: unknown): ImmersiveSceneId | null {
  if (typeof pathname !== 'string' || !isImmersiveScenePathname(pathname)) {
    return null
  }

  return IMMERSIVE_SCENE_ROUTE_MAP[pathname]
}
