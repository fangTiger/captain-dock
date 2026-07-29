'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

type SiteFooterSlotProps = Readonly<{
  children: ReactNode
}>

/**
 * 首页是零滚动门面，页脚在此让位；其余路由照常渲染。
 *
 * 页脚内容通过 children 传入，因此 SiteFooter 本身仍是服务端组件，
 * 不会因为这层判断而被迫客户端化。
 */
export function SiteFooterSlot({ children }: SiteFooterSlotProps) {
  const pathname = usePathname()

  if (pathname === '/') {
    return null
  }

  return <>{children}</>
}
