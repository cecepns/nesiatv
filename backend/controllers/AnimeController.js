const db = require('../db');
const { generateSlug } = require('../utils/slug');
const { deleteFile } = require('../utils/files');
const { uploadFileToS3, deleteUrlFromS3 } = require('../utils/s3Upload');
const fs = require('fs');
const path = require('path');

function parseBooleanField(value) {
  return value === 'true' || value === true || value === 1 || value === '1';
}

const index = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', category = '', source = 'all' } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT a.*, c.name as category_name, COUNT(DISTINCT v.id) as votes
      FROM anime a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN votes v ON a.id = v.anime_id
      WHERE 1=1
    `;

    const params = [];

    if (search) {
      query += ' AND (a.title LIKE ? OR a.alternative_name LIKE ? OR a.japanese_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (category) {
      query +=
        ' AND (a.category_id = ? OR a.id IN (SELECT anime_id FROM anime_genres WHERE category_id = ?))';
      params.push(category, category);
    }

    if (source === 'manual') {
      query += ' AND a.is_input_manual = TRUE';
    } else if (source === 'otakudesu') {
      query += ' AND a.is_input_manual = FALSE';
    }

    query += ' GROUP BY a.id ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [anime] = await db.execute(query, params);
    const animeIds = anime.map((a) => a.id);

    let genresByAnimeId = {};
    if (animeIds.length > 0) {
      try {
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
      } catch (err) {
        console.error('Error loading genres for anime list:', err);
        genresByAnimeId = {};
      }
    }

    for (const a of anime) {
      a.genres = genresByAnimeId[a.id] || [];
      a.is_project = !!a.is_project;
      a.color = !!a.color;
    }

    let countQuery = 'SELECT COUNT(DISTINCT a.id) as total FROM anime a WHERE 1=1';
    const countParams = [];

    if (search) {
      countQuery += ' AND (a.title LIKE ? OR a.alternative_name LIKE ? OR a.japanese_name LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (category) {
      countQuery +=
        ' AND (a.category_id = ? OR a.id IN (SELECT anime_id FROM anime_genres WHERE category_id = ?))';
      countParams.push(category, category);
    }

    if (source === 'manual') {
      countQuery += ' AND a.is_input_manual = TRUE';
    } else if (source === 'otakudesu') {
      countQuery += ' AND a.is_input_manual = FALSE';
    }

    const [countResult] = await db.execute(countQuery, countParams);
    const total = countResult[0]?.total || 0;

    res.json({
      data: anime,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching anime list:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const showBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const [rows] = await db.execute(
      `
      SELECT a.*, c.name as category_name, COUNT(v.id) as votes
      FROM anime a
      LEFT JOIN categories c ON a.category_id = c.id
      LEFT JOIN votes v ON a.id = v.anime_id
      WHERE a.slug = ?
      GROUP BY a.id
    `,
      [slug]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Anime not found' });
    }

    const anime = rows[0];

    const [genres] = await db.execute(
      `
      SELECT c.id, c.name, c.slug
      FROM anime_genres ag
      JOIN categories c ON ag.category_id = c.id
      WHERE ag.anime_id = ?
    `,
      [anime.id]
    );

    anime.genres = genres;

    const [episodes] = await db.execute(
      `
      SELECT 
        e.*, 
        COUNT(DISTINCT ev.id) as video_count,
        (SELECT COUNT(*) FROM episode_reactions er WHERE er.episode_id = e.id) as reactions
      FROM episodes e
      LEFT JOIN episode_videos ev ON e.id = ev.episode_id
      WHERE e.anime_id = ?
      GROUP BY e.id
      ORDER BY CAST(e.episode_number AS UNSIGNED) DESC, e.episode_number DESC
    `,
      [anime.id]
    );
    anime.episodes = episodes;

    res.json(anime);
  } catch (error) {
    console.error('Error fetching anime by slug:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const store = async (req, res) => {
  try {
    const {
      title,
      alternative_name,
      japanese_name,
      producer,
      studio,
      synopsis,
      category_id,
      content_type,
      rating,
      release,
      status,
      duration,
      total_episodes,
      release_date,
      hot,
      is_project,
      is_safe,
      requires_login,
      genres,
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const slug = generateSlug(title);

    // Handle File Uploads (similar to old Manga store)
    let thumbnail = '';
    let cover_background = '';

    if (req.files) {
      const thumbFile = req.files['thumbnail'] ? req.files['thumbnail'][0] : null;
      const bgFile = req.files['cover_background'] ? req.files['cover_background'][0] : null;

      if (thumbFile) {
        const key = `anime/${slug}/thumbnail-${Date.now()}${path.extname(thumbFile.originalname)}`;
        thumbnail = await uploadFileToS3(key, thumbFile.path, thumbFile.mimetype);
        deleteFile(thumbFile.path);
      }

      if (bgFile) {
        const key = `anime/${slug}/cover_background-${Date.now()}${path.extname(bgFile.originalname)}`;
        cover_background = await uploadFileToS3(key, bgFile.path, bgFile.mimetype);
        deleteFile(bgFile.path);
      }
    }

    const [result] = await db.execute(
      `
      INSERT INTO anime (
        title, slug, alternative_name, japanese_name, producer, studio,
        synopsis, thumbnail, cover_background, category_id, content_type,
        rating, status, duration, total_episodes, release_date, ` + '`release`,' + `
        hot, is_project, is_safe, requires_login, is_input_manual, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, NOW(), NOW())
    `,
      [
        title,
        slug,
        alternative_name || null,
        japanese_name || null,
        producer || null,
        studio || null,
        synopsis || null,
        thumbnail || null,
        cover_background || null,
        category_id ? parseInt(category_id, 10) : null,
        content_type || 'TV',
        rating ? parseFloat(rating) : 0.0,
        status || 'ongoing',
        duration || null,
        total_episodes ? parseInt(total_episodes, 10) : null,
        release_date || null,
        release ? parseInt(release, 10) : null,
        parseBooleanField(hot) ? 1 : 0,
        parseBooleanField(is_project) ? 1 : 0,
        parseBooleanField(is_safe) ? 1 : 0,
        parseBooleanField(requires_login) ? 1 : 0,
      ]
    );

    const animeId = result.insertId;

    if (genres) {
      const genreIds = Array.isArray(genres) ? genres : JSON.parse(genres);
      for (const catId of genreIds) {
        await db.execute('INSERT INTO anime_genres (anime_id, category_id) VALUES (?, ?)', [
          animeId,
          catId,
        ]);
      }
    }

    res.status(201).json({ message: 'Anime created successfully', id: animeId });
  } catch (error) {
    console.error('Error creating anime:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      alternative_name,
      japanese_name,
      producer,
      studio,
      synopsis,
      category_id,
      content_type,
      rating,
      release,
      status,
      duration,
      total_episodes,
      release_date,
      hot,
      is_project,
      is_safe,
      requires_login,
      genres,
    } = req.body;

    const [existing] = await db.execute('SELECT * FROM anime WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Anime not found' });
    }

    const anime = existing[0];
    const slug = title ? generateSlug(title) : anime.slug;

    let thumbnail = anime.thumbnail;
    let cover_background = anime.cover_background;

    if (req.files) {
      const thumbFile = req.files['thumbnail'] ? req.files['thumbnail'][0] : null;
      const bgFile = req.files['cover_background'] ? req.files['cover_background'][0] : null;

      if (thumbFile) {
        if (anime.thumbnail && anime.thumbnail.includes('amazonaws.com')) {
          await deleteUrlFromS3(anime.thumbnail);
        }
        const key = `anime/${slug}/thumbnail-${Date.now()}${path.extname(thumbFile.originalname)}`;
        thumbnail = await uploadFileToS3(key, thumbFile.path, thumbFile.mimetype);
        deleteFile(thumbFile.path);
      }

      if (bgFile) {
        if (anime.cover_background && anime.cover_background.includes('amazonaws.com')) {
          await deleteUrlFromS3(anime.cover_background);
        }
        const key = `anime/${slug}/cover_background-${Date.now()}${path.extname(bgFile.originalname)}`;
        cover_background = await uploadFileToS3(key, bgFile.path, bgFile.mimetype);
        deleteFile(bgFile.path);
      }
    }

    await db.execute(
      `
      UPDATE anime SET
        title = ?, slug = ?, alternative_name = ?, japanese_name = ?, producer = ?, studio = ?,
        synopsis = ?, thumbnail = ?, cover_background = ?, category_id = ?, content_type = ?,
        rating = ?, status = ?, duration = ?, total_episodes = ?, release_date = ?, ` + '`release` = ?,' + `
        hot = ?, is_project = ?, is_safe = ?, requires_login = ?, updated_at = NOW()
      WHERE id = ?
    `,
      [
        title || anime.title,
        slug,
        alternative_name !== undefined ? alternative_name : anime.alternative_name,
        japanese_name !== undefined ? japanese_name : anime.japanese_name,
        producer !== undefined ? producer : anime.producer,
        studio !== undefined ? studio : anime.studio,
        synopsis !== undefined ? synopsis : anime.synopsis,
        thumbnail,
        cover_background,
        category_id !== undefined ? (category_id ? parseInt(category_id, 10) : null) : anime.category_id,
        content_type !== undefined ? content_type : anime.content_type,
        rating !== undefined ? parseFloat(rating) : anime.rating,
        status !== undefined ? status : anime.status,
        duration !== undefined ? duration : anime.duration,
        total_episodes !== undefined ? (total_episodes ? parseInt(total_episodes, 10) : null) : anime.total_episodes,
        release_date !== undefined ? release_date : anime.release_date,
        release !== undefined ? (release ? parseInt(release, 10) : null) : anime.release,
        hot !== undefined ? (parseBooleanField(hot) ? 1 : 0) : anime.hot,
        is_project !== undefined ? (parseBooleanField(is_project) ? 1 : 0) : anime.is_project,
        is_safe !== undefined ? (parseBooleanField(is_safe) ? 1 : 0) : anime.is_safe,
        requires_login !== undefined ? (parseBooleanField(requires_login) ? 1 : 0) : anime.requires_login,
        id,
      ]
    );

    if (genres) {
      await db.execute('DELETE FROM anime_genres WHERE anime_id = ?', [id]);
      const genreIds = Array.isArray(genres) ? genres : JSON.parse(genres);
      for (const catId of genreIds) {
        await db.execute('INSERT INTO anime_genres (anime_id, category_id) VALUES (?, ?)', [
          id,
          catId,
        ]);
      }
    }

    res.json({ message: 'Anime updated successfully' });
  } catch (error) {
    console.error('Error updating anime:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const destroy = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await db.execute('SELECT * FROM anime WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Anime not found' });
    }

    const anime = existing[0];

    if (anime.thumbnail && anime.thumbnail.includes('amazonaws.com')) {
      await deleteUrlFromS3(anime.thumbnail);
    }
    if (anime.cover_background && anime.cover_background.includes('amazonaws.com')) {
      await deleteUrlFromS3(anime.cover_background);
    }

    await db.execute('DELETE FROM anime WHERE id = ?', [id]);

    res.json({ message: 'Anime deleted successfully' });
  } catch (error) {
    console.error('Error deleting anime:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const search = async (req, res) => {
  try {
    const { q = '' } = req.query;
    if (!q) {
      return res.json([]);
    }

    const [rows] = await db.execute(
      `
      SELECT id, title, slug, thumbnail, rating
      FROM anime
      WHERE title LIKE ? OR alternative_name LIKE ? OR japanese_name LIKE ?
      LIMIT 10
    `,
      [`%${q}%`, `%${q}%`, `%${q}%`]
    );

    res.json(rows);
  } catch (error) {
    console.error('Error searching anime:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  index,
  showBySlug,
  store,
  update,
  destroy,
  search,
};
