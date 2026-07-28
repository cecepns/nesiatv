/** Chapter yang rilis kurang dari 2 jam lalu dikunci untuk tamu; setelah itu bisa dibaca tanpa login. */
export const CHAPTER_LOCK_WINDOW_MS = 2 * 60 * 60 * 1000;

export function getChapterReleaseMs(chapter) {
  const scheduled = chapter?.scheduled_release_at?.time;
  if (scheduled != null && scheduled !== '') {
    const n = Number(scheduled);
    if (Number.isFinite(n) && n > 0) return n < 1e12 ? n * 1000 : n;
  }
  const raw = chapter?.created_at?.time ?? chapter?.uploadedAt;
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n < 1e12 ? n * 1000 : n;
}

export function isWithinChapterLockWindow(chapter) {
  const releasedAt = getChapterReleaseMs(chapter);
  if (!releasedAt) return false;
  return Date.now() - releasedAt < CHAPTER_LOCK_WINDOW_MS;
}

export function isLatestChapterInList(chapters, episodeSlug) {
  if (!Array.isArray(chapters) || !episodeSlug || chapters.length === 0) return false;
  if (chapters[0]?.slug === episodeSlug) return true;

  const target = chapters.find((ch) => ch.slug === episodeSlug);
  if (!target) return false;

  const targetNum = parseFloat(target.number);
  if (!Number.isFinite(targetNum)) return chapters[0]?.slug === episodeSlug;

  let maxNum = -Infinity;
  for (const ch of chapters) {
    const n = parseFloat(ch.number);
    if (Number.isFinite(n) && n > maxNum) maxNum = n;
  }
  return targetNum >= maxNum;
}

export function findChapterInList(chapters, episodeSlug) {
  if (!Array.isArray(chapters) || !episodeSlug) return null;
  return chapters.find((ch) => ch.slug === episodeSlug) || null;
}

export function requiresChapterLogin(chapter, isAuthenticated) {
  if (!chapter) return false;
  if (isAuthenticated) return false;
  const val = chapter.requires_login;
  return val === true || val === 1 || val === '1' || val === 'true';
}

export function isChapterAccessLocked(chapters, episodeSlug, isAuthenticated) {
  if (isAuthenticated) return false;
  const chapter = findChapterInList(chapters, episodeSlug);
  return requiresChapterLogin(chapter, false);
}

export function normalizeChapterImage(image) {
  if (!image) return { src: null, link: null };
  if (typeof image === 'string') {
    return { src: image, link: null };
  }
  const src = image.image_path || image.url || image.src || null;
  const link = image.link_url || image.link || null;
  return { src, link };
}
