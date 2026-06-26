export default function Footer() {
  return (
    <footer className="foot">
      <div className="foot-inner">
        <div className="foot-brand">
          <div className="mark">SEALED</div>
          <div className="tag">Some letters are worth waiting for.</div>
        </div>

        <div className="foot-col">
          <h4>Discover</h4>
          <ul>
            <li><a href="#waitlist">Join the waitlist</a></li>
            <li><a href="#first-letter">Write a letter</a></li>
          </ul>
        </div>

        <div className="foot-col foot-social">
          <h4>Connect</h4>
          <ul className="social-list">
            <li>
              <a href="https://www.instagram.com/sealed.io" target="_blank" rel="noopener noreferrer" aria-label="Instagram" title="Instagram">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                </svg>
              </a>
            </li>
            <li>
              <a href="https://x.com/sealedapp_io" target="_blank" rel="noopener noreferrer" aria-label="X" title="X">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2H21l-6.52 7.452L22 22h-6.828l-4.77-6.231L4.8 22H2l7.02-8.024L2 2h6.914l4.32 5.713L18.244 2zm-1.197 18h1.84L7.06 4H5.117l11.93 16z" />
                </svg>
              </a>
            </li>
            <li>
              <a href="mailto:info@sealedapp.io" aria-label="Email" title="info@sealedapp.io">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <polyline points="3,7 12,13 21,7" />
                </svg>
              </a>
            </li>
          </ul>
        </div>

        <div className="foot-col">
          <h4>Legal</h4>
          <ul>
            <li><a href="privacy.html">Privacy Policy</a></li>
            <li><a href="terms.html">Terms of Service</a></li>
          </ul>
        </div>
      </div>

      <div className="foot-bottom">
        <span>© 2026 · All rights reserved</span>
      </div>
    </footer>
  );
}
