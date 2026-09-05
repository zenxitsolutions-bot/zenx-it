// Shared gate for email and push: never notify a deactivated or suspended account.
// A bare {name, email} enquiry-contact stand-in has no accountStatus and is allowed through.
export function canNotifyUser(user) {
  if (!user?.email) return false;
  if (user.accountStatus && user.accountStatus !== 'active') return false;
  return true;
}
