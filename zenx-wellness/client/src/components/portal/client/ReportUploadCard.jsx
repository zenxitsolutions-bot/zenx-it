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
    <section className="rounded-card bg-white p-6 shadow-soft">
      <h2 className="text-xl">Upload a report</h2>
      <form onSubmit={handleSubmit} className="mt-4 grid gap-3">
        <div className="rounded-xl border border-dashed border-line p-6 text-center">
          <UploadCloud className="mx-auto mb-2 size-6 text-sage-deep" aria-hidden="true" />
          <strong className="block text-sm text-forest">{file ? file.name : 'Drop a report here'}</strong>
          <p className="mt-1 text-xs text-muted-foreground">PDF, photo, or lab result · up to 10 MB</p>
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
            className="mt-3 rounded-full border-line text-forest"
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
          className="rounded-full bg-coral text-white hover:bg-coral/90"
        >
          {uploadReport.isPending ? 'Uploading…' : 'Upload report'}
        </Button>
      </form>
    </section>
  );
}
