import { Suspense } from 'react';
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import { PageLoadingFallback } from '@/components/PageLoadingFallback';
import { AuthProvider } from '@/context/AuthContext';
import { EnquiryProvider } from '@/context/EnquiryContext';
import { EnquiryModal } from '@/components/enquiry/EnquiryModal';
import { router } from '@/routes/router';

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      // A screen with its own `isError` state already renders an inline error+retry — this is
      // only for a *background* refetch failing behind data the user is already looking at,
      // which would otherwise fail completely silently.
      if (query.state.data !== undefined) {
        toast.error("Couldn't refresh — showing the last loaded data.");
      }
    },
  }),
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <EnquiryProvider>
          <Suspense fallback={<PageLoadingFallback />}>
            <RouterProvider router={router} />
          </Suspense>
          <EnquiryModal />
          <Toaster />
        </EnquiryProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
