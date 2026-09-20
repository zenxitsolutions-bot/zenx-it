import { useState } from "react";
import { handleAppLink } from "../lib/navigate";
import { ADMIN_URL } from "../lib/adminUrl";

const LINKS = [
  { href: "#services", label: "Services" },
  { href: "#products", label: "Products" },
  { href: "#company", label: "Company" },
];

export default function Navbar({ enquiry = false }) {
  const [open, setOpen] = useState(false);

  const go = (event, href) => {
    handleAppLink(event, href);
    setOpen(false);
  };

  return (
    <header className="nav">
      <div className="nav-brand">
        <a className="brand" href="/" aria-label="ZenX home" onClick={(e) => go(e, "/")}>
          <img className="brand-logo" src="/zenx-it-solutions-logo.png" alt="ZenX IT Solutions" />
        </a>
      </div>
      <nav className={`nav-links${open ? " is-open" : ""}`}>
        {LINKS.map((link) => (
          <a key={link.href} href={enquiry ? `/${link.href}` : link.href} onClick={(e) => go(e, link.href)}>
            {link.label}
          </a>
        ))}
        <a className="nav-admin" href={ADMIN_URL} onClick={() => setOpen(false)}>
          Admin Login
        </a>
      </nav>
      <a className="nav-cta" href="/enquiry" onClick={(e) => go(e, "/enquiry")}>
        Let’s talk
      </a>
      <button
        className="menu-btn"
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "✕" : "☰"}
      </button>
    </header>
  );
}
