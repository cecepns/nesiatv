/* global require, __dirname */
require('dotenv').config();
const express = require('express');
const http = require('http');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const db = require('./db');
const { JWT_SECRET } = require('./middlewares/auth');

const authRoutes = require('./routes/authRoutes');
const categoriesRoutes = require('./routes/categoriesRoutes');
const contentsRoutes = require('./routes/contentsRoutes');
const bookmarkRoutes = require('./routes/bookmarkRoutes');
const readlistRoutes = require('./routes/readlistRoutes');
const commentRoutes = require('./routes/commentRoutes');
const voteRoutes = require('./routes/voteRoutes');
const episodeRoutes = require('./routes/episodeRoutes');
const animeRoutes = require('./routes/animeRoutes');
const comicRoutes = require('./routes/comicRoutes');
const adsRoutes = require('./routes/adsRoutes');
const featuredItemsRoutes = require('./routes/featuredItemsRoutes');
const sitemapRoutes = require('./routes/sitemapRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const contactInfoRoutes = require('./routes/contactInfoRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const adminUserRoutes = require('./routes/adminUserRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const premiumOrderRoutes = require('./routes/premiumOrderRoutes');
const stickerRoutes = require('./routes/stickerRoutes');
const liveChatRoutes = require('./routes/liveChatRoutes');
const imageProxyRoutes = require('./routes/imageProxyRoutes');
const otakudesuRoutes = require('./routes/otakudesuRoutes');
const chapterReactionRoutes = require('./routes/chapterReactionRoutes');
const { validateApiOrigin } = require('./middlewares/validateApiOrigin');

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);
const PORT = 3001;

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://nesiatv.vercel.app',
  'https://nesiatv.net',
  'https://www.nesiatv.asia',
  'https://02.nesiatv.asia',
  'https://www.02.nesiatv.asia', // pastikan versi www juga ada
  'https://id.nesiatv.net',
  'https://v1.nesiatvku.com',
  'https://v2.nesiatv.site',
  'https://v3.nesiatv.site',
  'https://v4.nesiatv.site',
  'https://v5.nesiatv.site',
  'https://v6.nesiatv.site',
  'https://v7.nesiatv.site',
  'https://v8.nesiatv.site',
  'https://v9.nesiatv.site'
];

app.use(cors({
  origin: function (origin, callback) {
    // Jika request tidak ada origin (misal Postman), izinkan juga
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads-nesiatv')));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads-nesiatv');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

app.set('io', io);

io.on('connection', (socket) => {
  socket.on('live-chat:send', async (payload, ack) => {
    try {
      const message = String(payload?.message || '').trim();
      const token = typeof payload?.token === 'string' ? payload.token : '';

      if (!token) {
        if (typeof ack === 'function') ack({ status: false, error: 'Access token required' });
        return;
      }

      if (!message) {
        if (typeof ack === 'function') ack({ status: false, error: 'Pesan tidak boleh kosong' });
        return;
      }

      if (message.length > 300) {
        if (typeof ack === 'function') {
          ack({ status: false, error: 'Pesan terlalu panjang (maksimal 300 karakter)' });
        }
        return;
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      const [users] = await db.execute(
        `SELECT id, username, name, profile_image
         FROM users
         WHERE id = ?`,
        [decoded.userId]
      );

      if (users.length === 0) {
        if (typeof ack === 'function') ack({ status: false, error: 'User not found' });
        return;
      }

      const sender = users[0];
      const [result] = await db.execute(
        'INSERT INTO live_chat_messages (user_id, message) VALUES (?, ?)',
        [sender.id, message]
      );
      const [rows] = await db.execute(
        `SELECT
          c.id,
          c.user_id,
          c.message,
          c.created_at,
          u.username,
          u.name,
          u.profile_image,
          u.is_membership,
          u.membership_expires_at,
          CASE
            WHEN u.is_membership = 1 AND (u.membership_expires_at IS NULL OR u.membership_expires_at >= NOW())
            THEN 1
            ELSE 0
          END AS membership_active,
          u.role
        FROM live_chat_messages c
        JOIN users u ON u.id = c.user_id
        WHERE c.id = ?`,
        [result.insertId]
      );

      io.emit('live-chat:new-message', rows[0]);
      if (typeof ack === 'function') ack({ status: true });
    } catch {
      if (typeof ack === 'function') ack({ status: false, error: 'Gagal mengirim pesan' });
    }
  });
});

// Middleware to dynamically rewrite S3/R2 image keys to use the current dynamic CDN domain
const { tryParseS3KeyFromUrl, getDynamicCdnDomainSync } = require('./utils/s3Upload');

function transformUrls(obj, cdnUrl) {
  if (obj === null || obj === undefined) return obj;

  if (obj instanceof Date) {
    return obj;
  }

  if (typeof obj === 'string') {
    if (obj.startsWith('/uploads/')) {
      return obj;
    }
    const key = tryParseS3KeyFromUrl(obj);
    if (key) {
      const cleanCdn = cdnUrl.replace(/\/$/, '');
      return `${cleanCdn}/${key}`;
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => transformUrls(item, cdnUrl));
  }

  if (typeof obj === 'object') {
    const newObj = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        newObj[key] = transformUrls(obj[key], cdnUrl);
      }
    }
    return newObj;
  }

  return obj;
}

app.use((req, res, next) => {
  const originalJson = res.json;
  res.json = function (body) {
    if (body) {
      const cdnUrl = getDynamicCdnDomainSync();
      body = transformUrls(body, cdnUrl);
    }
    return originalJson.call(this, body);
  };
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/contents', validateApiOrigin(), contentsRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/readlists', readlistRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/episode-reactions', chapterReactionRoutes);
app.use('/api/anime', validateApiOrigin(), animeRoutes);
app.use('/api/episodes', validateApiOrigin(), episodeRoutes);
app.use('/api/comic', validateApiOrigin(), comicRoutes);
app.use('/api/ads', adsRoutes);
app.use('/api/featured-items', validateApiOrigin(), featuredItemsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/contact-info', contactInfoRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/premium-orders', premiumOrderRoutes);
app.use('/api/stickers', stickerRoutes);
app.use('/api/live-chat', liveChatRoutes);
app.use('/api', imageProxyRoutes);
app.use('/api/otakudesu', otakudesuRoutes);
app.get('/api/chapters/schedule', require('./controllers/ChapterScheduleController').getSchedule);
app.use('/', sitemapRoutes);



// (in-memory cache helpers were removed; caching is handled in dedicated modules/controllers)


// Get episode videos by slug (format local and compatible with frontend)
app.get('/api/v/:episodeSlug', async (req, res) => {
  try {
    const { episodeSlug } = req.params;

    const [episodes] = await db.execute(`
      SELECT 
        e.id,
        e.episode_number as number,
        e.title,
        e.slug,
        e.anime_id,
        a.slug as anime_slug,
        a.title as anime_title,
        a.thumbnail as anime_cover,
        a.synopsis as anime_synopsis,
        a.japanese_name as anime_author,
        a.content_type,
        a.rating,
        a.bookmark_count,
        a.views as total_views,
        a.release,
        a.status
      FROM episodes e
      JOIN anime a ON e.anime_id = a.id
      WHERE e.slug = ?
    `, [episodeSlug]);

    if (episodes.length > 0) {
      const episode = episodes[0];

      // Increment views counter
      try {
        await db.execute(
          'UPDATE episodes SET views = COALESCE(views, 0) + 1, updated_at = updated_at WHERE id = ?',
          [episode.id]
        );
        await db.execute(
          'UPDATE anime SET views = COALESCE(views, 0) + 1, updated_at = updated_at WHERE id = ?',
          [episode.anime_id]
        );
      } catch (viewErr) {
        console.warn('View increment error:', viewErr.message);
      }

      // Get all video stream links for this episode
      const [videos] = await db.execute(`
        SELECT id, quality, server, url
        FROM episode_videos
        WHERE episode_id = ?
      `, [episode.id]);

      // Get all episodes for this anime (for navigation)
      const [allEpisodes] = await db.execute(`
        SELECT 
          e.id,
          e.episode_number as number,
          e.title,
          e.slug,
          e.created_at,
          UNIX_TIMESTAMP(e.created_at) as created_at_timestamp
        FROM episodes e
        WHERE e.anime_id = ?
        ORDER BY CAST(e.episode_number AS UNSIGNED) DESC, e.episode_number DESC
      `, [episode.anime_id]);

      // Get genres for this anime
      const [genres] = await db.execute(`
        SELECT c.id, c.name, c.slug
        FROM anime_genres ag
        JOIN categories c ON ag.category_id = c.id
        WHERE ag.anime_id = ?
      `, [episode.anime_id]);

      const responseData = {
        videos: videos,
        content: {
          id: episode.anime_id,
          title: episode.anime_title,
          slug: episode.anime_slug,
          alternative_name: null,
          author: episode.anime_author || 'Unknown',
          sinopsis: episode.anime_synopsis || null,
          cover: episode.anime_cover || null,
          content_type: episode.content_type || 'TV',
          rating: parseFloat(episode.rating) || 0,
          bookmark_count: episode.bookmark_count || 0,
          total_views: episode.total_views || 0,
          release: episode.release || null,
          status: episode.status || 'ongoing',
          genres: genres
        },
        episodes: allEpisodes.map(ep => ({
          id: ep.id,
          number: ep.number,
          title: ep.title || `Episode ${ep.number}`,
          slug: ep.slug,
          created_at: {
            time: parseInt(ep.created_at_timestamp, 10),
            formatted: new Date(ep.created_at).toLocaleString('id-ID')
          }
        })),
        number: episode.number
      };

      return res.json({
        status: true,
        data: responseData
      });
    }

    return res.status(404).json({
      status: false,
      error: 'Episode tidak ditemukan'
    });
  } catch (error) {
    console.error('Error fetching chapter images:', error);
    res.status(500).json({
      status: false,
      error: 'Internal server error'
    });
  }
});


// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 500KB' });
    }
  }
  res.status(500).json({ error: error.message });
  next();
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});

const runSqlMigration = async () => {
  const statements = [
    'ALTER TABLE users ADD COLUMN name VARCHAR(100) NULL AFTER id',
    'ALTER TABLE users ADD COLUMN points INT NOT NULL DEFAULT 0',
    'ALTER TABLE users ADD COLUMN is_membership TINYINT(1) NOT NULL DEFAULT 0',
    'ALTER TABLE users ADD COLUMN membership_expires_at DATETIME NULL',
    'ALTER TABLE users ADD COLUMN bio TEXT NULL AFTER email',
    `CREATE TABLE IF NOT EXISTS user_chapter_reads (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id INT NOT NULL,
      episode_id INT NOT NULL,
      exp_awarded INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uniq_user_chapter_read (user_id, episode_id),
      KEY idx_user_chapter_reads_user (user_id),
      KEY idx_user_chapter_reads_chapter (episode_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS premium_orders (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      username VARCHAR(100) NOT NULL,
      package_id VARCHAR(50) NOT NULL,
      package_name VARCHAR(120) NOT NULL,
      package_price VARCHAR(40) NULL,
      proof_image VARCHAR(255) NOT NULL,
      payment_status ENUM('pending', 'sukses') NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_premium_orders_status (payment_status),
      KEY idx_premium_orders_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS stickers (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      name VARCHAR(120) NOT NULL,
      image_path VARCHAR(255) NOT NULL,
      is_gif TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_stickers_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS live_chat_messages (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id INT NOT NULL,
      message VARCHAR(300) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_live_chat_created (created_at),
      KEY idx_live_chat_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `INSERT INTO settings (\`key\`, \`value\`)
     VALUES
       ('popup_ads_interval_minutes', '20'),
       ('home_popup_interval_minutes', '30'),
       ('redirect_script_urls', '["https://mbuh.my.id/siap/1770790072377-nesiatv.js"]')
     ON DUPLICATE KEY UPDATE \`value\` = \`value\``,
    'ALTER TABLE ads ADD COLUMN expired_at DATETIME NULL',
    'ALTER TABLE episodes ADD COLUMN scheduled_release_at DATETIME NULL AFTER updated_at',
    'ALTER TABLE episodes ADD INDEX idx_episodes_scheduled_release (scheduled_release_at)',
    'ALTER TABLE settings MODIFY COLUMN `value` TEXT NULL',
  ];

  for (const statement of statements) {
    try {
      await db.execute(statement);
    } catch (error) {
      // Ignore duplicate column or missing old table when migration already applied.
      if (
        error &&
        (error.code === 'ER_DUP_FIELDNAME' ||
          error.errno === 1060 ||
          error.code === 'ER_DUP_KEYNAME' ||
          error.errno === 1061 ||
          error.code === 'ER_NO_SUCH_TABLE' ||
          error.errno === 1146)
      ) {
        continue;
      }
      throw error;
    }
  }

  console.log('[migration] 20260423 migration checked/applied');
};

runSqlMigration().catch((error) => {
  console.error('[migration] Failed running SQL migration:', error);
});