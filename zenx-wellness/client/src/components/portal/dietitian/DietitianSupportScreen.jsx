import { UserRound } from 'lucide-react';
import { EmptyState } from '@/components/portal/shared/EmptyState';
import { SupportMessageThread } from '@/components/portal/shared/SupportMessageThread';
import { useAuth } from '@/hooks/useAuth';
import { useUsers } from '@/hooks/useUsers';

export function DietitianSupportScreen() {
  const { user } = useAuth();
  const { data: admins } = useUsers({ role: 'admin' });
  const activeAdmins = (admins ?? []).filter((admin) => !admin.accountStatus || admin.accountStatus === 'active');
  const peer = activeAdmins.find((admin) => admin._id !== user._id) ?? activeAdmins[0];
  const title = activeAdmins.length > 1 ? 'Organisation admins' : (peer?.name ?? 'Organisation admin');

  return (
    <div className="mx-auto max-w-3xl px-5 py-7 min-[1050px]:px-9 min-[1050px]:py-9">
      <div className="mb-7">
        <p className="text-xs font-semibold tracking-wide text-brand-strong uppercase">Need a hand?</p>
        <h1 className="mt-1.5 text-3xl font-semibold text-forest">Message your organisation</h1>
        <p className="mt-1.5 text-muted-foreground">Chat with your admin team. Client conversations stay on Messages.</p>
      </div>

      {activeAdmins.length === 0 ? (
        <EmptyState
          icon={UserRound}
          title="No admin yet"
          description="Once an admin is on this organisation, you can message them here."
        />
      ) : (
        <div className="rounded-card border border-line bg-white shadow-soft">
          <SupportMessageThread title={title} peerId={peer?._id} />
        </div>
      )}
    </div>
  );
}
