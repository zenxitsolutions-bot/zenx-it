import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSupportUnreadCount } from '@/hooks/useSupportMessages';

export function AdminChatButton() {
  const { user } = useAuth();
  const { data } = useSupportUnreadCount(true);
  const unread = data?.count ?? 0;
  const label = user.role === 'admin' ? 'Messages' : 'Chat with admin';

  return (
    <Link
      to={`/${user.companySlug}/app/${user.role === 'admin' ? 'messages' : 'support'}`}
      aria-label={`${label}${unread ? `, ${unread} unread messages` : ''}`}
      title={label}
      className="fixed right-5 bottom-24 z-30 grid size-12 place-items-center rounded-full border border-white/20 bg-brand text-white shadow-lift transition-colors hover:bg-brand-strong focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand min-[1050px]:bottom-6 print:hidden"
    >
      <MessageCircle className="size-5" strokeWidth={1.8} aria-hidden="true" />
      {unread > 0 && (
        <span aria-hidden="true" className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full border border-white bg-forest px-1 text-[10px] leading-5 font-semibold text-white">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  );
}

