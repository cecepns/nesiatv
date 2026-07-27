const db = require('../db');

const index = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 24 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageSize = Math.max(1, Math.min(100, parseInt(limit, 10) || 24));
    const offset = (pageNum - 1) * pageSize;

    const [[countRow]] = await db.execute(
      `SELECT COUNT(*) as total
       FROM bookmarks
       WHERE user_id = ?`,
      [userId]
    );
    const total = countRow ? countRow.total : 0;

    const [rows] = await db.execute(
      `SELECT b.id, b.anime_id, b.created_at, m.slug, m.title, m.thumbnail as cover
       FROM bookmarks b
       JOIN manga m ON m.id = b.anime_id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, pageSize, offset]
    );

    res.json({
      status: true,
      data: rows,
      meta: {
        page: pageNum,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    res.status(500).json({ status: false, error: 'Internal server error' });
  }
};

const store = async (req, res) => {
  try {
    const userId = req.user.id;
    let { anime_id, slug } = req.body;
    if (!anime_id && slug) {
      const [m] = await db.execute('SELECT id FROM manga WHERE slug = ?', [slug]);
      if (m.length > 0) anime_id = m[0].id;
    }
    if (!anime_id) {
      return res.status(400).json({ status: false, error: 'anime_id or slug required' });
    }
    await db.execute(
      'INSERT IGNORE INTO bookmarks (user_id, anime_id) VALUES (?, ?)',
      [userId, anime_id]
    );
    res.json({ status: true, message: 'Bookmark added' });
  } catch (error) {
    console.error('Error adding bookmark:', error);
    res.status(500).json({ status: false, error: 'Internal server error' });
  }
};

const destroy = async (req, res) => {
  try {
    const userId = req.user.id;
    let animeId = req.params.animeId;
    if (Number.isNaN(Number(animeId))) {
      const [m] = await db.execute('SELECT id FROM manga WHERE slug = ?', [animeId]);
      if (m.length > 0) animeId = m[0].id;
    }
    await db.execute('DELETE FROM bookmarks WHERE user_id = ? AND anime_id = ?', [userId, animeId]);
    res.json({ status: true, message: 'Bookmark removed' });
  } catch (error) {
    console.error('Error removing bookmark:', error);
    res.status(500).json({ status: false, error: 'Internal server error' });
  }
};

const check = async (req, res) => {
  try {
    let animeId = req.params.animeId;
    if (Number.isNaN(Number(animeId))) {
      const [m] = await db.execute('SELECT id FROM manga WHERE slug = ?', [animeId]);
      animeId = m.length > 0 ? m[0].id : null;
    }
    if (!animeId) {
      return res.json({ status: true, bookmarked: false });
    }
    const [rows] = await db.execute(
      'SELECT id FROM bookmarks WHERE user_id = ? AND anime_id = ?',
      [req.user.id, animeId]
    );
    res.json({ status: true, bookmarked: rows.length > 0 });
  } catch (error) {
    console.error('Error checking bookmark:', error);
    res.status(500).json({ status: false, error: 'Internal server error' });
  }
};

module.exports = {
  index,
  store,
  destroy,
  check,
};

