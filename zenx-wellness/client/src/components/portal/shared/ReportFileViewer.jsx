import { useEffect, useState } from 'react';
import { Download, FileWarning } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useReportFile } from '@/hooks/useReports';
import { getFilePreviewKind } from '@/lib/fileType';
import { EmptyState } from './EmptyState';

// Shared by the client's own Reports screen and the dietitian/admin Report Review screen — spec
// §2026-round2-fixes item 6. Fetches the file as an authenticated blob (never a bare <img src>/
// <iframe src> pointing at the API directly — see report.controller.js#getReportFile for why an
// unauthenticated URL isn't an option anymore) only while open, and only once per open (React
// Query's `enabled` gate below).
export function ReportFileViewer({ report, open, onOpenChange }) {
  const { data, isLoading, isError, error, refetch } = useReportFile(report?._id, open);
  const [objectUrl, setObjectUrl] = useState(null);

  // Creates a fresh blob: URL exactly when a new blob arrives, and revokes the previous one only
  // once it's no longer referenced by anything on screen — never revokes while still in use, and
  // never leaks it past the component's lifetime either.
  useEffect(() => {
    if (!data?.blob) {
      setObjectUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(data.blob);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [data?.blob]);

  const kind = report ? getFilePreviewKind(report.fileName) : 'unsupported';

  function downloadOriginal() {
    if (!objectUrl || !report) return;
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = report.fileName;
    a.click();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="truncate">{report?.fileName}</DialogTitle>
          <DialogDescription>Uploaded document</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1">
          {isLoading ? (
            <Skeleton className="h-80 w-full" />
          ) : isError ? (
            <EmptyState
              icon={FileWarning}
              title="Couldn't load this document"
              description={error?.reason}
              action={
                <button type="button" onClick={() => refetch()} className="text-sm font-semibold text-coral hover:underline">
                  Try again
                </button>
              }
            />
          ) : kind === 'pdf' ? (
            <iframe src={objectUrl} title={report.fileName} className="h-[70vh] w-full rounded-lg border border-line" />
          ) : kind === 'image' ? (
            <img
              src={objectUrl}
              alt={report.fileName}
              className="max-h-[70vh] w-full rounded-lg border border-line object-contain"
            />
          ) : (
            <EmptyState
              icon={FileWarning}
              title="Preview isn't available for this file type"
              description="This file type can't be shown in the browser — download it to view it."
            />
          )}
        </div>

        <div className="flex justify-end border-t border-line pt-4">
          <Button type="button" variant="outline" onClick={downloadOriginal} disabled={!objectUrl} className="rounded-full">
            <Download className="size-4" aria-hidden="true" />
            Download original
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
