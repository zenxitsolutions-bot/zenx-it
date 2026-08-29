import { useState, type FormEvent } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { FieldWrap, Input, Select, Textarea } from "../ui/Field";
import { PhoneField } from "../ui/PhoneField";
import { LEAD_SOURCES, SERVICE_OPTIONS, type LeadSource, type ServiceOption } from "../../types/domain";
import { enquiriesService } from "../../services/enquiries";
import { useToast } from "../../context/ToastContext";

interface AddEnquiryModalProps {
  open: boolean;
  onClose: (created: boolean) => void;
}

const EMPTY = {
  companyName: "",
  contactName: "",
  phone: "",
  email: "",
  website: "",
  service: SERVICE_OPTIONS[0] as ServiceOption,
  source: LEAD_SOURCES[0] as LeadSource,
  notes: "",
};

/** Lets a ZenX admin log a lead that came in outside the public contact form (phone call, referral, trade show, etc). */
export function AddEnquiryModal({ open, onClose }: AddEnquiryModalProps) {
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const set = <K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await enquiriesService.create({
        company_name: form.companyName,
        contact_name: form.contactName,
        phone: form.phone,
        email: form.email,
        website: form.website || null,
        service: form.service,
        source: form.source,
        notes: form.notes || null,
      });
      toast("Enquiry created");
      setForm(EMPTY);
      onClose(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={() => onClose(false)} title="Add an enquiry" subtitle="Log a lead that came in outside the website form.">
      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4">
          <FieldWrap label="Company name" htmlFor="ae-company">
            <Input id="ae-company" value={form.companyName} onChange={(e) => set("companyName", e.target.value)} required />
          </FieldWrap>
          <FieldWrap label="Contact name" htmlFor="ae-contact">
            <Input id="ae-contact" value={form.contactName} onChange={(e) => set("contactName", e.target.value)} required />
          </FieldWrap>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FieldWrap label="Phone" htmlFor="ae-phone">
            <PhoneField id="ae-phone" value={form.phone} onChange={(value) => set("phone", value)} required />
          </FieldWrap>
          <FieldWrap label="Email" htmlFor="ae-email">
            <Input id="ae-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
          </FieldWrap>
        </div>

        <FieldWrap label="Website" htmlFor="ae-website" hint="Optional">
          <Input id="ae-website" value={form.website} onChange={(e) => set("website", e.target.value)} />
        </FieldWrap>

        <div className="grid grid-cols-2 gap-4">
          <FieldWrap label="Service interested in" htmlFor="ae-service">
            <Select id="ae-service" value={form.service} onChange={(e) => set("service", e.target.value as ServiceOption)}>
              {SERVICE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </FieldWrap>
          <FieldWrap label="Source" htmlFor="ae-source">
            <Select id="ae-source" value={form.source} onChange={(e) => set("source", e.target.value as LeadSource)}>
              {LEAD_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </FieldWrap>
        </div>

        <FieldWrap label="Notes" htmlFor="ae-notes" hint="Optional">
          <Textarea id="ae-notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </FieldWrap>

        <div className="mt-1 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => onClose(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Creating…" : "Create Enquiry"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
