const db = require('../db');
const CHAPTER_RELEASED_WHERE = '1=1';

const detailBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const [rows] = await db.execute(
      `
      SELECT m.*
      FROM anime m
      WHERE m.slug = ?
    `,
      [slug]
    );

    if (rows.length > 0) {
      const manga = rows[0];

      const [bookmarkRows] = await db.execute(
        'SELECT COUNT(*) AS cnt FROM bookmarks WHERE anime_id = ?',
        [manga.id]
      );
      const bookmarkCount = Number(bookmarkRows[0]?.cnt) || 0;

      const [genres] = await db.execute(
        `
        SELECT c.id, c.name, c.slug
        FROM anime_genres mg
        JOIN categories c ON mg.category_id = c.id
        WHERE mg.anime_id = ?
      `,
        [manga.id]
      );

      const [chapters] = await db.execute(
        `
        SELECT 
          c.id,
          c.westanime_episode_id as content_id,
          c.episode_number as number,
          c.title,
          c.slug,
          c.created_at,
          c.updated_at,
          COALESCE(c.views, 0) AS views,
          (
            SELECT COUNT(*) FROM episode_reactions cr WHERE cr.episode_id = c.id
          ) AS reaction_count,
          UNIX_TIMESTAMP(c.created_at) as created_at_timestamp,
          UNIX_TIMESTAMP(COALESCE(c.updated_at, c.created_at)) as updated_at_timestamp,
          UNIX_TIMESTAMP(COALESCE(c.scheduled_release_at, c.created_at)) as release_at_timestamp
        FROM episodes c
        WHERE c.anime_id = ?
          AND ${CHAPTER_RELEASED_WHERE}
        ORDER BY CAST(c.episode_number AS UNSIGNED) DESC, c.episode_number DESC
      `,
        [manga.id]
      );

      const mangaData = {
        id: manga.id,
        title: manga.title,
        slug: manga.slug,
        alternative_name: manga.alternative_name || null,
        author: manga.author || 'Unknown',
        sinopsis: manga.synopsis || null,
        cover: manga.thumbnail || null,
        content_type: manga.content_type || 'comic',
        country_id: manga.country_id || null,
        color: !!manga.color,
        hot: !!manga.hot,
        is_project: !!manga.is_project,
        is_safe: !!manga.is_safe,
        rating: parseFloat(manga.rating) || 0,
        bookmark_count: bookmarkCount,
        total_views: Number(manga.views) || 0,
        release: manga.release || null,
        status: manga.status || 'ongoing',
        genres,
        chapters: chapters.map((ch) => {
          const updateTime = ch.updated_at || ch.created_at;
          return {
            id: ch.id,
            content_id: ch.content_id || ch.id,
            number: ch.number,
            title: ch.title || `Chapter ${ch.number}`,
            slug: ch.slug,
            views: Number(ch.views) || 0,
            reaction_count: Number(ch.reaction_count) || 0,
            created_at: {
              time: parseInt(ch.release_at_timestamp || ch.created_at_timestamp, 10),
              formatted: new Date(ch.created_at).toLocaleString('id-ID', {
                timeZone: 'Asia/Jakarta',
              }),
            },
            updated_at: {
              time: parseInt(ch.updated_at_timestamp, 10),
              formatted: new Date(updateTime).toLocaleString('id-ID', {
                timeZone: 'Asia/Jakarta',
              }),
            },
          };
        }),
      };

      return res.json({
        status: true,
        data: mangaData,
      });
    }

    return res.status(404).json({
      status: false,
      error: 'Manga tidak ditemukan',
    });
  } catch (error) {
    console.error('Error fetching manga detail:', error);
    res.status(500).json({
      status: false,
      error: 'Internal server error',
    });
  }
};

const incrementView = async (req, res) => {
  try {
    const { slug } = req.params;

    const [rows] = await db.execute(
      `
      SELECT id, views
      FROM anime
      WHERE slug = ?
    `,
      [slug]
    );

    if (rows.length === 0) {
      return res.json({
        status: true,
        data: {
          slug,
          views: null,
          message: 'Anime not in local database, view not tracked',
        },
      });
    }

    const manga = rows[0];
    const currentViews = manga.views || 0;
    const newViews = currentViews + 1;

    await db.execute(
      `
      UPDATE anime
      SET views = ?, updated_at = updated_at
      WHERE id = ?
    `,
      [newViews, manga.id]
    );

    try {
      await db.execute('INSERT INTO anime_view_events (anime_id) VALUES (?)', [manga.id]);
    } catch {}

    res.json({
      status: true,
      data: {
        slug,
        views: newViews,
        previous_views: currentViews,
      },
      message: 'View counter updated successfully',
    });
  } catch (error) {
    console.error('Error incrementing view counter:', error);
    res.status(500).json({
      status: false,
      error: 'Internal server error',
    });
  }
};

module.exports = {
  detailBySlug,
  incrementView,
};

