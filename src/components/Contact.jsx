import ContactForm from "./ContactForm.jsx";

export default function Contact() {
  return (
    <section id="contact" className="contact section">
      <div className="contact-orb"></div>
      <div className="section-kicker">06 / LET'S TALK</div>

      <div className="contact-grid">
        <div className="contact-info">
          <h2>
            Ready to get
            <br />
            <em>seen?</em>
          </h2>
          <p>
            Tell us what you're building, what isn't working, or where you
            want to go. We'll help you figure out the next step.
          </p>
          <a className="contact-email" href="mailto:hello@zenxitsolutions.com">
            hello@zenxitsolutions.com <span>↗</span>
          </a>
        </div>

        <ContactForm />
      </div>
    </section>
  );
}
