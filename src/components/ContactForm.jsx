import { useState } from "react";
import RPNInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { submitEnquiry, isAdminApiConfigured } from "../lib/adminApi";

const LOOKING_FOR_OPTIONS = [
  "Website",
  "Digital Marketing",
  "Business Software",
  "Small Business POS",
  "ZenX Dietitian application",
  "Something else",
];

const SOURCE_OPTIONS = [
  "Website",
  "Google",
  "Facebook",
  "Instagram",
  "Referral",
  "Direct",
  "Other",
];

const EMPTY_FORM = {
  companyName: "",
  name: "",
  email: "",
  phone: "",
  website: "",
  lookingFor: "",
  source: "Website",
  message: "",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(form) {
  const errors = {};
  if (!form.companyName.trim()) errors.companyName = "Please enter your company or business name.";
  if (!form.name.trim()) errors.name = "Please enter your name.";
  if (!form.email.trim()) errors.email = "Please enter your email.";
  else if (!EMAIL_RE.test(form.email)) errors.email = "Enter a valid email address.";
  if (form.phone.trim() && !isValidPhoneNumber(form.phone.trim())) errors.phone = "Enter a valid phone number.";
  if (!form.lookingFor) errors.lookingFor = "Let us know what you're looking for.";
  if (!form.message.trim()) errors.message = "Tell us a bit about your enquiry.";
  return errors;
}

export default function ContactForm() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((err) => ({ ...err, [name]: undefined }));
  };

  const handlePhoneChange = (value) => {
    setForm((f) => ({ ...f, phone: value || "" }));
    setErrors((err) => ({ ...err, phone: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    if (!isAdminApiConfigured) {
      setSubmitError(
        "We couldn't submit your enquiry right now. Please email us directly at hello@zenxitsolutions.com."
      );
      return;
    }

    setSubmitError("");
    setSubmitting(true);
    try {
      await submitEnquiry({
        companyName: form.companyName,
        contactName: form.name,
        phone: form.phone || "",
        email: form.email,
        website: form.website || null,
        service: form.lookingFor,
        source: form.source,
        notes: form.message,
      });
      setSubmitted(true);
    } catch (err) {
      setSubmitError(
        err?.message && !/failed to submit enquiry/i.test(err.message)
          ? err.message
          : "We couldn't submit your enquiry right now. Please email us directly at hello@zenxitsolutions.com."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <div className="contact-form-card form-success">
        <span className="pulse"></span>
        <h3>Enquiry received.</h3>
        <p>
          Thanks, {form.name.split(" ")[0]}. We've got your enquiry about{" "}
          <strong>{form.lookingFor.toLowerCase()}</strong> and will get back
          to you shortly.
        </p>
        <button type="button" className="btn btn-light" onClick={handleReset}>
          Send another enquiry
        </button>
      </div>
    );
  }

  return (
    <form className="contact-form-card" noValidate onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-field">
          <label htmlFor="companyName">Company / business name</label>
          <input
            id="companyName"
            name="companyName"
            type="text"
            placeholder="Acme Inc."
            value={form.companyName}
            onChange={handleChange}
            aria-invalid={Boolean(errors.companyName)}
          />
          {errors.companyName && <span className="form-error">{errors.companyName}</span>}
        </div>
        <div className="form-field">
          <label htmlFor="name">Full name</label>
          <input
            id="name"
            name="name"
            type="text"
            placeholder="Jane Doe"
            value={form.name}
            onChange={handleChange}
            aria-invalid={Boolean(errors.name)}
          />
          {errors.name && <span className="form-error">{errors.name}</span>}
        </div>
      </div>

      <div className="form-row">
        <div className="form-field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="jane@business.com"
            value={form.email}
            onChange={handleChange}
            aria-invalid={Boolean(errors.email)}
          />
          {errors.email && <span className="form-error">{errors.email}</span>}
        </div>
        <div className="form-field">
          <label htmlFor="phone">Phone (optional)</label>
          <RPNInput
            international
            defaultCountry="US"
            id="phone"
            name="phone"
            className="phone-field-wrap"
            placeholder="555 000 0000"
            value={form.phone}
            onChange={handlePhoneChange}
          />
          {errors.phone && <span className="form-error">{errors.phone}</span>}
        </div>
      </div>

      <div className="form-row">
        <div className="form-field">
          <label htmlFor="website">Website (optional)</label>
          <input
            id="website"
            name="website"
            type="text"
            placeholder="yourbusiness.com"
            value={form.website}
            onChange={handleChange}
          />
        </div>
        <div className="form-field">
          <label htmlFor="lookingFor">What are you looking for?</label>
          <div className="select-wrap">
            <select
              id="lookingFor"
              name="lookingFor"
              value={form.lookingFor}
              onChange={handleChange}
              aria-invalid={Boolean(errors.lookingFor)}
            >
              <option value="" disabled>
                Select an option
              </option>
              {LOOKING_FOR_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          {errors.lookingFor && (
            <span className="form-error">{errors.lookingFor}</span>
          )}
        </div>
      </div>

      <div className="form-field">
        <label htmlFor="source">How did you hear about us?</label>
        <div className="select-wrap">
          <select id="source" name="source" value={form.source} onChange={handleChange}>
            {SOURCE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-field">
        <label htmlFor="message">Tell us about your enquiry</label>
        <textarea
          id="message"
          name="message"
          placeholder="What are you building, and what would you like help with?"
          value={form.message}
          onChange={handleChange}
          aria-invalid={Boolean(errors.message)}
        />
        {errors.message && <span className="form-error">{errors.message}</span>}
      </div>

      {submitError && <span className="form-error">{submitError}</span>}

      <button type="submit" className="btn btn-primary form-submit" disabled={submitting}>
        {submitting ? "Sending…" : "Send enquiry"} <span>↗</span>
      </button>
    </form>
  );
}
