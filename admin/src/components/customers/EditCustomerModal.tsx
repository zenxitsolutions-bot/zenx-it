import { useEffect, useState, type FormEvent } from "react";
import { AlertCircle } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { FieldWrap, Input } from "../ui/Field";
import { PhoneField } from "../ui/PhoneField";
import type { Company, CompanyStatus, SubscriptionPlan, ZenxUser } from "../../types/domain";
import { SUBSCRIPTION_PLANS, SUBSCRIPTION_PLAN_LABELS } from "../../types/domain";
import { companiesService } from "../../services/companies";
import { useToast } from "../../context/ToastContext";

interface EditCustomerModalProps {
  open: boolean;
  company: Company | null;
  contact: ZenxUser | null;
  onClose: (saved: boolean) => void;
}

export function EditCustomerModal({ open, company, contact, onClose }: EditCustomerModalProps) {
  const { toast } = useToast();
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("");
  const [accountStatus, setAccountStatus] = useState<CompanyStatus>("ACTIVE");
  const [subscriptionPlan, setSubscriptionPlan] = useState<SubscriptionPlan>("starter");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !company) return;
    setCompanyName(company.company_name);
    setWebsite(company.website ?? "");
    setCompanyEmail(company.company_email ?? "");
    setCompanyPhone(company.company_phone ?? "");
    setFirstName(contact?.first_name ?? "");
    setLastName(contact?.last_name ?? "");
    setPhone(contact?.phone ?? "");
    setEmail(contact?.email ?? "");
    setJobTitle(contact?.job_title ?? "");
    setAddressLine1(company.address_line1 ?? "");
    setCity(company.city ?? "");
    setState(company.state ?? "");
    setZip(company.zip ?? "");
    setCountry(company.country ?? "");
    setAccountStatus(company.status);
    setSubscriptionPlan(company.subscription_plan ?? "starter");
    setError(null);
  }, [open, company, contact]);

  if (!open || !company) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await companiesService.update(company.id, {
        companyName,
        website: website || null,
        companyEmail: companyEmail || null,
        companyPhone: companyPhone || null,
        addressLine1: addressLine1 || null,
        city: city || null,
        state: state || null,
        zip: zip || null,
        country: country || null,
        status: accountStatus,
        subscriptionPlan,
        ...(contact
          ? {
              contact: {
                userId: contact.id,
                firstName,
                lastName,
                email,
                phone: phone || null,
                jobTitle: jobTitle || null,
              },
            }
          : {}),
      });
      toast("Customer updated");
      onClose(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the customer.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={() => onClose(false)} title="Edit customer" subtitle={company.company_name} width="lg">
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <FieldWrap label="Company name" htmlFor="ec-company">
          <Input id="ec-company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
        </FieldWrap>

        <div className="grid grid-cols-2 gap-4">
          <FieldWrap label="Company email" htmlFor="ec-company-email">
            <Input id="ec-company-email" type="email" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} />
          </FieldWrap>
          <FieldWrap label="Company phone" htmlFor="ec-company-phone">
            <PhoneField id="ec-company-phone" value={companyPhone} onChange={setCompanyPhone} />
          </FieldWrap>
        </div>

        <FieldWrap label="Company website" htmlFor="ec-website">
          <Input id="ec-website" type="text" inputMode="url" placeholder="acme.com" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </FieldWrap>

        {contact && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <FieldWrap label="First name" htmlFor="ec-first">
                <Input id="ec-first" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </FieldWrap>
              <FieldWrap label="Last name" htmlFor="ec-last">
                <Input id="ec-last" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </FieldWrap>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FieldWrap label="Contact phone" htmlFor="ec-phone">
                <PhoneField id="ec-phone" value={phone} onChange={setPhone} />
              </FieldWrap>
              <FieldWrap label="Contact email" htmlFor="ec-email">
                <Input id="ec-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </FieldWrap>
            </div>
            <FieldWrap label="Job title" htmlFor="ec-job">
              <Input id="ec-job" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
            </FieldWrap>
          </>
        )}

        <FieldWrap label="Business address" htmlFor="ec-address">
          <Input id="ec-address" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} placeholder="Street address" />
        </FieldWrap>
        <div className="grid grid-cols-2 gap-4">
          <FieldWrap label="City" htmlFor="ec-city">
            <Input id="ec-city" value={city} onChange={(e) => setCity(e.target.value)} />
          </FieldWrap>
          <FieldWrap label="State" htmlFor="ec-state">
            <Input id="ec-state" value={state} onChange={(e) => setState(e.target.value)} />
          </FieldWrap>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FieldWrap label="ZIP / Postal code" htmlFor="ec-zip">
            <Input id="ec-zip" value={zip} onChange={(e) => setZip(e.target.value)} />
          </FieldWrap>
          <FieldWrap label="Country" htmlFor="ec-country">
            <Input id="ec-country" value={country} onChange={(e) => setCountry(e.target.value)} />
          </FieldWrap>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FieldWrap label="Account status" htmlFor="ec-status">
            <select
              id="ec-status"
              value={accountStatus}
              onChange={(e) => setAccountStatus(e.target.value as CompanyStatus)}
              className="w-full rounded-md border border-border bg-ink px-3 py-2 text-sm text-offwhite"
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </FieldWrap>
          <FieldWrap label="Subscription plan" htmlFor="ec-plan">
            <select
              id="ec-plan"
              value={subscriptionPlan}
              onChange={(e) => setSubscriptionPlan(e.target.value as SubscriptionPlan)}
              className="w-full rounded-md border border-border bg-ink px-3 py-2 text-sm text-offwhite"
            >
              {SUBSCRIPTION_PLANS.map((plan) => (
                <option key={plan} value={plan}>
                  {SUBSCRIPTION_PLAN_LABELS[plan]}
                </option>
              ))}
            </select>
          </FieldWrap>
        </div>

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
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
