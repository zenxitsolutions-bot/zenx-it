import { useEffect, useState, type FormEvent } from "react";
import { PartyPopper, CheckCircle2, Copy, RefreshCw, AlertCircle } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { FieldWrap, Input } from "../ui/Field";
import { PhoneField } from "../ui/PhoneField";
import { toE164OrEmpty } from "../../utils/phone";
import type { ApplicationSlug, Enquiry } from "../../types/domain";
import { provisioningService, generateUniqueCompanySlug } from "../../services/provisioning";
import { generateTempPassword } from "../../utils/password";
import { useAuth } from "../../context/AuthContext";

type AccessOption = "none" | "zenx-dietitian" | "zenx-pos" | "both";

interface ConvertFlowProps {
  enquiry: Enquiry | null;
  onClose: (customerCreated: boolean) => void;
}

function slugsFor(option: AccessOption): ApplicationSlug[] {
  if (option === "zenx-dietitian") return ["zenx-dietitian"];
  if (option === "zenx-pos") return ["zenx-pos"];
  if (option === "both") return ["zenx-dietitian", "zenx-pos"];
  return [];
}

export function ConvertFlow({ enquiry, onClose }: ConvertFlowProps) {
  const { profile } = useAuth();
  const [step, setStep] = useState<"congrats" | "form" | "success">("congrats");
  const [access, setAccess] = useState<AccessOption>("none");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [companySlug, setCompanySlug] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [createdAppCount, setCreatedAppCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (enquiry) {
      setStep("congrats");
      setAccess("none");
      const [first, ...rest] = enquiry.contact_name.split(" ");
      setFirstName(first ?? "");
      setLastName(rest.join(" "));
      setPhone(toE164OrEmpty(enquiry.phone));
      setEmail(enquiry.email);
      setJobTitle("");
      setCompanySlug("");
      setPassword(generateTempPassword());
      setError(null);
      generateUniqueCompanySlug(enquiry.company_name).then(setCompanySlug);
    }
  }, [enquiry]);

  if (!enquiry) return null;

  const selectedSlugs = slugsFor(access);

  const handleCreateAccount = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError(null);
    try {
      const result = await provisioningService.provisionCustomer({
        enquiryId: enquiry.id,
        companyName: enquiry.company_name,
        companySlug,
        // Carried straight from the enquiry (the public contact form already asks for it) rather
        // than re-typed here — the admin can still edit it later on the customer's own record.
        website: enquiry.website,
        firstName,
        lastName,
        phone,
        email,
        jobTitle,
        applicationSlugs: selectedSlugs,
        adminId: profile.id,
        password,
        addressLine1: enquiry.address_line1,
        addressLine2: enquiry.address_line2,
        city: enquiry.city,
        state: enquiry.state,
        zip: enquiry.zip,
        country: enquiry.country,
      });
      setCreatedAppCount(result.grants.length);
      setStep("success");
    } catch (err) {
      // Same reason as AddCustomerModal: an unhandled rejection here left the admin staring at a
      // form that had silently done nothing, with the real cause (usually a 409) only in the console.
      setError(err instanceof Error ? err.message : "Could not create the account.");
    } finally {
      setSaving(false);
    }
  };

  if (step === "congrats") {
    return (
      <Modal open onClose={() => onClose(false)} title="" width="sm">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-lime/10 text-lime">
            <PartyPopper size={26} />
          </div>
          <h3 className="mt-4 font-display text-xl text-offwhite">Congratulations — Lead Converted</h3>
          <p className="mt-2 text-sm text-muted">
            <b className="text-offwhite">{enquiry.company_name}</b> is now a customer.
          </p>
          <p className="mt-4 text-sm font-semibold text-offwhite">Create Application Account?</p>
          <div className="mt-4 flex w-full gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => onClose(false)}>
              No
            </Button>
            <Button className="flex-1" onClick={() => setStep("form")}>
              Yes
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  if (step === "form") {
    return (
      <Modal
        open
        onClose={() => onClose(false)}
        title="Convert this enquiry?"
        subtitle={`${enquiry.company_name} · ${enquiry.contact_name}`}
      >
        <form className="flex flex-col gap-5" onSubmit={handleCreateAccount}>
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
              Create Application Access
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { value: "none", label: "None" },
                  { value: "zenx-dietitian", label: "ZenX Dietitian" },
                  { value: "zenx-pos", label: "ZenX Small Business POS" },
                  { value: "both", label: "Both" },
                ] as { value: AccessOption; label: string }[]
              ).map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setAccess(opt.value)}
                  className={`rounded-md border px-3 py-2.5 text-left text-xs transition ${
                    access === opt.value
                      ? "border-lime bg-lime/10 text-lime"
                      : "border-border text-muted hover:border-borderStrong"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FieldWrap label="First name" htmlFor="c-first">
              <Input id="c-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
            </FieldWrap>
            <FieldWrap label="Last name" htmlFor="c-last">
              <Input id="c-last" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
            </FieldWrap>
          </div>

          <FieldWrap label="Company Name" htmlFor="c-company">
            <Input id="c-company" value={enquiry.company_name} disabled />
          </FieldWrap>

          <FieldWrap label="Company URL" htmlFor="c-slug">
            <div className="flex gap-2">
              <Input id="c-slug" value={companySlug || "generating…"} readOnly className="font-mono" />
              <Button
                type="button"
                variant="secondary"
                disabled={!companySlug}
                onClick={() => navigator.clipboard.writeText(companySlug)}
              >
                <Copy size={14} /> Copy
              </Button>
            </div>
          </FieldWrap>

          <div className="grid grid-cols-2 gap-4">
            <FieldWrap label="Phone" htmlFor="c-phone">
              <PhoneField id="c-phone" value={phone} onChange={setPhone} required />
            </FieldWrap>
            <FieldWrap label="Email" htmlFor="c-email">
              <Input id="c-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </FieldWrap>
          </div>

          <FieldWrap label="Job title" htmlFor="c-job-title" hint="Optional">
            <Input id="c-job-title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
          </FieldWrap>

          <FieldWrap
            label="Temporary password"
            htmlFor="c-password"
            hint="Shown once — the customer must change it on first login."
          >
            <div className="flex gap-2">
              <Input
                id="c-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="font-mono"
                required
                minLength={8}
              />
              <Button type="button" variant="secondary" onClick={() => setPassword(generateTempPassword())}>
                <RefreshCw size={14} /> Generate
              </Button>
            </div>
          </FieldWrap>

          {error && (
            <div className="flex items-center gap-2 rounded-md border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-xs text-danger">
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          <div className="mt-1 flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => onClose(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating…" : "Create Company & Set Password"}
            </Button>
          </div>
        </form>
      </Modal>
    );
  }

  return (
    <Modal open onClose={() => onClose(true)} title="" width="sm">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-lime/10 text-lime">
          <CheckCircle2 size={26} />
        </div>
        <h3 className="mt-4 font-display text-lg text-offwhite">{enquiry.company_name}</h3>
        <div className="mt-4 flex flex-col gap-2 self-stretch text-left text-sm">
          <p className="flex items-center gap-2 text-offwhite">
            <CheckCircle2 size={15} className="text-lime" /> Company created
          </p>
          <p className="flex items-center gap-2 text-offwhite">
            <CheckCircle2 size={15} className="text-lime" />
            Application access created{createdAppCount === 0 ? " (none selected)" : ""}
          </p>
          <p className="flex items-center gap-2 text-offwhite">
            <CheckCircle2 size={15} className="text-lime" /> Temporary password set — they'll be
            prompted to change it on first login
          </p>
        </div>

        <div className="mt-4 flex w-full flex-col gap-1.5 text-left">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Login credentials</span>
          <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-ink px-3.5 py-2.5">
            <code className="text-xs text-offwhite">{email}</code>
          </div>
          <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-ink px-3.5 py-2.5">
            <code className="text-xs text-offwhite">{password}</code>
            <Button type="button" size="sm" variant="secondary" onClick={() => navigator.clipboard.writeText(password)}>
              <Copy size={13} /> Copy
            </Button>
          </div>
        </div>

        <Button className="mt-6 w-full" onClick={() => onClose(true)}>
          Done
        </Button>
      </div>
    </Modal>
  );
}
