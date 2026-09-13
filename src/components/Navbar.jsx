import { useState } from "react";
import { ADMIN_URL } from "../lib/adminUrl";

const LINKS = [
  { href: "#top", label: "Home" },
  { href: "#services", label: "Services" },
  { href: "#products", label: "Solutions" },
  { href: "#process", label: "Work" },
  { href: "#about", label: "About" },
  { href: "#contact", label: "Contact" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="nav">
      <a className="brand" href="#top" aria-label="ZenX home">
        <img src="/logo-icon.png" alt="" className="brand-mark" />
        <span>
          ZenX <span className="brand-rest">IT SOLUTIONS</span>
        </span>
      </a>
      <nav className={`nav-links${open ? " mobile-open" : ""}`}>
        {LINKS.map((link) => (
          <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
            {link.label}
          </a>
        ))}
        <a
          href={ADMIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="nav-admin-link"
          onClick={() => setOpen(false)}
        >
          Admin Login
        </a>
      </nav>
      <a className="nav-cta" href="#contact" onClick={() => setOpen(false)}>
        Get Started
      </a>
      <button
        className="menu-btn"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "✕" : "☰"}
      </button>
    </header>
  );
}
