import useReveal from "../hooks/useReveal.js";

export default function Hero() {
  const copyRef = useReveal();
  const artRef = useReveal();

  return (
    <section className="hero">
      <div className="hero-copy reveal" ref={copyRef}>
        <p className="eyebrow">
          <span className="dot"></span> IT • DIGITAL • GROWTH
        </p>
        <h1>
          Make your
          <br />
          <em>business</em>
          <br />
          visible.
        </h1>
        <p className="hero-text">
          We build websites, digital marketing systems and smart business
          software that help brands get discovered, connect with customers
          and grow.
        </p>
        <div className="hero-actions">
          <a className="btn btn-primary" href="#contact">
            Let's build <span>↗</span>
          </a>
          <a className="text-link" href="#services">
            Explore what we do <span>↓</span>
          </a>
        </div>
      </div>

      <div className="hero-art reveal" ref={artRef}>
        <div className="orb orb-a"></div>
        <div className="orb orb-b"></div>
        <div className="orbit orbit-1"></div>
        <div className="orbit orbit-2"></div>
        <div className="hero-card card-main">
          <div className="mini-label">DIGITAL PRESENCE</div>
          <div className="metric">∞</div>
          <div className="card-bottom">
            <span>LOCAL</span>
            <span>GLOBAL</span>
            <span>GROWTH</span>
          </div>
        </div>
        <div className="hero-card card-float">
          <span className="pulse"></span>
          <div>
            <strong>Visibility</strong>
            <small>always moving</small>
          </div>
          <span className="arrow">↗</span>
        </div>
      </div>
      <div className="hero-scroll">
        SCROLL TO EXPLORE <span>↓</span>
      </div>
    </section>
  );
}
