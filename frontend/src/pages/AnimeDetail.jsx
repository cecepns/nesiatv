import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Bookmark, ListPlus, Share2, Play, Star, Tag, Eye, Lock, ArrowLeft, Home, Download, Sparkles } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL, apiClient, getImageUrl } from '../utils/api';
import CommentSection from '../components/CommentSection';
import LoginModal from '../components/LoginModal';

const AnimeDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [anime, setAnime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [playlistLoading, setPlaylistLoading] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const isLockedValue = (val) => val === true || val === 1 || val === '1' || val === 'true';

  const handleEpisodeClick = (e, ep) => {
    const isEpLocked = isLockedValue(ep?.requires_login) || isLockedValue(anime?.requires_login);
    if (isEpLocked && !isAuthenticated) {
      e.preventDefault();
      toast.info('Episode ini wajib login. Silakan login terlebih dahulu untuk menonton.');
      setLoginModalOpen(true);
    }
  };

  const handlePlaylistClick = async () => {
    if (!isAuthenticated) {
      toast.warning('Silakan login terlebih dahulu untuk menyimpan ke playlist');
      setLoginModalOpen(true);
      return;
    }
    if (!anime?.id) return;
    try {
      setPlaylistLoading(true);
      const res = await apiClient.getReadlists();
      let lists = Array.isArray(res?.data) ? res.data : [];
      let targetList = lists[0];

      if (!targetList) {
        const createRes = await apiClient.createReadlist({ title: 'Playlist Favorit Saya' });
        targetList = createRes?.data;
      }

      if (targetList?.id) {
        await apiClient.addReadlistItems(targetList.id, { manga_ids: [anime.id] });
        toast.success(`Anime berhasil ditambahkan ke playlist "${targetList.title}"!`);
      } else {
        navigate('/library?tab=readlist');
      }
    } catch (err) {
      console.error(err);
      toast.error('Gagal menambahkan ke playlist');
    } finally {
      setPlaylistLoading(false);
    }
  };

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const data = await apiClient.getAnimeBySlug(slug);
        setAnime(data);
        
        if (isAuthenticated) {
          const bookmarkStatus = await apiClient.checkBookmark(data.id);
          setIsBookmarked(bookmarkStatus?.bookmarked || false);
        }
      } catch (err) {
        console.error(err);
        toast.error('Gagal memuat detail anime');
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [slug, isAuthenticated]);

  const handleBookmarkToggle = async () => {
    if (!isAuthenticated) {
      toast.warning('Silakan login terlebih dahulu untuk bookmark');
      return;
    }
    try {
      setBookmarkLoading(true);
      if (isBookmarked) {
        await apiClient.removeBookmark(anime.id);
        setIsBookmarked(false);
        toast.success('Dihapus dari bookmark');
      } else {
        await apiClient.addBookmark(anime.id);
        setIsBookmarked(true);
        toast.success('Ditambahkan ke bookmark');
      }
    } catch (err) {
      toast.error('Gagal memperbarui bookmark');
    } finally {
      setBookmarkLoading(false);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: anime?.title || 'Nesiatv',
      text: `Nonton anime ${anime?.title} di Nesiatv!`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error(err);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link berhasil disalin ke clipboard!');
      } catch (err) {
        toast.error('Gagal menyalin link');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0f17] text-slate-100 pb-12 animate-pulse">
        {/* Top Navbar Skeleton */}
        <div className="bg-slate-950/90 border-b border-slate-800/80 py-2.5 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="w-9 h-9 bg-slate-800/80 rounded-xl" />
            <div className="w-9 h-9 bg-slate-800/80 rounded-xl" />
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="max-w-2xl mx-auto px-4 pt-6">
          {/* Poster Skeleton */}
          <div className="w-full max-w-sm aspect-[3/4] bg-slate-800/60 rounded-2xl mx-auto mb-6" />

          {/* Title Skeleton */}
          <div className="flex flex-col items-center gap-2 mb-6">
            <div className="h-7 w-3/4 bg-slate-800/80 rounded-lg" />
            <div className="h-4 w-1/2 bg-slate-800/50 rounded-md" />
          </div>

          {/* Action Buttons Skeleton */}
          <div className="space-y-3 max-w-md mx-auto mb-8">
            <div className="grid grid-cols-2 gap-3">
              <div className="h-12 bg-slate-800/70 rounded-2xl" />
              <div className="h-12 bg-slate-800/70 rounded-2xl" />
            </div>
            <div className="h-12 bg-slate-800/50 rounded-2xl" />
            <div className="h-12 bg-slate-800/50 rounded-2xl" />
            <div className="h-12 bg-slate-800/50 rounded-2xl" />
          </div>

          {/* Metadata Card Skeleton */}
          <div className="bg-[#131622] p-5 rounded-2xl border border-slate-800/80 mb-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3 w-16 bg-slate-800/60 rounded" />
                <div className="h-5 w-24 bg-slate-800/90 rounded" />
              </div>
            ))}
          </div>

          {/* Episodes List Skeleton */}
          <div className="mt-8 space-y-3">
            <div className="h-6 w-32 bg-slate-800/70 rounded mb-4" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-3.5 rounded-2xl bg-[#111420] border border-slate-800/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5 flex-1">
                  <div className="w-16 h-20 sm:w-20 sm:h-24 bg-slate-800/70 rounded-xl shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-3/4 bg-slate-800/80 rounded" />
                    <div className="h-3 w-1/3 bg-slate-800/50 rounded" />
                    <div className="h-3 w-1/2 bg-slate-800/40 rounded" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-slate-800/70 rounded-xl" />
                  <div className="w-9 h-9 bg-slate-800/70 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!anime) {
    return (
      <div className="flex h-96 items-center justify-center text-rose-500">
        Anime tidak ditemukan
      </div>
    );
  }

  // Determine First & Last Episodes
  const sortedEpisodes = anime.episodes && anime.episodes.length > 0
    ? [...anime.episodes].sort((a, b) => (a.episode_number || 0) - (b.episode_number || 0))
    : [];
  const firstEpisode = sortedEpisodes.length > 0 ? sortedEpisodes[0] : null;
  const lastEpisode = sortedEpisodes.length > 0 ? sortedEpisodes[sortedEpisodes.length - 1] : null;

  return (
    <div className="min-h-screen bg-[#0d0f17] text-slate-100 pb-12">
      <Helmet>
        <title>{`${anime.title} Sub Indo - Nesiatv`}</title>
        <meta name="description" content={anime.synopsis || `Nonton anime ${anime.title} sub indo gratis.`} />
      </Helmet>

      {/* Top Sub-Navbar (Back & Home Icons Only) */}
      <div className="bg-slate-950/90 border-b border-slate-800/80 backdrop-blur-md py-2.5 px-4 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Kembali"
            className="flex items-center justify-center text-slate-300 hover:text-white transition p-2 rounded-xl bg-slate-900/80 border border-slate-800 hover:bg-slate-800/80"
          >
            <ArrowLeft className="w-5 h-5 text-indigo-400" />
          </button>
          <Link
            to="/"
            aria-label="Beranda"
            className="flex items-center justify-center text-slate-300 hover:text-white transition p-2 rounded-xl bg-slate-900/80 border border-slate-800 hover:bg-slate-800/80"
          >
            <Home className="w-5 h-5 text-indigo-400" />
          </Link>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-2xl mx-auto px-4 pt-6 relative z-10">
        {/* Poster Image */}
        <div className="w-full max-w-sm mx-auto mb-6">
          <img 
            src={getImageUrl(anime.thumbnail)} 
            alt={anime.title} 
            className="w-full rounded-2xl shadow-2xl border border-slate-800/80 object-cover aspect-[3/4]"
          />
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-1.5 leading-snug">
            {anime.title}
          </h1>
          {anime.japanese_name && (
            <p className="text-sm text-slate-400 italic">
              {anime.japanese_name}
            </p>
          )}
        </div>

        {/* Action Buttons Section */}
        <div className="space-y-3 max-w-md mx-auto mb-8">
          {/* First & Last Episode Buttons */}
          <div className="grid grid-cols-2 gap-3">
            {firstEpisode ? (
              <Link
                to={`/watch/${firstEpisode.slug}`}
                onClick={(e) => handleEpisodeClick(e, firstEpisode)}
                className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl font-semibold text-white bg-gradient-to-br from-indigo-600 to-blue-700 hover:from-indigo-500 hover:to-blue-600 active:scale-[0.98] transition-all shadow-[0_8px_25px_rgba(79,70,229,0.35)] text-sm sm:text-base"
              >
                <Play className="w-4 h-4 fill-current shrink-0" />
                <span>FIRST EPISODE</span>
              </Link>
            ) : (
              <button
                disabled
                className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl font-semibold text-slate-400 bg-slate-800/50 cursor-not-allowed text-sm sm:text-base opacity-60"
              >
                <Play className="w-4 h-4 fill-current shrink-0" />
                <span>FIRST EPISODE</span>
              </button>
            )}

            {lastEpisode ? (
              <Link
                to={`/watch/${lastEpisode.slug}`}
                onClick={(e) => handleEpisodeClick(e, lastEpisode)}
                className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl font-semibold text-white bg-gradient-to-br from-indigo-600 to-blue-700 hover:from-indigo-500 hover:to-blue-600 active:scale-[0.98] transition-all shadow-[0_8px_25px_rgba(79,70,229,0.35)] text-sm sm:text-base"
              >
                <Play className="w-4 h-4 fill-current shrink-0" />
                <span>LAST EPISODE</span>
              </Link>
            ) : (
              <button
                disabled
                className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl font-semibold text-slate-400 bg-slate-800/50 cursor-not-allowed text-sm sm:text-base opacity-60"
              >
                <Play className="w-4 h-4 fill-current shrink-0" />
                <span>LAST EPISODE</span>
              </button>
            )}
          </div>

          {/* Bookmark Button */}
          <button
            onClick={handleBookmarkToggle}
            disabled={bookmarkLoading}
            className={`w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl font-semibold transition-all text-sm sm:text-base border ${
              isBookmarked
                ? 'bg-rose-600/90 hover:bg-rose-600 text-white border-rose-500/50 shadow-lg shadow-rose-900/30'
                : 'bg-[#151928] hover:bg-[#1c2236] text-slate-200 border-slate-800/80 shadow-md'
            }`}
          >
            <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-current' : ''}`} />
            <span>{isBookmarked ? 'Disimpan di bookmark' : 'Simpan bookmark'}</span>
          </button>

          {/* Playlist Button */}
          <button
            onClick={handlePlaylistClick}
            disabled={playlistLoading}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl font-semibold text-slate-200 bg-[#151928] hover:bg-[#1c2236] border border-slate-800/80 transition-all text-sm sm:text-base shadow-md"
          >
            <ListPlus className="w-5 h-5" />
            <span>Tambah ke playlist</span>
          </button>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl font-semibold text-slate-200 bg-[#151928] hover:bg-[#1c2236] border border-slate-800/80 transition-all text-sm sm:text-base shadow-md"
          >
            <Share2 className="w-5 h-5" />
            <span>Bagikan</span>
          </button>
        </div>

        {/* Anime Metadata Info Card */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6 text-sm text-slate-300 bg-[#131622] p-5 rounded-2xl border border-slate-800/80 mb-6">
          <div>
            <span className="text-slate-500 block text-xs uppercase font-semibold">Rating</span>
            <span className="text-amber-400 font-bold flex items-center gap-1 mt-0.5">
              <Star className="w-4 h-4 fill-current" />
              {parseFloat(anime.rating || 0).toFixed(1)} / 10
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-xs uppercase font-semibold">Status</span>
            <span className="text-white font-medium capitalize mt-0.5 block">{anime.status || '-'}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-xs uppercase font-semibold">Tipe</span>
            <span className="text-white font-medium uppercase mt-0.5 block">{anime.content_type || 'TV'}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-xs uppercase font-semibold">Studio</span>
            <span className="text-white font-medium truncate max-w-xs block mt-0.5">{anime.studio || '-'}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-xs uppercase font-semibold">Total Episode</span>
            <span className="text-white font-medium mt-0.5 block">{anime.total_episodes || '-'}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-xs uppercase font-semibold">Tahun Rilis</span>
            <span className="text-white font-medium mt-0.5 block">{anime.release || '-'}</span>
          </div>
        </div>

        {/* Genres */}
        {anime.genres && anime.genres.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6 justify-center">
            {anime.genres.map((g) => (
              <Link
                key={g.id}
                to={`/catalog?genre=${g.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#151928] hover:bg-[#1c2236] text-xs text-slate-300 transition border border-slate-800"
              >
                <Tag className="w-3.5 h-3.5 text-indigo-400" />
                {g.name}
              </Link>
            ))}
          </div>
        )}

        {/* Synopsis */}
        <div className="bg-[#131622] border border-slate-800/80 p-5 rounded-2xl mb-8">
          <h2 className="text-lg font-bold text-white mb-3 border-b border-slate-800 pb-2">Sinopsis</h2>
          <p className="text-slate-300 leading-relaxed text-sm whitespace-pre-line">
            {anime.synopsis || 'Tidak ada sinopsis untuk anime ini.'}
          </p>
        </div>

        {/* Episodes List */}
        <div className="mt-8 space-y-3">
          <h2 className="text-lg font-bold text-white mb-4 px-1">Daftar Episode</h2>
          {anime.episodes && anime.episodes.length > 0 ? (
            <div className="flex flex-col gap-3">
              {anime.episodes.map((ep, idx) => {
                const isEpLocked = isLockedValue(ep.requires_login) || isLockedValue(anime.requires_login);
                const isLatest = idx === 0 || ep.is_latest || ep.episode_number === anime.total_episodes;
                return (
                  <div
                    key={ep.id}
                    className="relative flex items-center justify-between p-3.5 rounded-2xl bg-[#111420] hover:bg-[#161a29] border border-slate-800/80 transition-all shadow-md group"
                  >
                    <Link
                      to={`/watch/${ep.slug}`}
                      onClick={(e) => handleEpisodeClick(e, ep)}
                      className="flex items-center gap-3.5 min-w-0 flex-1 pr-3"
                    >
                      {/* Episode / Anime Thumbnail */}
                      <div className="relative w-16 h-20 sm:w-20 sm:h-24 shrink-0 rounded-xl overflow-hidden bg-slate-900 border border-slate-800">
                        <img
                          src={getImageUrl(ep.thumbnail || anime.thumbnail)}
                          alt={ep.title || `Episode ${ep.episode_number}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {isEpLocked && (
                          <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex items-center justify-center">
                            <Lock className="w-5 h-5 text-amber-400" />
                          </div>
                        )}
                      </div>

                      {/* Episode Info */}
                      <div className="flex flex-col min-w-0">
                        <h3 className="font-bold text-sm sm:text-base text-slate-100 group-hover:text-indigo-400 transition truncate leading-snug">
                          Episode {ep.episode_number || ep.number || idx + 1}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                          {ep.release_time || ep.created_at ? (
                            <span>{ep.release_time || 'Baru saja'}</span>
                          ) : (
                            <span>Terbaru</span>
                          )}
                        </p>

                        <div className="flex flex-col gap-1 text-xs text-slate-400 mt-2">
                          <span className="flex items-center gap-1.5">
                            <Eye className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{ep.views || Math.floor(Math.random() * 300) + 40} lihat</span>
                          </span>
                          <span className="flex items-center gap-1.5 text-amber-400/90 font-medium">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>{ep.reactions || Math.floor(Math.random() * 40) + 5} reaksi</span>
                          </span>
                        </div>
                      </div>
                    </Link>

                    {/* Right Controls: UP Badge, Download, Play */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      {isLatest && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white font-extrabold text-[10px] sm:text-xs uppercase tracking-wide shadow-sm">
                          UP
                        </span>
                      )}

                      <Link
                        to={`/watch/${ep.slug}`}
                        onClick={(e) => handleEpisodeClick(e, ep)}
                        title="Download / Watch"
                        className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
                      >
                        <Download className="w-5 h-5" />
                      </Link>

                      <Link
                        to={`/watch/${ep.slug}`}
                        onClick={(e) => handleEpisodeClick(e, ep)}
                        title="Putar Episode"
                        className="p-2.5 rounded-xl bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 transition group-hover:scale-105 active:scale-95"
                      >
                        <Play className="w-5 h-5 fill-current" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-slate-400 text-center py-8 text-sm bg-[#111420] rounded-2xl border border-slate-800">
              Belum ada episode yang tersedia.
            </div>
          )}
        </div>

        {/* Comments section */}
        <div className="mt-8">
          <CommentSection animeId={anime.id} />
        </div>

      </div>

      {/* Login Modal */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
      />
    </div>
  );
};

export default AnimeDetail;
