-- phpMyAdmin SQL Dump
-- nesiatv clean database schema (Anime & Episode updated)
-- Versi server: 10.4.28-MariaDB / MySQL 8.0+

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `nesiatv`
--

-- --------------------------------------------------------

--
-- Tabel `users`
--

CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) DEFAULT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('user','admin') DEFAULT 'user',
  `points` int(11) NOT NULL DEFAULT 0,
  `is_membership` tinyint(1) NOT NULL DEFAULT 0,
  `membership_expires_at` datetime DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `profile_image` varchar(512) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  KEY `idx_username` (`username`),
  KEY `idx_email` (`email`),
  KEY `idx_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data untuk tabel `users` (Default Admin)
--

INSERT INTO `users` (`id`, `name`, `username`, `email`, `password`, `role`, `is_active`, `created_at`, `updated_at`, `profile_image`) VALUES
(1, 'Admin', 'Mimin Scarlett', 'admin@gmail.com', '$2a$12$Lg.6K5d.ITjXhVMzolSUE.2OeCAxm7Lm2tGq1aptmAQh1H3VDIg5W', 'admin', 1, '2025-12-20 17:08:08', '2026-03-08 22:32:52', '/uploads/profile_image-1773009172054-754781060.png')
ON DUPLICATE KEY UPDATE `id`=`id`;

-- --------------------------------------------------------

--
-- Tabel `categories`
--

CREATE TABLE IF NOT EXISTS `categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `slug` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  UNIQUE KEY `slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tabel `anime`
--

CREATE TABLE IF NOT EXISTS `anime` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `westanime_id` int(11) DEFAULT NULL,
  `source` varchar(50) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `slug` varchar(255) NOT NULL,
  `alternative_name` text DEFAULT NULL,
  `japanese_name` varchar(255) DEFAULT NULL,
  `producer` varchar(255) DEFAULT NULL,
  `studio` varchar(255) DEFAULT NULL,
  `author` varchar(255) DEFAULT NULL,
  `synopsis` text DEFAULT NULL,
  `thumbnail` varchar(500) DEFAULT NULL,
  `cover_background` varchar(500) DEFAULT NULL,
  `category_id` int(11) DEFAULT NULL,
  `content_type` varchar(50) DEFAULT 'TV',
  `country_id` varchar(10) DEFAULT NULL,
  `color` tinyint(1) DEFAULT 1,
  `hot` tinyint(1) DEFAULT 0,
  `is_project` tinyint(1) DEFAULT 0,
  `is_safe` tinyint(1) DEFAULT 1,
  `is_input_manual` tinyint(1) DEFAULT 0,
  `rating` decimal(3,1) DEFAULT 0.0,
  `bookmark_count` int(11) DEFAULT 0,
  `views` int(11) DEFAULT 0,
  `duration` varchar(100) DEFAULT NULL,
  `total_episodes` int(11) DEFAULT NULL,
  `release_date` varchar(100) DEFAULT NULL,
  `release` int(11) DEFAULT NULL,
  `status` enum('ongoing','completed','hiatus') DEFAULT 'ongoing',
  `last_chapter` varchar(50) DEFAULT NULL,
  `last_chapter_activity_at` datetime DEFAULT NULL,
  `requires_login` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  UNIQUE KEY `westanime_id` (`westanime_id`),
  KEY `idx_slug` (`slug`),
  KEY `idx_category` (`category_id`),
  KEY `idx_status` (`status`),
  KEY `idx_content_type` (`content_type`),
  KEY `idx_country_id` (`country_id`),
  KEY `idx_is_input_manual` (`is_input_manual`),
  KEY `idx_hot` (`hot`),
  KEY `idx_rating` (`rating`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `anime_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tabel `anime_genres`
--

CREATE TABLE IF NOT EXISTS `anime_genres` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `anime_id` int(11) NOT NULL,
  `category_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_anime_category` (`anime_id`,`category_id`),
  KEY `idx_anime` (`anime_id`),
  KEY `idx_category` (`category_id`),
  CONSTRAINT `anime_genres_ibfk_1` FOREIGN KEY (`anime_id`) REFERENCES `anime` (`id`) ON DELETE CASCADE,
  CONSTRAINT `anime_genres_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tabel `episodes`
--

CREATE TABLE IF NOT EXISTS `episodes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `westanime_episode_id` int(11) DEFAULT NULL,
  `anime_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `slug` varchar(255) DEFAULT NULL,
  `episode_number` varchar(50) NOT NULL,
  `cover` varchar(500) DEFAULT NULL,
  `views` int(11) DEFAULT 0,
  `scheduled_release_at` datetime DEFAULT NULL,
  `requires_login` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_anime_episode` (`anime_id`,`episode_number`),
  UNIQUE KEY `unique_episode_slug` (`slug`),
  KEY `idx_anime` (`anime_id`),
  KEY `idx_slug` (`slug`),
  KEY `idx_episode_number` (`episode_number`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `episodes_ibfk_1` FOREIGN KEY (`anime_id`) REFERENCES `anime` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tabel `episode_videos`
--

CREATE TABLE IF NOT EXISTS `episode_videos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `episode_id` int(11) NOT NULL,
  `quality` varchar(50) DEFAULT 'Default',
  `server` varchar(100) DEFAULT 'Primary',
  `url` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_episode` (`episode_id`),
  CONSTRAINT `episode_videos_ibfk_1` FOREIGN KEY (`episode_id`) REFERENCES `episodes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tabel `bookmarks`
--

CREATE TABLE IF NOT EXISTS `bookmarks` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `anime_id` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_anime` (`user_id`,`anime_id`),
  KEY `anime_id` (`anime_id`),
  CONSTRAINT `bookmarks_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `bookmarks_ibfk_2` FOREIGN KEY (`anime_id`) REFERENCES `anime` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tabel `comments`
--

CREATE TABLE IF NOT EXISTS `comments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `anime_id` int(11) DEFAULT NULL,
  `external_slug` varchar(255) DEFAULT NULL,
  `episode_id` int(11) DEFAULT NULL,
  `parent_id` int(11) DEFAULT NULL,
  `body` mediumtext NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `anime_id` (`anime_id`),
  KEY `episode_id` (`episode_id`),
  KEY `parent_id` (`parent_id`),
  CONSTRAINT `comments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `comments_ibfk_2` FOREIGN KEY (`anime_id`) REFERENCES `anime` (`id`) ON DELETE CASCADE,
  CONSTRAINT `comments_ibfk_3` FOREIGN KEY (`episode_id`) REFERENCES `episodes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `comments_ibfk_4` FOREIGN KEY (`parent_id`) REFERENCES `comments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Tabel `featured_items`
--

CREATE TABLE IF NOT EXISTS `featured_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `anime_id` int(11) NOT NULL,
  `featured_type` enum('banner','popular_daily','popular_weekly','popular_monthly','update_terbaru','rekomendasi') NOT NULL,
  `display_order` int(11) DEFAULT 0,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_anime_type` (`anime_id`,`featured_type`),
  KEY `idx_type` (`featured_type`),
  KEY `idx_active` (`is_active`),
  KEY `idx_order` (`display_order`),
  CONSTRAINT `featured_items_ibfk_1` FOREIGN KEY (`anime_id`) REFERENCES `anime` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tabel `votes`
--

CREATE TABLE IF NOT EXISTS `votes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `anime_id` int(11) NOT NULL,
  `vote_type` varchar(50) NOT NULL DEFAULT 'senang',
  `user_ip` varchar(45) NOT NULL,
  `user_id` int(10) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_anime_vote` (`anime_id`,`user_ip`),
  KEY `idx_anime` (`anime_id`),
  KEY `idx_votes_created_at` (`created_at`),
  KEY `idx_vote_type` (`vote_type`),
  CONSTRAINT `votes_ibfk_1` FOREIGN KEY (`anime_id`) REFERENCES `anime` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tabel `episode_reactions`
--

CREATE TABLE IF NOT EXISTS `episode_reactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `episode_id` int(11) NOT NULL,
  `reaction_type` varchar(50) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `user_ip` varchar(45) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_episode_reactions_episode` (`episode_id`),
  KEY `idx_episode_reactions_type` (`episode_id`, `reaction_type`),
  CONSTRAINT `episode_reactions_ibfk_1` FOREIGN KEY (`episode_id`) REFERENCES `episodes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tabel `anime_view_events`
--

CREATE TABLE IF NOT EXISTS `anime_view_events` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `anime_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_ave_anime_created` (`anime_id`, `created_at`),
  KEY `idx_ave_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Tabel `ads`
--

CREATE TABLE IF NOT EXISTS `ads` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `image` varchar(500) NOT NULL,
  `link_url` varchar(500) DEFAULT NULL,
  `ads_type` varchar(255) DEFAULT NULL,
  `image_alt` varchar(500) DEFAULT NULL,
  `title` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `expired_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_type` (`ads_type`),
  KEY `idx_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tabel `contact_info`
--

CREATE TABLE IF NOT EXISTS `contact_info` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `whatsapp` varchar(50) NOT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tabel `settings`
--

CREATE TABLE IF NOT EXISTS `settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `key` varchar(100) NOT NULL,
  `value` text DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tabel `stickers`
--

CREATE TABLE IF NOT EXISTS `stickers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(120) NOT NULL,
  `image_path` varchar(500) NOT NULL,
  `is_gif` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tabel `live_chat_messages`
--

CREATE TABLE IF NOT EXISTS `live_chat_messages` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `message` varchar(300) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `live_chat_messages_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tabel `premium_orders`
--

CREATE TABLE IF NOT EXISTS `premium_orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(100) NOT NULL,
  `package_id` varchar(50) NOT NULL,
  `package_name` varchar(120) NOT NULL,
  `package_price` varchar(50) DEFAULT NULL,
  `proof_image` varchar(500) NOT NULL,
  `payment_status` enum('pending','approved','rejected') DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tabel `user_readlists`
--

CREATE TABLE IF NOT EXISTS `user_readlists` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `title` varchar(200) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_user_readlists_user` (`user_id`),
  CONSTRAINT `user_readlists_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Tabel `user_readlist_manga`
--

CREATE TABLE IF NOT EXISTS `user_readlist_manga` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `readlist_id` int(11) NOT NULL,
  `anime_id` int(11) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_readlist_anime` (`readlist_id`,`anime_id`),
  KEY `idx_readlist_manga_readlist` (`readlist_id`),
  CONSTRAINT `user_readlist_manga_ibfk_1` FOREIGN KEY (`readlist_id`) REFERENCES `user_readlists` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_readlist_manga_ibfk_2` FOREIGN KEY (`anime_id`) REFERENCES `anime` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- View `anime_with_stats`
--

DROP VIEW IF EXISTS `anime_with_stats`;

CREATE ALGORITHM=UNDEFINED DEFINER=CURRENT_USER SQL SECURITY DEFINER VIEW `anime_with_stats` AS 
SELECT 
  `a`.`id` AS `id`, 
  `a`.`westanime_id` AS `westanime_id`, 
  `a`.`title` AS `title`, 
  `a`.`slug` AS `slug`, 
  `a`.`alternative_name` AS `alternative_name`, 
  `a`.`japanese_name` AS `japanese_name`,
  `a`.`producer` AS `producer`,
  `a`.`studio` AS `studio`,
  `a`.`author` AS `author`, 
  `a`.`synopsis` AS `synopsis`, 
  `a`.`thumbnail` AS `thumbnail`, 
  `a`.`cover_background` AS `cover_background`, 
  `a`.`category_id` AS `category_id`, 
  `a`.`content_type` AS `content_type`, 
  `a`.`country_id` AS `country_id`, 
  `a`.`color` AS `color`, 
  `a`.`hot` AS `hot`, 
  `a`.`is_project` AS `is_project`, 
  `a`.`is_safe` AS `is_safe`, 
  `a`.`is_input_manual` AS `is_input_manual`, 
  `a`.`rating` AS `rating`, 
  `a`.`bookmark_count` AS `bookmark_count`, 
  `a`.`views` AS `views`, 
  `a`.`release` AS `release`, 
  `a`.`status` AS `status`, 
  `a`.`created_at` AS `created_at`, 
  `a`.`updated_at` AS `updated_at`, 
  `c`.`name` AS `category_name`, 
  count(distinct `e`.`id`) AS `episode_count`, 
  count(distinct `v`.`id`) AS `vote_count`, 
  count(distinct `ag`.`category_id`) AS `genre_count`, 
  max(`e`.`created_at`) AS `last_episode_date` 
FROM ((((`anime` `a` 
  left join `categories` `c` on(`a`.`category_id` = `c`.`id`)) 
  left join `anime_genres` `ag` on(`a`.`id` = `ag`.`anime_id`)) 
  left join `episodes` `e` on(`a`.`id` = `e`.`anime_id`)) 
  left join `votes` `v` on(`a`.`id` = `v`.`anime_id`)) 
GROUP BY `a`.`id`;

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
