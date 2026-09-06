import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useUploadReport } from '@/hooks/useReports';

export function ReportUploadCard() {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [note, setNote] = useState('');
  const uploadReport = useUploadReport();

  function handleSubmit(event) {
    event.preventDefault();
    if (!file) {
      toast.error('Choose a file first.');
      return;
    }
    uploadReport.mutate(
      { file, note: note || undefined },
      {
        onSuccess: () => {
          toast.success('Report uploaded — your dietitian will take a look soon.');
          setFile(null);
          setNote('');
          if (inputRef.current) inputRef.current.value = '';
        },
        onError: () => toast.error("We couldn't upload that — please try again."),
      }
    );
  }

  return (
    <section className="rounded-card border border-line bg-white p-6 shadow-lift">
      <h2 className="text-xl font-semibold text-forest">Upload a report</h2>
      <form onSubmit={handleSubmit} className="mt-4 grid gap-3">
        <div className="rounded-card border border-dashed border-sage bg-cream/60 p-6 text-center transition-colors hover:border-coral/40">
          <span className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-white text-brand-strong shadow-soft">
            <UploadCloud className="size-5" aria-hidden="true" />
          </span>
          <strong className="block text-sm text-forest">{file ? file.name : 'Drop a report here'}</strong>
          <p className="mt-1 text-xs text-muted-foreground">PDF, photo, or lab result · up to 10 MB</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            className="mt-3 rounded-pill"
          >
            Choose a file
          </Button>
          <input ref={inputRef} type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>

        <Textarea
          placeholder="Add a note for your dietitian (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
        />

        <Button
          type="submit"
          disabled={uploadReport.isPending}
          size="lg"
          className="rounded-pill"
        >
          {uploadReport.isPending ? 'Uploading…' : 'Upload report'}
        </Button>
      </form>
    </section>
  );
}
