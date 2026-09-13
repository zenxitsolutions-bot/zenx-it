import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { Button } from "../ui/Button";
import { companiesService, LogoValidationError } from "../../services/companies";
import { resolveAssetUrl } from "../../lib/assetUrl";
import { useToast } from "../../context/ToastContext";

interface LogoUploadProps {
  companyId: string;
  logoUrl: string | null;
  onChange: (logoUrl: string | null) => void;
}

export function LogoUpload({ companyId, logoUrl, onChange }: LogoUploadProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const url = await companiesService.uploadLogo(companyId, file);
      onChange(url);
      toast("Logo updated");
    } catch (err) {
      setError(err instanceof LogoValidationError ? err.message : "Could not upload that file.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    await companiesService.removeLogo(companyId);
    onChange(null);
    toast("Logo removed");
  };

  return (
    <div className="flex items-center gap-5">
      <div className="flex h-48 w-48 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-panel p-2">
        {logoUrl ? (
          <img src={resolveAssetUrl(logoUrl) ?? undefined} alt="Company logo" className="h-full w-full object-contain" />
        ) : (
          <ImagePlus size={36} className="text-dim" />
        )}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <Button size="sm" variant="secondary" disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? "Uploading…" : logoUrl ? "Replace Logo" : "Upload Logo"}
          </Button>
          {logoUrl && (
            <Button size="sm" variant="ghost" onClick={handleRemove}>
              <Trash2 size={13} /> Remove
            </Button>
          )}
        </div>
        {error ? (
          <p className="text-xs text-dangerInk">{error}</p>
        ) : (
          <p className="text-xs text-dim">PNG, JPEG, or WEBP — up to 2MB.</p>
        )}
      </div>
    </div>
  );
}
