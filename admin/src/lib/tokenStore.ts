// Two independent in-memory access tokens — staff (/admin/login) and customer (/login) are
// separate JWT realms on the backend (see admin-server/src/utils/jwt.js), so a browser tab could
// in principle hold both at once (different cookie paths avoid collision) even though only one
// login UI is ever shown at a time.
let staffAccessToken: string | null = null;
let customerAccessToken: string | null = null;

export const getStaffAccessToken = () => staffAccessToken;
export const setStaffAccessToken = (token: string | null) => {
  staffAccessToken = token;
};

export const getCustomerAccessToken = () => customerAccessToken;
export const setCustomerAccessToken = (token: string | null) => {
  customerAccessToken = token;
};
