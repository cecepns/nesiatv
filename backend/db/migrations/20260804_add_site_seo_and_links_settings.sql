-- Migration file to insert/update default site settings & URLs
-- Date: 2026-08-04

INSERT INTO settings (`key`, `value`) VALUES
('site_title', 'NesiaTV - Nonton Anime, Donghua & Film Subtitle Indonesia'),
('meta_description', 'NesiaTV adalah platform streaming untuk menonton anime, donghua, film, dan serial terbaru dengan subtitle Indonesia. Nikmati tayangan berkualitas HD, update setiap hari, dan koleksi lengkap hanya di NesiaTV.'),
('baca_manga_url', 'https://v1.nesiatv.com/'),
('komik_id_url', 'https://v1.komiknesiaku.com/'),
('komik_alt_url', 'https://id.nusakomik.com/'),
('discord_url', 'https://discord.gg/dgC22PSm9h'),
('donate_url', 'https://trakteer.id/Nesiatv.id')
ON DUPLICATE KEY UPDATE `value` = VALUES(`value`);
