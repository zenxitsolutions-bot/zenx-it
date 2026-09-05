import { useRef } from 'react';
import { toast } from 'sonner';
import { UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUploadReport } from '@/hooks/useReports';

export function QuickUploadCard() {
  const inputRef = useRef(null);
  const uploadReport = useUploadReport();

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    uploadReport.mutate(
      { file },
      {
        onSuccess: () => toast.success('Report uploaded — your dietitian will take a look soon.'),
        onError: () => toast.error("We couldn't upload that — please try again."),
      }
    );
  }

  return (
    <section className="rounded-card bg-white p-6 shadow-soft">
      <div className="flex items-center justify-between">
        <h2 className="text-xl">Quick report upload</h2>
        <UploadCloud className="size-5 text-sage-deep" aria-hidden="true" />
      </div>
      <div className="mt-4 rounded-xl border border-dashed border-line p-6 text-center">
        <strong className="block text-sm text-forest">Drop a report here</strong>
        <p className="mt-1 text-xs text-muted-foreground">PDF, photo, or lab result · up to 10 MB</p>
        <Button
          type="button"
          variant="outline"
          disabled={uploadReport.isPending}
          onClick={() => inputRef.current?.click()}
          className="mt-3 rounded-full border-line text-forest"
        >
          {uploadReport.isPending ? 'Uploading…' : 'Choose a file'}
        </Button>
        <input ref={inputRef} type="file" className="hidden" onChange={handleFileChange} />
      </div>
    </section>
  );
}
