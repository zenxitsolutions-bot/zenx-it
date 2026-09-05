import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Copy, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useResetUserPassword } from '@/hooks/useUsers';
import { generateTempPassword } from '@/lib/generateTempPassword';

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard.');
  } catch {
    toast.error("Couldn't copy — select the password and copy it yourself.");
  }
}

// Admin-only: set a temporary password and flip mustChangePassword so the next login (and any
// still-open session) is trapped on ChangePasswordPage until they pick a new one.
export function ResetUserPasswordDialog({ open, onOpenChange, user }) {
  const resetPassword = useResetUserPassword();
  const [password, setPassword] = useState('');
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (open) {
      setPassword(generateTempPassword());
      setRevealed(false);
    }
  }, [open]);

  function handleOpenChange(next) {
    if (!next) {
      setPassword('');
      setRevealed(false);
    }
    onOpenChange(next);
  }

  function onSubmit(event) {
    event.preventDefault();
    const trimmed = password.trim();
    if (trimmed.length < 8) {
      toast.error('Use at least 8 characters.');
      return;
    }

    resetPassword.mutate(
      { userId: user._id, password: trimmed },
      {
        onSuccess: () => {
          setPassword(trimmed);
          setRevealed(true);
        },
        onError: (error) => {
          const message =
            error.response?.status === 400
              ? error.response?.data?.error ?? "We couldn't reset that password."
              : "We couldn't reset that password — please try again.";
          toast.error(message);
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!revealed}>
        {revealed ? (
          <>
            <DialogHeader>
              <DialogTitle>Share this password once</DialogTitle>
              <DialogDescription>
                {user.name} must sign in with this temporary password and choose a new one before they
                can use the app. It is not shown again.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2">
              <Input readOnly value={password} className="font-mono" />
              <Button type="button" variant="outline" onClick={() => copyToClipboard(password)}>
                <Copy className="size-4" aria-hidden="true" />
                Copy
              </Button>
            </div>
            <DialogFooter>
              <Button type="button" className="rounded-full bg-coral text-white hover:bg-coral/90" onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Reset password for {user.name}</DialogTitle>
              <DialogDescription>
                Set a temporary password, or generate one. They will be signed out of existing sessions
                and must choose a new password before they can continue.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={onSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <label htmlFor="temp-password" className="text-sm font-medium">
                  Temporary password
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    id="temp-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                  <Button type="button" variant="outline" onClick={() => setPassword(generateTempPassword())}>
                    <RefreshCw className="size-4" aria-hidden="true" />
                    Generate
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={resetPassword.isPending}
                  className="rounded-full bg-coral text-white hover:bg-coral/90"
                >
                  {resetPassword.isPending ? 'Resetting…' : 'Reset password'}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
