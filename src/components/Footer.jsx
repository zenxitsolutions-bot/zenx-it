import { ADMIN_URL } from "../lib/adminUrl";

export default function Footer() {
  return (
    <footer>
      <div className="footer-top">
        <a className="brand" href="#top">
          <img src="/logo-icon.png" alt="" className="brand-mark" />
          <span>
            ZENX<span className="muted">.</span>
          </span>
        </a>
        <p>Build. Get Seen. Grow.</p>
        <a href="#top" className="back-top">
          Back to top ↑
        </a>
      </div>
      <div className="footer-bottom">
        <span>© 2026 ZenX IT Solutions Pvt Ltd</span>
        <span>Web • Marketing • Software • POS</span>
        <a href={ADMIN_URL} target="_blank" rel="noopener noreferrer" className="footer-admin-link">
          Admin Login
        </a>
      </div>
    </footer>
  );
}
