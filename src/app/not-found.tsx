import Link from 'next/link'

import { buildNotFoundMetadata } from '../lib/metadata'

export const metadata = buildNotFoundMetadata()

export default function NotFound() {
  return (
    <main id="main-content">
      <h1>Project not found</h1>
      <p>The requested route is not part of the public Captain Dock map.</p>
      <nav aria-label="404 recovery routes">
        <Link href="/">Return to Captain Dock</Link>
        <Link href="/arc">Browse Arc projects</Link>
      </nav>
    </main>
  )
}
