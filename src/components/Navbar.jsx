import { useState } from "react";
import { ADMIN_URL } from "../lib/adminUrl";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="nav">
      <a className="brand" href="#top" aria-label="ZenX home">
        <img src="/logo-icon.png" alt="" className="brand-mark" />
        <span>
          ZENX<span className="muted">.</span>
        </span>
      </a>
      <nav className={`nav-links${open ? " mobile-open" : ""}`}>
        <a href="#services" onClick={() => setOpen(false)}>Services</a>
        <a href="#products" onClick={() => setOpen(false)}>Products</a>
        <a href="#process" onClick={() => setOpen(false)}>How we work</a>
        <a href="#contact" onClick={() => setOpen(false)}>Contact</a>
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
      <a className="nav-cta" href="#contact">
        Start a project <span>↗</span>
      </a>
      <button
        className="menu-btn"
        aria-label="Open menu"
        onClick={() => setOpen((v) => !v)}
      >
        ☰
      </button>
    </header>
  );
}
