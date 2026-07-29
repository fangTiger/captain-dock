'use client'

import type { MouseEvent } from 'react'

export function SkipLink() {
  function focusMainContent(_event: MouseEvent<HTMLAnchorElement>) {
    const main = document.getElementById('main-content')

    if (!main) {
      return
    }

    main.setAttribute('tabindex', '-1')
    main.focus()
  }

  return (
    <a className="skip-link" href="#main-content" onClick={focusMainContent}>
      Skip to main content
    </a>
  )
}
