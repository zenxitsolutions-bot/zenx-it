import { useEffect, useState, type FormEvent } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { FieldWrap, Input } from "../ui/Field";
import { PhoneField } from "../ui/PhoneField";
import { CredentialRevealModal } from "./CredentialRevealModal";
import type { ApplicationSlug } from "../../types/domain";
import { provisioningService, generateUniqueCompanySlug } from "../../services/provisioning";
import { generateTempPassword } from "../../utils/password";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

type AccessOption = "none" | "zenx-dietitian" | "zenx-pos" | "both";

function slugsFor(option: AccessOption): ApplicationSlug[] {
  if (option === "zenx-dietitian") return ["zenx-dietitian"];
  if (option === "zenx-pos") return ["zenx-pos"];
  if (option === "both") return ["zenx-dietitian", "zenx-pos"];
  return [];
}

interface AddCustomerModalProps {
  open: boolean;
  onClose: (created: boolean) => void;
}

/**
 * Creates a company + person + application access directly, with no originating
 * enquiry — for a customer ZenX signs up outside the lead pipeline (walk-in,
 * phone deal, migration from another system, etc). Same provisioning path as
 * converting a lead (ConvertFlow), just without an Enquiry to seed the fields.
 */
export function AddCustomerModal({ open, onClose }: AddCustomerModalProps) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [companyName, setCompanyName] = useState("");
  const [companySlug, setCompanySlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [website, setWebsite] = useState("");
  const [access, setAccess] = useState<AccessOption>("none");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [password, setPassword] = useState(() => generateTempPassword());
  const [saving, setSaving] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCompanyName("");
      setCompanySlug("");
      setSlugTouched(false);
      setWebsite("");
      setAccess("none");
      setFirstName("");
      setLastName("");
      setPhone("");
      setEmail("");
      setJobTitle("");
      setPassword(generateTempPassword());
      setReveal(false);
      setError(null);
    }
  }, [open]);

  // Auto-fill the slug from the company name until the admin edits it directly.
  useEffect(() => {
    if (slugTouched || !companyName.trim()) return;
    const handle = setTimeout(() => {
      generateUniqueCompanySlug(companyName).then(setCompanySlug);
    }, 400);
    return () => clearTimeout(handle);
  }, [companyName, slugTouched]);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError(null);
    try {
      await provisioningService.provisionCustomer({
        enquiryId: null,
        companyName,
        companySlug,
        website,
        firstName,
        lastName,
        phone,
        email,
        jobTitle,
        applicationSlugs: slugsFor(access),
        adminId: profile.id,
        password,
      });
      setReveal(true);
    } catch (err) {
      // Without this the rejection escaped to the console and the form just went idle — the admin
      // saw the button stop spinning with no explanation of why nothing was created.
      setError(err instanceof Error ? err.message : "Could not create the customer.");
    } finally {
      setSaving(false);
    }
  };

  if (reveal) {
    return (
      <CredentialRevealModal
        open
        onClose={() => {
          toast("Customer created");
          onClose(true);
        }}
        email={email}
        password={password}
        title="Customer created"
        subtitle={companyName}
      />
    );
  }

  return (
    <Modal open onClose={() => onClose(false)} title="Add a customer" subtitle="Create a company and account directly, without an enquiry.">
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <FieldWrap label="Company name" htmlFor="ac-company">
          <Input id="ac-company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
        </FieldWrap>

        <FieldWrap label="Company URL" htmlFor="ac-slug" hint="Auto-generated from the company name — edit if needed.">
          <Input
            id="ac-slug"
            value={companySlug}
            onChange={(e) => {
              setSlugTouched(true);
              setCompanySlug(e.target.value);
            }}
            className="font-mono"
            required
          />
        </FieldWrap>

        <FieldWrap
          label="Company website"
          htmlFor="ac-website"
          hint="Optional — shown in the customer's own application portal. https:// is added if you leave it off."
        >
          <Input id="ac-website" type="text" inputMode="url" placeholder="acme.com" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </FieldWrap>

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
          <FieldWrap label="First name" htmlFor="ac-first">
            <Input id="ac-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </FieldWrap>
          <FieldWrap label="Last name" htmlFor="ac-last">
            <Input id="ac-last" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </FieldWrap>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FieldWrap label="Phone" htmlFor="ac-phone">
            <PhoneField id="ac-phone" value={phone} onChange={setPhone} />
          </FieldWrap>
          <FieldWrap label="Email" htmlFor="ac-email">
            <Input id="ac-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </FieldWrap>
        </div>

        <FieldWrap label="Job title" htmlFor="ac-job-title" hint="Optional">
          <Input id="ac-job-title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
        </FieldWrap>

        <FieldWrap
          label="Temporary password"
          htmlFor="ac-password"
          hint="Shown once after creation — the customer must change it on first login."
        >
          <div className="flex gap-2">
            <Input
              id="ac-password"
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
            {saving ? "Creating…" : "Create Customer"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
