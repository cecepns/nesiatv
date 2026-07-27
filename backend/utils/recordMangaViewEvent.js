const db = require('../db');

async function recordMangaViewEvent(animeId) {
  if (animeId == null || animeId === '') return;
  try {
    await db.execute('INSERT INTO manga_view_events (anime_id) VALUES (?)', [animeId]);
  } catch (e) {
    console.warn('recordMangaViewEvent failed:', e.message);
  }
}

module.exports = { recordMangaViewEvent };
