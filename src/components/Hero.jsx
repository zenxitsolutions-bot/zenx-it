import { handleAppLink } from "../lib/navigate";
import ProductStage from "./ProductStage.jsx";

export default function Hero() {
  return (
    <section className="hero-wrap" id="top">
      <div className="hero">
        <p className="hero-eyebrow">Ideas / People / A brighter tomorrow</p>
        <h1>
          Good ideas.
          <br />
          Beautifully built.
        </h1>
        <p className="hero-text">
          Websites, software, and digital products designed to help your business grow.
        </p>
        <div className="hero-actions">
          <a className="btn btn-dark" href="/enquiry" onClick={(e) => handleAppLink(e, "/enquiry")}>
            Start a project <span>→</span>
          </a>
          <a className="btn btn-light" href="#services" onClick={(e) => handleAppLink(e, "#services")}>
            Explore services
          </a>
        </div>
      </div>
      <ProductStage />
    </section>
  );
}
