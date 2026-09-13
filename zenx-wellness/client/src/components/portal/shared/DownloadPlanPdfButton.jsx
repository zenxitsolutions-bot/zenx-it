import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useDownloadPlanPdf } from '@/hooks/usePlans';
import { cn } from '@/lib/utils';

export function DownloadPlanPdfButton({ planId, className, variant = 'outline', size = 'default', label = 'Download PDF' }) {
  const downloadPdf = useDownloadPlanPdf();

  function onClick() {
    if (!planId || downloadPdf.isPending) return;
    downloadPdf.mutate(planId, {
      onError: (error) => toast.error(error.message || "We couldn't download the plan PDF."),
    });
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={!planId || downloadPdf.isPending}
      onClick={onClick}
      className={cn('rounded-full', className)}
    >
      <Download className="size-4" aria-hidden="true" />
      {downloadPdf.isPending ? 'Preparing PDF…' : label}
    </Button>
  );
}
