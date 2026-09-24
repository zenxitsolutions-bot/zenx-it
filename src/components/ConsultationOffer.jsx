import { FREE_CONSULTATION_HREF } from "../lib/consultationOffer.js";
import { handleAppLink } from "../lib/navigate";

export default function ConsultationOffer() {
  return (
    <section className="consultation-offer" aria-labelledby="consultation-offer-title">
      <div className="consultation-offer-copy">
        <p className="consultation-offer-label">
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="m10 1 2.2 6.8L19 10l-6.8 2.2L10 19l-2.2-6.8L1 10l6.8-2.2L10 1Z" fill="currentColor" />
          </svg>
          Free consultation
        </p>
        <h2 id="consultation-offer-title">Have an idea? <span>Let’s bring it to life.</span></h2>
        <p className="consultation-offer-description">
          Get a free consultation about your website, software, or digital marketing needs.
        </p>
        <ul className="consultation-offer-topics" aria-label="Consultation topics">
          <li>Websites</li>
          <li>Software</li>
          <li>Digital marketing</li>
        </ul>
      </div>
      <div className="consultation-offer-action">
        <svg className="consultation-offer-flourish" viewBox="0 0 100 56" fill="none" aria-hidden="true">
          <path d="M5 18C26 1 62 7 65 24c3 18-39 17-35 0 4-15 39-8 53 18m-18-6 19 8 3-21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <a className="btn consultation-offer-button" href={FREE_CONSULTATION_HREF}
          onClick={(event) => handleAppLink(event, FREE_CONSULTATION_HREF)}>
          <span>Claim your <strong>FREE</strong> consultation</span>
          <span className="consultation-offer-arrow" aria-hidden="true">↗</span>
        </a>
        <p>A conversation about your next step.</p>
      </div>
    </section>
  );
}
