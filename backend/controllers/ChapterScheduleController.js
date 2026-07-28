const db = require('../db');

function formatDateOnly(dt) {
  if (!dt) return null;
  const d = new Date(dt);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

function getScheduleDayKey(dt) {
  if (!dt) return null;
  const d = new Date(dt);
  if (isNaN(d.getTime())) return null;
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[d.getDay()];
}

function normalizeScheduledForResponse(row) {
  if (!row.scheduled_release_at) return null;
  return {
    time: row.scheduled_release_at_timestamp || Math.floor(new Date(row.scheduled_release_at).getTime() / 1000),
    formatted: new Date(row.scheduled_release_at).toISOString(),
  };
}

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const DAY_LABELS_ID = {
  monday: 'Senin',
  tuesday: 'Selasa',
  wednesday: 'Rabu',
  thursday: 'Kamis',
  friday: 'Jumat',
  saturday: 'Sabtu',
  sunday: 'Minggu',
};

function parseWeekOffset(raw) {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : 0;
}

function mapScheduleRow(row) {
  return {
    id: row.id,
    slug: row.slug,
    chapter_number: row.chapter_number,
    title: row.title,
    scheduled_release_at: normalizeScheduledForResponse(row),
    manga: {
      id: row.anime_id,
      title: row.manga_title,
      slug: row.manga_slug,
      cover: row.manga_cover || null,
      thumbnail: row.manga_cover || null,
      is_project: !!row.is_project,
    },
  };
}

/**
 * GET /api/chapters/schedule?week=0
 * week: offset minggu dari minggu ini (0 = minggu berjalan, 1 = minggu depan, -1 = minggu lalu)
 */
const getSchedule = async (req, res) => {
  try {
    const weekOffset = parseWeekOffset(req.query.week);

    const [metaRows] = await db.execute(
      `
      SELECT
        DATE(DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL ? WEEK)) AS week_start,
        DATE(DATE_ADD(DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL ? WEEK), INTERVAL 6 DAY)) AS week_end
    `,
      [weekOffset, weekOffset]
    );

    const weekStart = metaRows[0]?.week_start;
    const weekEnd = metaRows[0]?.week_end;

    const days = {};
    for (const key of DAY_KEYS) {
      days[key] = [];
    }

    if (weekOffset < 0) {
      return res.json({
        status: true,
        week_offset: weekOffset,
        week_start: formatDateOnly(weekStart),
        week_end: formatDateOnly(weekEnd),
        day_labels: DAY_LABELS_ID,
        days,
        total: 0,
      });
    }

    const [rows] = await db.execute(
      `
      SELECT
        e.id,
        e.slug,
        e.episode_number AS chapter_number,
        e.title,
        e.scheduled_release_at,
        UNIX_TIMESTAMP(e.scheduled_release_at) AS scheduled_release_at_timestamp,
        a.id AS anime_id,
        a.title AS manga_title,
        a.slug AS manga_slug,
        a.thumbnail AS manga_cover,
        a.is_project
      FROM episodes e
      INNER JOIN anime a ON a.id = e.anime_id
      WHERE e.scheduled_release_at IS NOT NULL
        AND DATE(e.scheduled_release_at) BETWEEN ? AND ?
      ORDER BY e.scheduled_release_at ASC
    `,
      [weekStart, weekEnd]
    );

    for (const row of rows) {
      const key = getScheduleDayKey(row.scheduled_release_at);
      if (!key || !days[key]) {
        console.warn(
          'Skip schedule row: could not resolve day bucket',
          row.id,
          row.scheduled_release_at
        );
        continue;
      }
      days[key].push(mapScheduleRow(row));
    }

    res.json({
      status: true,
      week_offset: weekOffset,
      week_start: formatDateOnly(weekStart),
      week_end: formatDateOnly(weekEnd),
      day_labels: DAY_LABELS_ID,
      days,
      total: rows.length,
    });
  } catch (error) {
    console.error('Error fetching chapter schedule:', error);
    res.status(500).json({ status: false, error: 'Internal server error' });
  }
};

module.exports = { getSchedule };
