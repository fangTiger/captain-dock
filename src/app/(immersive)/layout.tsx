import type { ReactNode } from 'react'

import { UniverseShell } from '../../components/scene/universe-shell.client'

type ImmersiveLayoutProps = Readonly<{
  children: ReactNode
}>

export default function ImmersiveLayout({ children }: ImmersiveLayoutProps) {
  return <UniverseShell>{children}</UniverseShell>
}
