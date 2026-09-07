import { ADMIN_URL } from "../lib/adminUrl";

export default function Footer() {
  return (
    <footer>
      <div className="footer-top">
        <a className="brand" href="#top">
          <img src="/logo-icon.png" alt="" className="brand-mark" />
          <span>
            ZenX <span className="brand-rest">IT SOLUTIONS</span>
          </span>
        </a>
        <nav className="footer-nav">
          <a href="#services">Services</a>
          <a href="#products">Solutions</a>
          <a href="#process">Work</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
          <a href={ADMIN_URL} target="_blank" rel="noopener noreferrer">
            Admin
          </a>
        </nav>
      </div>
      <div className="footer-bottom">
        <span>© 2026 ZenX IT Solutions Pvt Ltd</span>
        <span>Build. Get Seen. Grow.</span>
      </div>
    </footer>
  );
}
