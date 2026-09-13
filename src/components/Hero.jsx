import useReveal from "../hooks/useReveal.js";

const CHIPS = [
  { className: "chip-design", label: "Design", icon: "✦" },
  { className: "chip-web", label: "Web & Apps", icon: "</>" },
  { className: "chip-ai", label: "AI & Automation", icon: "◎" },
  { className: "chip-mkt", label: "Digital Marketing", icon: "◈" },
  { className: "chip-cloud", label: "Cloud", icon: "☁" },
];

export default function Hero() {
  const copyRef = useReveal();
  const artRef = useReveal();

  return (
    <section className="hero">
      <div className="hero-copy reveal" ref={copyRef}>
        <p className="eyebrow">
          <span className="dot"></span> YOUR DIGITAL GROWTH PARTNER
        </p>
        <h1>
          Build. Get Seen. <em>Grow.</em>
        </h1>
        <p className="hero-text">
          We build digital products, elevate your brand, and accelerate business
          growth — websites, marketing systems, and software that help you get
          found and remembered.
        </p>
        <div className="hero-actions">
          <a className="btn btn-primary" href="#contact">
            Start Your Project <span>→</span>
          </a>
          <a className="btn btn-ghost" href="#services">
            Explore Services
          </a>
        </div>
        <div className="hero-proof">
          <div className="hero-avatars" aria-hidden="true">
            <span>ZX</span>
            <span>IT</span>
            <span>✦</span>
          </div>
          <p>
            Helping healthcare, retail, and local businesses
            <strong> get seen and grow</strong>
          </p>
        </div>
      </div>

      <div className="hero-art reveal" ref={artRef}>
        <div className="hero-ring"></div>
        <div className="hero-ring hero-ring-inner"></div>
        <div className="hero-laptop">
          <div className="laptop-screen">
            <img src="/logo-icon.png" alt="" />
            <strong>ZENX</strong>
            <small>IT SOLUTIONS</small>
          </div>
          <div className="laptop-base"></div>
        </div>
        {CHIPS.map((chip) => (
          <div key={chip.label} className={`float-chip ${chip.className}`}>
            <span className="float-chip-icon">{chip.icon}</span>
            <span>{chip.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
