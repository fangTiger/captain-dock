import type { MetadataRoute } from 'next'

import { getRobots, getSiteOrigin } from '../lib/metadata'
import type { MetadataEnvironment } from '../lib/metadata'

function shouldDisallowIndexing(env: MetadataEnvironment) {
  const robots = getRobots(env)

  return Boolean(robots && typeof robots === 'object' && 'index' in robots && robots.index === false)
}

export function buildRobots(env: MetadataEnvironment = process.env): MetadataRoute.Robots {
  const origin = getSiteOrigin(env)

  return {
    rules: {
      ...(shouldDisallowIndexing(env) ? { disallow: '/' } : { allow: '/' }),
      userAgent: '*',
    },
    sitemap: `${origin}/sitemap.xml`,
  }
}

export default function robots(): MetadataRoute.Robots {
  return buildRobots()
}
