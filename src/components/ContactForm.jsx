import { useState } from "react";
import RPNInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { submitEnquiry, isAdminApiConfigured } from "../lib/adminApi";
import { enquiryPayload, validateEnquiry } from "../lib/enquiryForm.js";

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
  source: "",
  message: "",
};

export default function ContactForm({ defaultService = "" }) {
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    lookingFor: LOOKING_FOR_OPTIONS.includes(defaultService) ? defaultService : "",
  });
  const [errors, setErrors] = useState({});
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
    const nextErrors = validateEnquiry(form);
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
      await submitEnquiry(enquiryPayload(form));
      window.location.assign("/thank-you");
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

  return (
    <form className="contact-form-card" noValidate onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-field">
          <label htmlFor="companyName">Company / business name (optional)</label>
          <input
            id="companyName"
            name="companyName"
            type="text"
            placeholder="Acme Inc."
            value={form.companyName}
            onChange={handleChange}
          />
        </div>
        <div className="form-field">
          <label htmlFor="name">Full name (required)</label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="Jane Doe"
            value={form.name}
            onChange={handleChange}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "name-error" : undefined}
          />
          {errors.name && <span id="name-error" className="form-error" role="alert">{errors.name}</span>}
        </div>
      </div>

      <div className="form-row">
        <div className="form-field">
          <label htmlFor="email">Email (required)</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="jane@business.com"
            value={form.email}
            onChange={handleChange}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          {errors.email && <span id="email-error" className="form-error" role="alert">{errors.email}</span>}
        </div>
        <div className="form-field">
          <label htmlFor="phone">Phone (required)</label>
          <RPNInput
            international
            defaultCountry="US"
            id="phone"
            name="phone"
            required
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? "phone-error" : undefined}
            className="phone-field-wrap"
            placeholder="555 000 0000"
            value={form.phone}
            onChange={handlePhoneChange}
          />
          {errors.phone && <span id="phone-error" className="form-error" role="alert">{errors.phone}</span>}
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
          <label htmlFor="lookingFor">What are you looking for? (optional)</label>
          <div className="select-wrap">
            <select
              id="lookingFor"
              name="lookingFor"
              value={form.lookingFor}
              onChange={handleChange}
            >
              <option value="">
                Select an option
              </option>
              {LOOKING_FOR_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="form-field">
        <label htmlFor="source">How did you hear about us? (optional)</label>
        <div className="select-wrap">
          <select id="source" name="source" value={form.source} onChange={handleChange}>
            <option value="">Select an option</option>
            {SOURCE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-field">
        <label htmlFor="message">Tell us about your enquiry (optional)</label>
        <textarea
          id="message"
          name="message"
          placeholder="What are you building, and what would you like help with?"
          value={form.message}
          onChange={handleChange}
        />
      </div>

      {submitError && <span className="form-error">{submitError}</span>}

      <button type="submit" className="btn btn-primary form-submit" disabled={submitting}>
        {submitting ? "Sending…" : "Send enquiry"} <span>↗</span>
      </button>
    </form>
  );
}
