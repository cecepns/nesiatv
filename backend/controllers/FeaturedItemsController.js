const db = require('../db');
const { fetchLastChaptersByMangaIds } = require('../utils/chapterRelease');
const { createShortLivedCache } = require('../utils/shortLivedCache');

const featuredListCache = createShortLivedCache({ ttlMs: 5 * 60 * 1000, maxKeys: 48 });

function normalizeSearchQuery(input) {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/[\u2018\u2019\u201A\u201B\u0060\u00B4]/g, "'")
    .replace(/[\u201C\u201D\u201E]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function looseSearchTerm(input) {
  return normalizeSearchQuery(input)
    .replace(/[''`´]/g, '')
    .replace(/[-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildMangaSearchFilter(search) {
  const normalized = normalizeSearchQuery(search);
  if (!normalized) return { sql: '', params: [] };

  const likeNormalized = `%${normalized}%`;
  const loose = looseSearchTerm(normalized);
  const likeLoose = loose ? `%${loose}%` : null;
  const likeSlugLoose = loose ? `%${loose.replace(/\s+/g, '-')}%` : null;

  const params = [likeNormalized, likeNormalized, likeNormalized];
  let sql =
    ' AND (' +
    'm.title LIKE ? OR m.alternative_name LIKE ? OR m.slug LIKE ?';

  if (likeLoose && likeSlugLoose) {
    sql +=
      " OR REPLACE(m.title, CHAR(39), '') LIKE ?" +
      " OR REPLACE(m.alternative_name, CHAR(39), '') LIKE ?" +
      " OR REPLACE(m.slug, '-', ' ') LIKE ?" +
      ' OR m.slug LIKE ?';
    params.push(likeLoose, likeLoose, likeLoose, likeSlugLoose);
  }

  sql += ')';
  return { sql, params };
}

async function searchMangaForFeatured(query, limit = 50) {
  const q = normalizeSearchQuery(query);
  if (!q) return [];

  const perPage = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 100);
  const searchFilter = buildMangaSearchFilter(q);

  let sql =
    'SELECT m.*, m.thumbnail as cover FROM manga m WHERE 1=1' +
    searchFilter.sql +
    ' ORDER BY m.updated_at DESC LIMIT ?';
  const params = [...searchFilter.params, perPage];

  const [rows] = await db.execute(sql, params);
  return rows || [];
}

async function fetchFeaturedPayload(req) {
  const { type, active } = req.query;

  let query = `
      SELECT 
        fi.*,
        m.id as anime_id,
        m.title,
        m.slug,
        m.thumbnail as cover,
        m.alternative_name,
        m.author,
        m.synopsis,
        m.content_type,
        m.country_id,
        m.color,
        m.hot,
        m.is_project,
        m.is_safe,
        m.rating,
        m.bookmark_count,
        m.views as total_views,
        m.release,
        m.status,
        m.is_input_manual,
        m.westanime_id
      FROM featured_items fi
      JOIN manga m ON fi.anime_id = m.id
      WHERE 1=1
    `;

    const params = [];

    if (type) {
      query += ' AND fi.featured_type = ?';
      params.push(type);
    }

    if (active !== undefined && active !== '') {
      query += ' AND fi.is_active = ?';
      params.push(active === 'true');
    }

    query += ' ORDER BY fi.display_order ASC, fi.created_at DESC';

    const [items] = await db.execute(query, params);

    if (items.length === 0) {
      return [];
    }

    const animeIds = items.map((i) => i.anime_id);
    const idPlaceholders = animeIds.map(() => '?').join(',');

    let genresByMangaId = {};
    try {
      const [genreRows] = await db.execute(
        `
        SELECT mg.anime_id, c.id, c.name, c.slug
        FROM anime_genres mg
        JOIN categories c ON mg.category_id = c.id
        WHERE mg.anime_id IN (${idPlaceholders})
      `,
        animeIds
      );

      genresByMangaId = genreRows.reduce((acc, row) => {
        if (!acc[row.anime_id]) acc[row.anime_id] = [];
        acc[row.anime_id].push({
          id: row.id,
          name: row.name,
          slug: row.slug,
        });
        return acc;
      }, {});
    } catch (err) {
      console.error('Error loading genres for featured items:', err);
      genresByMangaId = {};
    }

    let lastChapterByMangaId = {};
    try {
      lastChapterByMangaId = await fetchLastChaptersByMangaIds(db, animeIds, 3);
    } catch (err) {
      console.error('Error loading last chapters for featured items:', err);
      lastChapterByMangaId = {};
    }

  return items.map((item) => ({
    ...item,
    genres: genresByMangaId[item.anime_id] || [],
    lastChapters: lastChapterByMangaId[item.anime_id] || [],
  }));
}

const searchManga = async (req, res) => {
  try {
    const { q = '', limit = 50 } = req.query;
    const manga = await searchMangaForFeatured(q, limit);
    res.json({ manga, total: manga.length });
  } catch (error) {
    console.error('Error searching manga for featured:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const index = async (req, res) => {
  try {
    const { type, active } = req.query;
    const cacheKey = JSON.stringify({
      type: type || null,
      active: active === undefined ? null : active === 'true',
    });
    const payload = await featuredListCache.wrap(cacheKey, () => fetchFeaturedPayload(req));
    res.json(payload);
  } catch (error) {
    console.error('Error fetching featured items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const store = async (req, res) => {
  try {
    let { anime_id, featured_type, display_order, is_active = true, westanime_id, slug } = req.body;

    if (display_order === null || display_order === undefined) {
      display_order = 0;
    }

    if (!anime_id || !featured_type) {
      return res.status(400).json({ error: 'anime_id and featured_type are required' });
    }

    let [mangaCheck] = await db.execute('SELECT id FROM manga WHERE id = ?', [anime_id]);

    if (mangaCheck.length === 0) {
      [mangaCheck] = await db.execute('SELECT id FROM manga WHERE westanime_id = ?', [anime_id]);
      if (mangaCheck.length > 0) {
        anime_id = mangaCheck[0].id;
      }
    }

    if (mangaCheck.length === 0 && westanime_id) {
      [mangaCheck] = await db.execute('SELECT id FROM manga WHERE westanime_id = ?', [westanime_id]);
      if (mangaCheck.length > 0) {
        anime_id = mangaCheck[0].id;
      }
    }

    if (mangaCheck.length === 0 && slug) {
      [mangaCheck] = await db.execute('SELECT id FROM manga WHERE slug = ?', [slug]);
      if (mangaCheck.length > 0) {
        anime_id = mangaCheck[0].id;
      }
    }

    if (mangaCheck.length === 0) {
      return res.status(404).json({
        error: 'Manga not found',
        message: 'Manga tidak ditemukan di database.',
      });
    }

    const [existing] = await db.execute(
      'SELECT id FROM featured_items WHERE anime_id = ? AND featured_type = ?',
      [anime_id, featured_type]
    );

    if (existing.length > 0) {
      await db.execute(
        'UPDATE featured_items SET display_order = ?, is_active = ? WHERE id = ?',
        [display_order, is_active, existing[0].id]
      );
      featuredListCache.invalidate();
      return res.json({ id: existing[0].id, message: 'Featured item updated successfully' });
    }

    const [result] = await db.execute(
      'INSERT INTO featured_items (anime_id, featured_type, display_order, is_active) VALUES (?, ?, ?, ?)',
      [anime_id, featured_type, display_order, is_active]
    );

    featuredListCache.invalidate();
    res.status(201).json({ id: result.insertId, message: 'Featured item created successfully' });
  } catch (error) {
    console.error('Error creating featured item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { anime_id, featured_type, display_order, is_active } = req.body;

    const updates = [];
    const params = [];

    if (anime_id !== undefined) {
      updates.push('anime_id = ?');
      params.push(anime_id);
    }

    if (featured_type !== undefined) {
      updates.push('featured_type = ?');
      params.push(featured_type);
    }

    if (display_order !== undefined) {
      const orderValue = display_order === null || display_order === '' ? 0 : display_order;
      updates.push('display_order = ?');
      params.push(orderValue);
    }

    if (is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id);

    await db.execute(`UPDATE featured_items SET ${updates.join(', ')} WHERE id = ?`, params);

    featuredListCache.invalidate();
    res.json({ message: 'Featured item updated successfully' });
  } catch (error) {
    console.error('Error updating featured item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const destroy = async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute('DELETE FROM featured_items WHERE id = ?', [id]);
    featuredListCache.invalidate();
    res.json({ message: 'Featured item deleted successfully' });
  } catch (error) {
    console.error('Error deleting featured item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  index,
  searchManga,
  store,
  update,
  destroy,
};

