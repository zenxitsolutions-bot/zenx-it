let passwordChangeRequiredHandler = null;
let sessionEndedHandler = null;

export function onSessionEnded(handler) {
  sessionEndedHandler = handler;
  return () => { if (sessionEndedHandler === handler) sessionEndedHandler = null; };
}

export function notifySessionEnded() {
  sessionEndedHandler?.();
}

export function onPasswordChangeRequired(handler) {
  passwordChangeRequiredHandler = handler;
  return () => {
    if (passwordChangeRequiredHandler === handler) passwordChangeRequiredHandler = null;
  };
}

export function notifyPasswordChangeRequired() {
  passwordChangeRequiredHandler?.();
}
