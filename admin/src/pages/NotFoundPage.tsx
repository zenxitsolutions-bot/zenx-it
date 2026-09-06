import { Link } from "react-router-dom";
import { Compass } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink px-4 text-center">
      <Compass className="text-lime" size={32} />
      <h1 className="font-display text-2xl text-offwhite">Page not found</h1>
      <p className="text-sm text-muted">The page you're looking for doesn't exist.</p>
      <Link to="/admin/dashboard" className="text-sm text-lime hover:underline">
        Back to dashboard
      </Link>
    </div>
  );
}
