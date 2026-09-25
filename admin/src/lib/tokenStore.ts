// Two independent in-memory access tokens — staff (/admin/login) and customer (/login) are
// separate JWT realms on the backend (see admin-server/src/utils/jwt.js), so a browser tab could
// in principle hold both at once (different cookie paths avoid collision) even though only one
// login UI is ever shown at a time.
const createRealm = () => ({ token: null as string | null, generation: 0, controller: new AbortController(), refreshAllowed: true });
const staff = createRealm();
const customer = createRealm();
const realm = (isCustomer = false) => isCustomer ? customer : staff;

export const getAuthGeneration = (isCustomer = false) => realm(isCustomer).generation;
export const getAuthSignal = (isCustomer = false) => realm(isCustomer).controller.signal;
export const canRefreshSession = (isCustomer = false) => realm(isCustomer).refreshAllowed;
export function beginAuthTransition(isCustomer = false) {
  const state = realm(isCustomer);
  state.generation += 1;
  state.token = null;
  state.refreshAllowed = false;
  state.controller.abort();
  state.controller = new AbortController();
  return state.generation;
}

function setToken(token: string | null, isCustomer: boolean, expectedGeneration = getAuthGeneration(isCustomer)) {
  const state = realm(isCustomer);
  if (state.generation !== expectedGeneration) return false;
  state.token = token;
  state.refreshAllowed = Boolean(token);
  return true;
}
export const getStaffAccessToken = () => staff.token;
export const setStaffAccessToken = (token: string | null, expectedGeneration?: number) => setToken(token, false, expectedGeneration);
export const getCustomerAccessToken = () => customer.token;
export const setCustomerAccessToken = (token: string | null, expectedGeneration?: number) => setToken(token, true, expectedGeneration);
