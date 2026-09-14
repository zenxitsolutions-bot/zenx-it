import { handleAppLink } from "../lib/navigate";

export default function Cta() {
  return (
    <section className="final-cta">
      <div className="final-cta-copy">
        <p className="eyebrow">Let’s build together</p>
        <h2>
          Your next chapter starts here.
        </h2>
        <p>Tell us about your idea. We’d love to hear from you.</p>
      </div>
      <a className="btn btn-white" href="/enquiry" onClick={(e) => handleAppLink(e, "/enquiry")}>
        Let’s talk <span>→</span>
      </a>
    </section>
  );
}
