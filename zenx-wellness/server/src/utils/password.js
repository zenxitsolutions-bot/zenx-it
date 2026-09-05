import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export const hashPassword = (plain) => bcrypt.hash(plain, SALT_ROUNDS);

// bcrypt.compare throws on a missing/corrupt hash (e.g. a legacy row). Treat that as "no match"
// so login stays a 401 the form can show, not a 500.
export async function comparePassword(plain, hash) {
  if (!plain || !hash) return false;
  try {
    return await bcrypt.compare(plain, hash);
  } catch (err) {
    console.error('[password] bcrypt.compare failed — stored hash is not usable:', err.message);
    return false;
  }
}
