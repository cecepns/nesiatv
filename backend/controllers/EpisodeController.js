const db = require('../db');
const { generateSlug } = require('../utils/slug');

// Helper to record view event
async function recordAnimeViewEvent(animeId) {
  try {
    await db.execute('INSERT INTO anime_view_events (anime_id) VALUES (?)', [animeId]);
  } catch (err) {
    console.warn('Anime view event recording failed:', err.message);
  }
}

const showBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const [episodes] = await db.execute(
      `
      SELECT 
        e.id,
        e.episode_number as number,
        e.title,
        e.slug,
        e.anime_id,
        a.is_input_manual,
        a.slug as anime_slug,
        a.title as anime_title,
        a.thumbnail as anime_cover,
        a.synopsis as anime_synopsis,
        a.japanese_name,
        a.studio,
        a.producer,
        a.content_type,
        a.rating,
        a.bookmark_count,
        a.views as total_views,
        a.release,
        a.status
      FROM episodes e
      JOIN anime a ON e.anime_id = a.id
      WHERE e.slug = ?
    `,
      [slug]
    );

    if (episodes.length > 0) {
      const episode = episodes[0];

      try {
        await db.execute(
          'UPDATE episodes SET views = COALESCE(views, 0) + 1, updated_at = updated_at WHERE id = ?',
          [episode.id]
        );
      } catch (viewErr) {
        console.warn('Episode view increment failed:', viewErr.message);
      }

      await recordAnimeViewEvent(episode.anime_id);

      // Get video sources/stream links
      const [videos] = await db.execute(
        `
        SELECT id, quality, server, url
        FROM episode_videos
        WHERE episode_id = ?
      `,
        [episode.id]
      );

      const [allEpisodes] = await db.execute(
        `
        SELECT 
          e.id,
          e.episode_number as number,
          e.title,
          e.slug,
          e.created_at,
          COALESCE(e.views, 0) AS views,
          (
            SELECT COUNT(*) FROM episode_reactions er WHERE er.episode_id = e.id
          ) AS reaction_count
        FROM episodes e
        WHERE e.anime_id = ?
        ORDER BY CAST(e.episode_number AS UNSIGNED) DESC, e.episode_number DESC
      `,
        [episode.anime_id]
      );

      const [genres] = await db.execute(
        `
        SELECT c.id, c.name, c.slug
        FROM anime_genres ag
        JOIN categories c ON ag.category_id = c.id
        WHERE ag.anime_id = ?
      `,
        [episode.anime_id]
      );

      // Map genres
      episode.genres = genres;
      episode.videos = videos;
      episode.all_episodes = allEpisodes;

      return res.json({
        status: true,
        data: episode,
      });
    }

    return res.status(404).json({ status: false, error: 'Episode not found' });
  } catch (error) {
    console.error('Error fetching episode by slug:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const listByAnime = async (req, res) => {
  try {
    const { animeId } = req.params;
    const [rows] = await db.execute(
      'SELECT * FROM episodes WHERE anime_id = ? ORDER BY CAST(episode_number AS UNSIGNED) DESC, episode_number DESC',
      [animeId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error listing episodes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const create = async (req, res) => {
  try {
    const { anime_id, title, episode_number } = req.body;
    if (!anime_id || !title || !episode_number) {
      return res.status(400).json({ error: 'anime_id, title and episode_number are required' });
    }

    const [animeRows] = await db.execute('SELECT slug FROM anime WHERE id = ?', [anime_id]);
    if (animeRows.length === 0) {
      return res.status(404).json({ error: 'Anime not found' });
    }

    const animeSlug = animeRows[0].slug;
    const slug = `${animeSlug}-episode-${episode_number}`;

    const [result] = await db.execute(
      'INSERT INTO episodes (anime_id, title, slug, episode_number, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
      [anime_id, title, slug, episode_number]
    );

    res.status(201).json({ message: 'Episode created successfully', id: result.insertId, slug });
  } catch (error) {
    console.error('Error creating episode:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, episode_number } = req.body;

    const [existing] = await db.execute('SELECT * FROM episodes WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    const current = existing[0];
    let slug = current.slug;

    if (episode_number && episode_number !== current.episode_number) {
      const [animeRows] = await db.execute('SELECT slug FROM anime WHERE id = ?', [current.anime_id]);
      if (animeRows.length > 0) {
        slug = `${animeRows[0].slug}-episode-${episode_number}`;
      }
    }

    await db.execute(
      'UPDATE episodes SET title = ?, episode_number = ?, slug = ?, updated_at = NOW() WHERE id = ?',
      [title || current.title, episode_number || current.episode_number, slug, id]
    );

    res.json({ message: 'Episode updated successfully', slug });
  } catch (error) {
    console.error('Error updating episode:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const destroy = async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute('DELETE FROM episodes WHERE id = ?', [id]);
    res.json({ message: 'Episode deleted successfully' });
  } catch (error) {
    console.error('Error deleting episode:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Video Stream Link Operations (Replaces old Chapter Images endpoints)
const listVideos = async (req, res) => {
  try {
    const { episodeId } = req.params;
    const [rows] = await db.execute('SELECT * FROM episode_videos WHERE episode_id = ?', [episodeId]);
    res.json(rows);
  } catch (error) {
    console.error('Error listing episode videos:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const storeVideoSource = async (req, res) => {
  try {
    const { episode_id, quality, server, url } = req.body;
    if (!episode_id || !url) {
      return res.status(400).json({ error: 'episode_id and url are required' });
    }

    const [result] = await db.execute(
      'INSERT INTO episode_videos (episode_id, quality, server, url, created_at) VALUES (?, ?, ?, ?, NOW())',
      [episode_id, quality || 'Default', server || 'Primary', url]
    );

    res.status(201).json({ message: 'Video source added successfully', id: result.insertId });
  } catch (error) {
    console.error('Error adding video source:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteVideoSource = async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute('DELETE FROM episode_videos WHERE id = ?', [id]);
    res.json({ message: 'Video source deleted successfully' });
  } catch (error) {
    console.error('Error deleting video source:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  showBySlug,
  listByAnime,
  create,
  update,
  destroy,
  listVideos,
  storeVideoSource,
  deleteVideoSource,
};
