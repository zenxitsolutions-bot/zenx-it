import ContactForm from "./ContactForm.jsx";

export default function EnquiryPage() {
  const params = new URLSearchParams(window.location.search);
  const service = params.get("service") || "";

  return (
    <main className="enquiry">
      <div className="enquiry-copy">
        <p className="eyebrow">Let’s talk</p>
        <h1>
          Start an
          <br />
          enquiry.
        </h1>
        <p>
          Tell us about your business and what you have in mind. From websites and
          software to digital marketing, we'd love to help you take the next step.
        </p>
        <a className="contact-email" href="mailto:hello@zenxitsolutions.com">
          hello@zenxitsolutions.com
        </a>
      </div>
      <ContactForm defaultService={service} />
    </main>
  );
}
