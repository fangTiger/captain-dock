import { ControlLink } from '../ui/control-link'
import { ExternalLink } from '../ui/external-link'

const demosHref = 'https://demos.captain-dock.xyz' as const

export function SiteFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__meta">
          <p>
            <span aria-hidden="true">⌁</span> Captain Dock / Project index · {currentYear}
          </p>
          <p className="site-footer__contact">
            <span>Contact</span>
            <ExternalLink href="https://x.com/mycndota">X @mycndota</ExternalLink>
          </p>
        </div>
        <nav aria-label="Footer navigation">
          <ControlLink controlRole="quiet" href="/">
            Home
          </ControlLink>
          <ControlLink controlRole="quiet" href="/arc">
            Arc
          </ControlLink>
          <ControlLink controlRole="quiet" href="/rialo">
            Rialo
          </ControlLink>
          <ExternalLink href={demosHref}>Demos</ExternalLink>
          <ControlLink controlRole="quiet" href="#top">
            Back to top
          </ControlLink>
        </nav>
      </div>
    </footer>
  )
}
