import { useAuth } from '@/hooks/useAuth';
import { ClientOverviewScreen } from '@/components/portal/client/ClientOverviewScreen';
import { AdminOverviewScreen } from '@/components/portal/admin/AdminOverviewScreen';
import { DietitianOverviewScreen } from '@/components/portal/dietitian/DietitianOverviewScreen';
import { Link } from 'react-router-dom';
import { getDefaultPermissions, hasPermission } from '@/lib/permissions';
import { portalItemsFor } from '@/lib/portalNav';

export function OverviewPage() {
  const { user } = useAuth();

  if (user.role === 'client') return <ClientOverviewScreen />;
  const defaultPermissions = getDefaultPermissions(user.role);
  // Broad legacy dashboards combine multiple modules. Restricted staff get useful shortcuts
  // without issuing forbidden module queries or displaying redacted counts as genuine zeros.
  if (Object.entries(defaultPermissions).some(([key, enabled]) => enabled && !hasPermission(user, key))) {
    return <div className="mx-auto max-w-5xl p-4 sm:p-9">
      <h1 className="text-3xl text-forest">Welcome back, {user.name}</h1>
      <p className="mt-2 text-muted-foreground">Your workspace shows the areas your main admin has enabled for you.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {portalItemsFor(user).filter((item) => item.to !== '/app/overview').map(({ to, label, icon: Icon }) => <Link key={to} to={`/${user.companySlug}${to}`} className="flex items-center gap-3 rounded-card border border-line bg-white p-5 text-forest shadow-soft hover:bg-sage/30"><Icon className="size-5" />{label}</Link>)}
      </div>
    </div>;
  }
  if (user.role === 'admin') return <AdminOverviewScreen />;
  return <DietitianOverviewScreen />;
}
