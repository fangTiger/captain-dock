import { ImageResponse } from 'next/og'

export const alt = 'Captain Dock share image'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'stretch',
          background: '#050608',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          justifyContent: 'space-between',
          padding: '72px',
          width: '100%',
        }}
      >
        <div
          style={{
            border: '1px solid rgba(125, 211, 252, 0.42)',
            display: 'flex',
            flex: '1',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '56px',
          }}
        >
          <div style={{ color: '#7dd3fc', fontSize: 30, letterSpacing: 0, textTransform: 'uppercase' }}>
            Arc / Rialo
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ fontSize: 86, fontWeight: 700, letterSpacing: 0, lineHeight: 1 }}>Captain Dock</div>
            <div style={{ color: '#cbd5e1', fontSize: 34, lineHeight: 1.35, maxWidth: 860 }}>
              A readable portfolio universe for project case files, ecosystem routes, and live product exits.
            </div>
          </div>
          <div style={{ color: '#fbbf24', fontSize: 28, letterSpacing: 0 }}>Static local Open Graph image</div>
        </div>
      </div>
    ),
    size,
  )
}
