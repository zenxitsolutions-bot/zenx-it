import { FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { useReports } from '@/hooks/useReports';
import { ReportUploadCard } from './ReportUploadCard';
import { ReportCard } from './ReportCard';

export function ReportsScreen() {
  const { data, isLoading, isError, refetch } = useReports();

  return (
    <div className="mx-auto max-w-3xl p-9">
      <div className="mb-6">
        <p className="text-muted-foreground">Share what you're tracking</p>
        <h1 className="mt-1 text-3xl text-forest">Reports</h1>
        <p className="mt-1 text-muted-foreground">Upload lab results or photos and hear back from your dietitian here.</p>
      </div>

      <div className="grid gap-6">
        <ReportUploadCard />

        {isLoading ? (
          <div className="grid gap-3">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : isError ? (
          <EmptyState
            title="Couldn't load your reports"
            description="Something went wrong on our end."
            action={
              <button type="button" onClick={() => refetch()} className="text-sm font-semibold text-coral hover:underline">
                Try again
              </button>
            }
          />
        ) : data.length === 0 ? (
          <EmptyState icon={FileText} title="No reports yet" description="Anything you upload will show up here." />
        ) : (
          <div className="grid gap-4">
            {data.map((report) => (
              <ReportCard key={report._id} report={report} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
