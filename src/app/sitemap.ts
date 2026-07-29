import type { MetadataRoute } from 'next'

import { getAllPublicRoutes } from '../content/selectors'
import { getCanonicalUrl } from '../lib/metadata'

export default function sitemap(): MetadataRoute.Sitemap {
  return getAllPublicRoutes().map((route) => ({
    url: getCanonicalUrl(route),
  }))
}
