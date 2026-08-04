const db = require('../db');
const { fetchLastEpisodesByAnimeIds } = require('../utils/episodeRelease');
const { createShortLivedCache } = require('../utils/shortLivedCache');

const contentsListCache = createShortLivedCache({ ttlMs: 60 * 1000, maxKeys: 96 });
const contentsCountCache = createShortLivedCache({ ttlMs: 5 * 60 * 1000, maxKeys: 48 });

function buildCacheKey(query) {
  return JSON.stringify(query);
}

const getContents = async (req, res) => {
  try {
    const {
      q = '',
      page = 1,
      per_page = 24,
      genre,
      status,
      type,
      orderBy = 'Update',
    } = req.query;

    const cacheKey = buildCacheKey(req.query);
    const cachedData = contentsListCache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const limit = parseInt(per_page, 10) || 24;
    const offset = (parseInt(page, 10) - 1) * limit;

    let query = `
      SELECT 
        a.id, a.title, a.slug, a.alternative_name, a.japanese_name, 
        a.thumbnail, a.cover_background, a.rating, a.views, a.status, 
        a.content_type, a.updated_at, c.name as category_name, COUNT(DISTINCT v.id) as votes,
        MAX(ep.created_at) as latest_ep_date
      FROM anime a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN votes v ON a.id = v.anime_id
      LEFT JOIN episodes ep ON a.id = ep.anime_id
    `;

    const whereConditions = ['1=1'];
    const params = [];

    if (q && q.trim()) {
      whereConditions.push('(a.title LIKE ? OR a.alternative_name LIKE ? OR a.japanese_name LIKE ?)');
      const searchTerm = `%${q.trim()}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (status && status !== 'All') {
      whereConditions.push('a.status = ?');
      params.push(status.toLowerCase());
    }

    if (type) {
      const typeLower = type.toLowerCase();
      if (typeLower === 'film' || typeLower === 'movie') {
        whereConditions.push('(LOWER(a.content_type) = "film" OR LOWER(a.content_type) = "movie")');
      } else if (typeLower === 'anime') {
        whereConditions.push('(LOWER(a.content_type) = "anime" OR LOWER(a.content_type) = "tv" OR LOWER(a.content_type) = "manga")');
      } else {
        whereConditions.push('LOWER(a.content_type) = ?');
        params.push(typeLower);
      }
    }

    // Genre filtering (supports ID, name, or slug)
    const genreArray = Array.isArray(genre) ? genre : (genre ? [genre] : []);
    if (genreArray.length > 0) {
      query += ' INNER JOIN anime_genres ag ON a.id = ag.anime_id INNER JOIN categories cat ON ag.category_id = cat.id';
      const genreConditions = genreArray.map(() => '(cat.id = ? OR LOWER(cat.slug) = ? OR LOWER(cat.name) = ?)').join(' OR ');
      whereConditions.push(`(${genreConditions})`);
      genreArray.forEach((g) => {
        const val = String(g).trim().toLowerCase();
        const numVal = parseInt(val, 10);
        params.push(Number.isNaN(numVal) ? -1 : numVal, val, val);
      });
    }

    query += ' WHERE ' + whereConditions.join(' AND ');
    query += ' GROUP BY a.id, c.name';

    // Order clause
    let orderClause = ' ORDER BY COALESCE(MAX(ep.created_at), a.updated_at) DESC, a.id DESC';
    if (orderBy === 'Az') {
      orderClause = ' ORDER BY a.title ASC';
    } else if (orderBy === 'Za') {
      orderClause = ' ORDER BY a.title DESC';
    } else if (orderBy === 'Popular') {
      orderClause = ' ORDER BY a.views DESC, a.rating DESC, a.id DESC';
    } else if (orderBy === 'Added') {
      orderClause = ' ORDER BY a.created_at DESC, a.id DESC';
    }
    query += orderClause;

    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await db.execute(query, params);
    const animeIds = rows.map((a) => a.id);

    // Fetch last episodes for card previews
    let lastEpisodes = {};
    if (animeIds.length > 0) {
      lastEpisodes = await fetchLastEpisodesByAnimeIds(db, animeIds, 3);
    }

    // Fetch genres for cards
    let genresByAnimeId = {};
    if (animeIds.length > 0) {
      const placeholders = animeIds.map(() => '?').join(',');
      const [genreRows] = await db.execute(
        `
        SELECT ag.anime_id, c.id, c.name, c.slug
        FROM anime_genres ag
        JOIN categories c ON ag.category_id = c.id
        WHERE ag.anime_id IN (${placeholders})
      `,
        animeIds
      );

      genresByAnimeId = genreRows.reduce((acc, row) => {
        if (!acc[row.anime_id]) acc[row.anime_id] = [];
        acc[row.anime_id].push({
          id: row.id,
          name: row.name,
          slug: row.slug,
        });
        return acc;
      }, {});
    }

    const formattedData = rows.map((a) => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
      alternative_name: a.alternative_name,
      japanese_name: a.japanese_name,
      thumbnail: a.thumbnail,
      cover_background: a.cover_background,
      rating: parseFloat(a.rating) || 0.0,
      views: a.views || 0,
      status: a.status,
      content_type: a.content_type,
      genres: genresByAnimeId[a.id] || [],
      last_episodes: lastEpisodes[a.id] || [],
      updated_at: a.updated_at,
    }));

    // Count query for pagination
    let countQuery = 'SELECT COUNT(DISTINCT a.id) as total FROM anime a';
    if (genreArray.length > 0) {
      countQuery += ' INNER JOIN anime_genres ag ON a.id = ag.anime_id INNER JOIN categories cat ON ag.category_id = cat.id';
    }
    countQuery += ' WHERE ' + whereConditions.join(' AND ');

    const [countRows] = await db.execute(countQuery, params.slice(0, -2));
    const totalItems = countRows[0]?.total || 0;
    const totalPages = Math.ceil(totalItems / limit) || 1;

    const responsePayload = {
      status: true,
      data: formattedData,
      meta: {
        total: totalItems,
        total_pages: totalPages,
        current_page: parseInt(page, 10) || 1,
        per_page: limit,
      },
      pagination: {
        total: totalItems,
        total_pages: totalPages,
        current_page: parseInt(page, 10) || 1,
        per_page: limit,
      },
    };

    // Cache list
    contentsListCache.set(cacheKey, responsePayload);

    return res.json(responsePayload);
  } catch (error) {
    console.error('Error in getContents:', error);
    return res.status(500).json({ status: false, error: 'Internal server error' });
  }
};

const getContentsCount = async (req, res) => {
  try {
    const { q = '', genre, status, type } = req.query;

    const cacheKey = buildCacheKey(req.query);
    const cachedCount = contentsCountCache.get(cacheKey);
    if (cachedCount !== undefined) {
      return res.json({ count: cachedCount });
    }

    let countQuery = 'SELECT COUNT(DISTINCT a.id) as total FROM anime a';
    const whereConditions = ['1=1'];
    const params = [];

    if (q && q.trim()) {
      whereConditions.push('(a.title LIKE ? OR a.alternative_name LIKE ? OR a.japanese_name LIKE ?)');
      const searchTerm = `%${q.trim()}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (status && status !== 'All') {
      whereConditions.push('a.status = ?');
      params.push(status.toLowerCase());
    }

    if (type) {
      whereConditions.push('a.content_type = ?');
      params.push(type);
    }

    const genreArray = Array.isArray(genre) ? genre : (genre ? [genre] : []);
    const genreIds = genreArray.map((g) => parseInt(g, 10)).filter((g) => !Number.isNaN(g));

    if (genreIds.length > 0) {
      countQuery += ' INNER JOIN anime_genres ag ON a.id = ag.anime_id';
      whereConditions.push(`ag.category_id IN (${genreIds.map(() => '?').join(',')})`);
      params.push(...genreIds);
    }

    countQuery += ' WHERE ' + whereConditions.join(' AND ');

    if (genreIds.length > 0) {
      countQuery += ' GROUP BY a.id HAVING COUNT(DISTINCT ag.category_id) = ?';
      params.push(genreIds.length);
    }

    let count = 0;
    if (genreIds.length > 0) {
      const [rows] = await db.execute(countQuery, params);
      count = rows.length;
    } else {
      const [rows] = await db.execute(countQuery, params);
      count = rows[0]?.total || 0;
    }

    contentsCountCache.set(cacheKey, count);
    return res.json({ count });
  } catch (error) {
    console.error('Error in getContentsCount:', error);
    return res.status(500).json({ status: false, error: 'Internal server error' });
  }
};

const genres = async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT c.*, COUNT(a.id) as anime_count 
      FROM categories c 
      LEFT JOIN anime a ON c.id = a.category_id 
      GROUP BY c.id 
      ORDER BY c.name
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching content genres:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const invalidateContentsCaches = () => {
  contentsListCache.clear();
  contentsCountCache.clear();
};

module.exports = {
  getContents,
  getContentsCount,
  list: getContents,
  genres,
  invalidateContentsCaches,
};
