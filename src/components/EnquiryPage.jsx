import ContactForm from "./ContactForm.jsx";
import { getEnquiryContext } from "../lib/consultationOffer.js";

export default function EnquiryPage() {
  const { service, isFreeConsultation } = getEnquiryContext(window.location.search);

  return (
    <main className="enquiry">
      <div className="enquiry-copy">
        <p className="eyebrow">{isFreeConsultation ? "Your next step starts here" : "Let’s talk"}</p>
        <h1>
          {isFreeConsultation ? (
            <>Claim your free consultation.</>
          ) : (
            <>Start an<br />enquiry.</>
          )}
        </h1>
        <p>
          {isFreeConsultation
            ? "Tell us what you have in mind. Get a free consultation about your website, software, or digital marketing needs. Share your details and we’ll get in touch."
            : "Tell us about your business and what you have in mind. From websites and software to digital marketing, we'd love to help you take the next step."}
        </p>
        <a className="contact-email" href="mailto:hello@zenxitsolutions.com">
          hello@zenxitsolutions.com
        </a>
      </div>
      <ContactForm defaultService={service} />
    </main>
  );
}
