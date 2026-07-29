'use client'

type ErrorPageProps = Readonly<{
  error: Error & { digest?: string }
  reset: () => void
}>

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <main id="main-content">
      <h1>Project not available</h1>
      <p>Something interrupted this page. The project content is still isolated from the rest of the site.</p>
      {error.digest ? <p>Reference: {error.digest}</p> : null}
      <button className="control-button" data-control-role="primary" type="button" onClick={reset}>
        Try again
      </button>
    </main>
  )
}
