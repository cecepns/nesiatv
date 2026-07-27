const db = require('../db');

async function fetchLastEpisodesByAnimeIds(db, animeIds, limit = 3) {
  if (!Array.isArray(animeIds) || animeIds.length === 0) {
    return {};
  }

  const uniqueIds = [...new Set(animeIds.map((id) => parseInt(id, 10)).filter((id) => !Number.isNaN(id)))];
  if (uniqueIds.length === 0) return {};

  const placeholders = uniqueIds.map(() => '?').join(',');
  const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 3, 1), 10);

  const [rows] = await db.execute(
    `
    SELECT
      e.anime_id,
      e.episode_number AS number,
      e.title,
      e.slug,
      UNIX_TIMESTAMP(e.created_at) AS created_at_timestamp,
      UNIX_TIMESTAMP(e.updated_at) AS updated_at_timestamp
    FROM episodes e
    WHERE e.anime_id IN (${placeholders})
    ORDER BY e.anime_id ASC, CAST(e.episode_number AS UNSIGNED) DESC, e.created_at DESC
  `,
    uniqueIds
  );

  const acc = {};
  for (const row of rows) {
    if (!acc[row.anime_id]) acc[row.anime_id] = [];
    if (acc[row.anime_id].length < safeLimit) {
      acc[row.anime_id].push({
        number: row.number,
        title: row.title,
        slug: row.slug,
        created_at: { time: row.created_at_timestamp },
      });
    }
  }
  return acc;
}

module.exports = {
  fetchLastEpisodesByAnimeIds,
};
