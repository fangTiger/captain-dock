export type EcosystemSlug = 'arc' | 'rialo'

export type ProjectSlug = 'signal-ledger' | 'hadron' | 'arcpredict' | 'rialo-captain'

export type ProjectStatus = 'DEMO' | 'TESTNET' | 'EXPERIMENTAL'

export type SeoFields = {
  title: string
  description: string
  image?: `/projects/${string}`
}

export type EcosystemTheme = {
  accent: string
  surface: string
  glow: string
  motif: 'orbital-circuit' | 'reactive-radar'
}

export type ProjectTheme = {
  accent: string
  aura: string
  motif: 'ledger' | 'market' | 'probability' | 'flight'
}

export type CoreLoopStep = {
  label: string
  description: string
}

export type EvidenceItem = {
  label: string
  description: string
  status: ProjectStatus
}

export type StackLane = {
  lane: 'Interface' | 'Data/Realtime' | 'Settlement/Trust' | 'AI/Operations'
  items: readonly string[]
}

export type ProjectImage = {
  src: `/projects/${string}`
  alt: string
  caption: string
}

export type Ecosystem = {
  slug: EcosystemSlug
  name: string
  index: string
  statement: string
  description: string
  theme: EcosystemTheme
  scenePreset: 'arc-orbit' | 'rialo-radar'
  seo: SeoFields
}

export type Project = {
  slug: ProjectSlug
  ecosystem: EcosystemSlug
  name: string
  /** 详情页与项目卡片使用的描述性副标题。 */
  tagline: string
  /** 星座节点与首页使用的一句话判断语，区别于描述性 tagline。 */
  statement: string
  summary: string
  status: readonly ProjectStatus[]
  liveUrl: `https://${string}`
  roles: readonly string[]
  tags: readonly string[]
  coreLoop: readonly CoreLoopStep[]
  evidence: readonly EvidenceItem[]
  stack: readonly StackLane[]
  gallery: readonly ProjectImage[]
  limits: readonly string[]
  theme: ProjectTheme
  seo: SeoFields
}
