import { pool, withTransaction } from './pool.js';
import { RECIPE_PHOTOS } from '../data/recipePhotos.js';

// Explicit tenant scope; fill blanks only, preserving uploaded or previously selected photos.
const slug = process.argv[2];
if (!slug) throw new Error('Usage: node src/db/backfillRecipePhotos.js <company-slug>');
try {
  const count = await withTransaction(async (connection) => {
    const [companies] = await connection.execute('SELECT id FROM companies WHERE slug = ?', [slug]);
    if (companies.length !== 1) throw new Error('Company not found');
    let updated = 0;
    for (const [title, imageUrl] of Object.entries(RECIPE_PHOTOS)) {
      const [result] = await connection.execute(
        'UPDATE recipes r JOIN users u ON u.id = r.created_by SET r.image_url = ? WHERE u.company_id = ? AND r.visibility = \'company\' AND r.title = ? AND (r.image_url IS NULL OR r.image_url = ?)',
        [imageUrl, companies[0].id, title, ''],
      );
      updated += result.affectedRows;
    }
    return updated;
  });
  console.log(`Added photos to ${count} recipes.`);
} finally {
  await pool.end();
}
