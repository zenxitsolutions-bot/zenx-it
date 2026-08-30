import { useState } from 'react';
import { FileText, MessageCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ReportFileViewer } from '@/components/portal/shared/ReportFileViewer';
import { formatDate } from '@/lib/format';

export function ReportCard({ report }) {
  const [viewerOpen, setViewerOpen] = useState(false);

  return (
    <article className="rounded-card bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-cream text-forest">
            <FileText className="size-5" aria-hidden="true" />
          </div>
          <div>
            <button type="button" onClick={() => setViewerOpen(true)} className="block text-sm font-semibold text-forest hover:underline">
              {report.fileName}
            </button>
            <span className="text-xs text-muted-foreground">Uploaded {formatDate(report.createdAt)}</span>
            {report.note && <p className="mt-1 text-sm text-forest">{report.note}</p>}
          </div>
        </div>
        <Badge variant={report.status === 'reviewed' ? 'secondary' : 'outline'} className="capitalize">
          {report.status}
        </Badge>
      </div>

      <div className="mt-4 border-t border-line pt-4">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          <MessageCircle className="size-3.5" aria-hidden="true" /> Dietitian feedback
        </p>
        {report.feedback.length === 0 ? (
          <p className="text-sm text-muted-foreground">Your dietitian hasn't reviewed this yet.</p>
        ) : (
          <div className="grid gap-3">
            {report.feedback.map((entry) => (
              <div key={entry._id} className="rounded-xl bg-sage/30 p-3">
                <div className="flex items-center justify-between">
                  <strong className="text-sm text-forest">{entry.authorName}</strong>
                  <span className="text-xs text-muted-foreground">{formatDate(entry.createdAt)}</span>
                </div>
                <p className="mt-1 text-sm text-forest">{entry.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <ReportFileViewer report={report} open={viewerOpen} onOpenChange={setViewerOpen} />
    </article>
  );
}
