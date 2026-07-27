import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Heart, MessageSquare, Play, Star, Tag, Eye } from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL, apiClient, getImageUrl } from '../utils/api';
import CommentSection from '../components/CommentSection';

const AnimeDetail = () => {
  const { slug } = useParams();
  const { user, isAuthenticated } = useAuth();
  const [anime, setAnime] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

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

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center text-slate-400">
        Memuat detail anime...
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

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pb-12">
      <Helmet>
        <title>{`${anime.title} Sub Indo - Nesiatv`}</title>
        <meta name="description" content={anime.synopsis || `Nonton anime ${anime.title} sub indo gratis.`} />
      </Helmet>

      {/* Banner / Cover Background */}
      <div 
        className="relative h-64 md:h-96 w-full bg-cover bg-center"
        style={{ backgroundImage: `url(${getImageUrl(anime.cover_background || anime.thumbnail)})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
      </div>

      {/* Detail Content */}
      <div className="max-w-7xl mx-auto px-4 -mt-20 md:-mt-32 relative z-10">
        <div className="flex flex-col md:flex-row gap-8">
          
          {/* Cover Art */}
          <div className="w-48 md:w-64 flex-shrink-0 mx-auto md:mx-0">
            <img 
              src={getImageUrl(anime.thumbnail)} 
              alt={anime.title} 
              className="w-full rounded-lg shadow-2xl border border-slate-700 object-cover aspect-[3/4]"
            />
            <button
              onClick={handleBookmarkToggle}
              disabled={bookmarkLoading}
              className={`w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                isBookmarked 
                  ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
            >
              <Heart className={`w-5 h-5 ${isBookmarked ? 'fill-current' : ''}`} />
              {isBookmarked ? 'Bookmarked' : 'Simpan Ke Library'}
            </button>
          </div>

          {/* Info Details */}
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-wrap justify-center md:justify-start items-center gap-3 mb-2">
              <span className="bg-indigo-600 text-xs px-2.5 py-1 rounded font-semibold tracking-wider uppercase">
                {anime.content_type || 'TV'}
              </span>
              <span className={`text-xs px-2.5 py-1 rounded font-semibold uppercase ${
                anime.status === 'completed' ? 'bg-emerald-600' : 'bg-amber-600'
              }`}>
                {anime.status}
              </span>
              <span className="flex items-center gap-1 text-amber-400 bg-slate-800/80 px-2 py-0.5 rounded text-sm">
                <Star className="w-4 h-4 fill-current" />
                {parseFloat(anime.rating || 0).toFixed(2)}
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2 leading-tight">
              {anime.title}
            </h1>
            <p className="text-sm text-slate-400 italic mb-6">
              {anime.japanese_name}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6 text-sm text-slate-300 bg-slate-800/50 p-6 rounded-xl border border-slate-800 mb-6">
              <div>
                <span className="text-slate-500 block text-xs uppercase font-semibold">Studio</span>
                <span className="text-white font-medium">{anime.studio || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs uppercase font-semibold">Produser</span>
                <span className="text-white font-medium truncate max-w-xs block">{anime.producer || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs uppercase font-semibold">Durasi</span>
                <span className="text-white font-medium">{anime.duration || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs uppercase font-semibold">Total Episode</span>
                <span className="text-white font-medium">{anime.total_episodes || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs uppercase font-semibold">Rilis Perdana</span>
                <span className="text-white font-medium">{anime.release_date || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs uppercase font-semibold">Tahun Rilis</span>
                <span className="text-white font-medium">{anime.release || '-'}</span>
              </div>
            </div>

            {/* Genres */}
            <div className="flex flex-wrap gap-2 mb-8 justify-center md:justify-start">
              {anime.genres?.map((g) => (
                <Link
                  key={g.id}
                  to={`/catalog?genre=${g.id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition border border-slate-700"
                >
                  <Tag className="w-3.5 h-3.5" />
                  {g.name}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Synopsis */}
        <div className="mt-12 bg-slate-800/30 border border-slate-800/60 p-6 rounded-xl">
          <h2 className="text-xl font-bold text-white mb-4 border-b border-slate-800 pb-2">Sinopsis</h2>
          <p className="text-slate-300 leading-relaxed text-sm whitespace-pre-line">
            {anime.synopsis || 'Tidak ada sinopsis untuk anime ini.'}
          </p>
        </div>

        {/* Episodes List */}
        <div className="mt-8 bg-slate-800/30 border border-slate-800/60 p-6 rounded-xl">
          <h2 className="text-xl font-bold text-white mb-4 border-b border-slate-800 pb-2">Daftar Episode</h2>
          {anime.episodes && anime.episodes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {anime.episodes.map((ep) => (
                <Link
                  key={ep.id}
                  to={`/watch/${ep.slug}`}
                  className="flex items-center justify-between p-3.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white transition border border-slate-700/50"
                >
                  <div className="flex flex-col truncate pr-2">
                    <span className="font-semibold text-sm truncate">{ep.title}</span>
                    <span className="text-xs text-slate-400">Episode {ep.episode_number}</span>
                  </div>
                  <Play className="w-5 h-5 text-indigo-500 fill-current flex-shrink-0" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-slate-400 text-center py-6 text-sm">
              Belum ada episode yang tersedia.
            </div>
          )}
        </div>

        {/* Comments section */}
        <div className="mt-8">
          <CommentSection animeId={anime.id} />
        </div>

      </div>
    </div>
  );
};

export default AnimeDetail;
