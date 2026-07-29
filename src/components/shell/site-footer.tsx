import { ControlLink } from '../ui/control-link'

export function SiteFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <p>
          <span aria-hidden="true">⌁</span> Captain Dock / Project index · {currentYear}
        </p>
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
          <ControlLink controlRole="quiet" href="#top">
            Back to top
          </ControlLink>
        </nav>
      </div>
    </footer>
  )
}
