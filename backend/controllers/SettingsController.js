const db = require('../db');
const { createShortLivedCache } = require('../utils/shortLivedCache');

const POPUP_INTERVAL_OPTIONS = [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];
const POPUP_INITIAL_DELAY_OPTIONS = [1, 2, 3, 5, 10, 15, 20, 30];
const POPUP_UNLOCK_SECONDS_OPTIONS = [5, 10, 15, 20, 30, 45, 60];

const settingsPublicCache = createShortLivedCache({ ttlMs: 60 * 1000, maxKeys: 8 });
const DEFAULT_REDIRECT_SCRIPT_URLS = [];

const sanitizeScriptUrls = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
};

const parseAllowedInt = (raw, allowed, fallback) => {
  const v = parseInt(raw, 10);
  return Number.isFinite(v) && allowed.includes(v) ? v : fallback;
};

const DEFAULT_CUSTOM_LINKS = {
  discord_url: 'https://discord.gg/dgC22PSm9h',
  donate_url: 'https://trakteer.id/Nesiatv.id',
  komik_id_url: 'https://v1.komiknesiaku.com/',
  komik_alt_url: 'https://id.nusakomik.com/',
  baca_manga_url: 'https://v1.nesiatv.com/',
  premium_url: 'https://v1.nesiatv.com/premium',
  site_title: 'NesiaTV - Nonton Anime, Donghua & Film Subtitle Indonesia',
  meta_description: 'NesiaTV adalah platform streaming untuk menonton anime, donghua, film, dan serial terbaru dengan subtitle Indonesia. Nikmati tayangan berkualitas HD, update setiap hari, dan koleksi lengkap hanya di NesiaTV.',
};

const show = async (req, res) => {
  try {
    const payload = await settingsPublicCache.wrap('public', async () => {
      const [rows] = await db.execute(
        "SELECT `key`, `value` FROM settings WHERE `key` IN ('popup_ads_interval_minutes', 'home_popup_interval_minutes', 'popup_ads_initial_delay_minutes', 'popup_ads_unlock_seconds', 'redirect_script_urls', 'cdn_domain', 'discord_url', 'donate_url', 'komik_id_url', 'komik_alt_url', 'baca_manga_url', 'premium_url', 'site_title', 'meta_description')"
      );
      const map = Object.fromEntries((rows || []).map((r) => [r.key, r.value]));
      const popupAds = parseInt(map.popup_ads_interval_minutes, 10);
      const homePopup = parseInt(map.home_popup_interval_minutes, 10);
      const popupInitialDelay = parseInt(map.popup_ads_initial_delay_minutes, 10);
      const popupUnlockSeconds = parseInt(map.popup_ads_unlock_seconds, 10);
      let redirectScriptUrls = DEFAULT_REDIRECT_SCRIPT_URLS;
      if (typeof map.redirect_script_urls === 'string' && map.redirect_script_urls.trim()) {
        try {
          const parsed = JSON.parse(map.redirect_script_urls);
          const sanitized = sanitizeScriptUrls(parsed);
          if (sanitized.length) {
            redirectScriptUrls = sanitized;
          }
        } catch {
          redirectScriptUrls = DEFAULT_REDIRECT_SCRIPT_URLS;
        }
      }
      return {
        popup_ads_interval_minutes:
          Number.isFinite(popupAds) && POPUP_INTERVAL_OPTIONS.includes(popupAds) ? popupAds : 20,
        home_popup_interval_minutes:
          Number.isFinite(homePopup) && POPUP_INTERVAL_OPTIONS.includes(homePopup) ? homePopup : 30,
        popup_ads_initial_delay_minutes: parseAllowedInt(
          popupInitialDelay,
          POPUP_INITIAL_DELAY_OPTIONS,
          5
        ),
        popup_ads_unlock_seconds: parseAllowedInt(
          popupUnlockSeconds,
          POPUP_UNLOCK_SECONDS_OPTIONS,
          10
        ),
        redirect_script_urls: redirectScriptUrls,
        cdn_domain: map.cdn_domain || 'https://cdn.nesiatv.net',
        discord_url: map.discord_url || DEFAULT_CUSTOM_LINKS.discord_url,
        donate_url: map.donate_url || DEFAULT_CUSTOM_LINKS.donate_url,
        komik_id_url: map.komik_id_url || DEFAULT_CUSTOM_LINKS.komik_id_url,
        komik_alt_url: map.komik_alt_url || DEFAULT_CUSTOM_LINKS.komik_alt_url,
        baca_manga_url: map.baca_manga_url || DEFAULT_CUSTOM_LINKS.baca_manga_url,
        premium_url: map.premium_url || DEFAULT_CUSTOM_LINKS.premium_url,
        site_title: map.site_title || DEFAULT_CUSTOM_LINKS.site_title,
        meta_description: map.meta_description || DEFAULT_CUSTOM_LINKS.meta_description,
      };
    });
    res.json(payload);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.json({
      popup_ads_interval_minutes: 20,
      home_popup_interval_minutes: 30,
      popup_ads_initial_delay_minutes: 5,
      popup_ads_unlock_seconds: 10,
      redirect_script_urls: DEFAULT_REDIRECT_SCRIPT_URLS,
      ...DEFAULT_CUSTOM_LINKS,
    });
  }
};

const update = async (req, res) => {
  try {
    const {
      popup_ads_interval_minutes,
      home_popup_interval_minutes,
      popup_ads_initial_delay_minutes,
      popup_ads_unlock_seconds,
      redirect_script_urls,
      cdn_domain,
    } = req.body;

    const setIntervalKey = (key, value, allowed) => {
      const v = parseInt(value, 10);
      if (!Number.isFinite(v) || !allowed.includes(v)) return null;
      return db.execute(
        'INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?',
        [key, String(v), String(v)]
      );
    };

    if (popup_ads_interval_minutes !== undefined) {
      await setIntervalKey('popup_ads_interval_minutes', popup_ads_interval_minutes, POPUP_INTERVAL_OPTIONS);
    }
    if (home_popup_interval_minutes !== undefined) {
      await setIntervalKey('home_popup_interval_minutes', home_popup_interval_minutes, POPUP_INTERVAL_OPTIONS);
    }
    if (popup_ads_initial_delay_minutes !== undefined) {
      await setIntervalKey(
        'popup_ads_initial_delay_minutes',
        popup_ads_initial_delay_minutes,
        POPUP_INITIAL_DELAY_OPTIONS
      );
    }
    if (popup_ads_unlock_seconds !== undefined) {
      await setIntervalKey(
        'popup_ads_unlock_seconds',
        popup_ads_unlock_seconds,
        POPUP_UNLOCK_SECONDS_OPTIONS
      );
    }

    if (redirect_script_urls !== undefined) {
      const urls = sanitizeScriptUrls(redirect_script_urls);
      await db.execute(
        'INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?',
        ['redirect_script_urls', JSON.stringify(urls), JSON.stringify(urls)]
      );
    }

    if (cdn_domain !== undefined) {
      await db.execute(
        'INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?',
        ['cdn_domain', String(cdn_domain).trim(), String(cdn_domain).trim()]
      );
      const { refreshCdnDomain } = require('../utils/s3Upload');
      await refreshCdnDomain().catch(() => { });
    }

    const linkKeys = [
      'discord_url',
      'donate_url',
      'komik_id_url',
      'komik_alt_url',
      'baca_manga_url',
      'premium_url',
      'site_title',
      'meta_description',
    ];
    for (const key of linkKeys) {
      if (req.body[key] !== undefined) {
        const val = String(req.body[key]).trim();
        await db.execute(
          'INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?',
          [key, val, val]
        );
      }
    }

    settingsPublicCache.invalidate();
    res.json({ message: 'Settings updated' });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  show,
  update,
};
