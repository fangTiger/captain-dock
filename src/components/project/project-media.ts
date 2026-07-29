import type { StaticImageData } from 'next/image'

import arcpredictCryptoHome from '../../../public/projects/arc/arcpredict/crypto-home.webp'
import hadronMarket from '../../../public/projects/arc/hadron/hadron-market.webp'
import signalLedgerLiveResearch from '../../../public/projects/arc/signal-ledger/live-research.webp'
import rialoTower from '../../../public/projects/rialo/rialo-captain/rialo-tower.webp'
import type { projects } from '../../content/catalog'
import type { ProjectImage } from '../../content/types'

type CatalogProjectImage = (typeof projects)[number]['gallery'][number]

export type ProjectMediaPath = CatalogProjectImage['src']

const projectMediaAssets = {
  '/projects/arc/signal-ledger/live-research.webp': signalLedgerLiveResearch,
  '/projects/arc/hadron/hadron-market.webp': hadronMarket,
  '/projects/arc/arcpredict/crypto-home.webp': arcpredictCryptoHome,
  '/projects/rialo/rialo-captain/rialo-tower.webp': rialoTower,
} as const satisfies Record<ProjectMediaPath, StaticImageData>

export const projectMediaAssetKeys = Object.freeze(Object.keys(projectMediaAssets) as ProjectMediaPath[])

function isProjectMediaPath(src: ProjectImage['src']): src is ProjectMediaPath {
  return Object.prototype.hasOwnProperty.call(projectMediaAssets, src)
}

export function getProjectMediaAsset(src: ProjectImage['src']): StaticImageData {
  if (!isProjectMediaPath(src)) {
    throw new Error(`Unknown project media asset: ${src}`)
  }

  return projectMediaAssets[src]
}
