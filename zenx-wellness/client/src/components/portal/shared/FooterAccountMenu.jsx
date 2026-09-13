import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

export function FooterAccountMenu({ children, onSettings }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  async function handleLogout() {
    const loginPath = user.companySlug ? `/${user.companySlug}/login` : '/login';
    await logout();
    navigate(loginPath, { replace: true, state: null });
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-52">
        <DropdownMenuItem onSelect={onSettings}>My account</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={handleLogout}>Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
