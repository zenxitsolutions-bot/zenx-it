let passwordChangeRequiredHandler = null;

export function onPasswordChangeRequired(handler) {
  passwordChangeRequiredHandler = handler;
  return () => {
    if (passwordChangeRequiredHandler === handler) passwordChangeRequiredHandler = null;
  };
}

export function notifyPasswordChangeRequired() {
  passwordChangeRequiredHandler?.();
}
