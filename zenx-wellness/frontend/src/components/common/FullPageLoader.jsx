export function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div
        className="h-9 w-9 animate-spin rounded-full border-[3px] border-brand-100 border-t-brand-600"
        role="status"
        aria-label="Loading"
      />
    </div>
  )
}

export default FullPageLoader
