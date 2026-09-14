import { handleAppLink } from "../lib/navigate";

export default function Footer() {
  return (
    <footer className="footer" id="company">
      <div className="footer-top">
        <a className="footer-brand" href="/" onClick={(e) => handleAppLink(e, "/")}>
          ZenX <span>IT Solutions</span>
        </a>
        <nav>
          <a href="#services" onClick={(e) => handleAppLink(e, "#services")}>
            Services
          </a>
          <a href="#products" onClick={(e) => handleAppLink(e, "#products")}>
            Products
          </a>
          <a href="#company" onClick={(e) => handleAppLink(e, "#company")}>
            Company
          </a>
        </nav>
        <p>Ideas for a brighter tomorrow</p>
      </div>
      <div className="footer-bottom">
        <span>© 2026 ZenX IT Solutions. All rights reserved.</span>
        <div className="footer-legal">
          <a href="/enquiry" onClick={(e) => handleAppLink(e, "/enquiry")}>
            Privacy
          </a>
          <a href="/enquiry" onClick={(e) => handleAppLink(e, "/enquiry")}>
            Terms
          </a>
          <a href="/enquiry" onClick={(e) => handleAppLink(e, "/enquiry")}>
            Contact
          </a>
        </div>
        <div className="footer-social">
          <a href="https://www.linkedin.com" target="_blank" rel="noreferrer" aria-label="ZenX IT Solutions on LinkedIn">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M6.5 9.5v10h-3v-10h3ZM5 4.2a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6ZM20.5 19.5h-3v-5.3c0-1.6-.6-2.4-1.7-2.4-1.2 0-1.8.8-1.8 2.4v5.3h-3v-10h3v1.3c.6-.9 1.6-1.6 3.1-1.6 2.3 0 3.4 1.5 3.4 4.5v5.8Z" />
            </svg>
          </a>
          <a
            href="https://www.instagram.com/zenxitsolutions/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="ZenX IT Solutions on Instagram"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="12" cy="12" r="4.1" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="17.2" cy="6.8" r="1.15" fill="currentColor" />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}
