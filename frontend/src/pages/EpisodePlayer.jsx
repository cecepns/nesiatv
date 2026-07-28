import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  ArrowLeft, 
  Play, 
  List, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  Share2, 
  Server, 
  Download, 
  ExternalLink,
  Lock,
  LogIn,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { toast } from 'react-toastify';
import { API_BASE_URL, apiClient, getImageUrl } from '../utils/api';
import LazyImage from '../components/LazyImage';
import CommentSection from '../components/CommentSection';
import { useAuth } from '../contexts/AuthContext';
import LoginModal from '../components/LoginModal';
import { REACTION_OPTIONS, emptyReactionCounts } from '../constants/reactions';

const EpisodePlayer = () => {
  const { episodeSlug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [selectedDownloadId, setSelectedDownloadId] = useState('');
  const [reactionCounts, setReactionCounts] = useState(emptyReactionCounts);
  const [userReaction, setUserReaction] = useState(null);

  useEffect(() => {
    if (!episodeSlug) return;
    apiClient.getEpisodeReactions(episodeSlug).then((res) => {
      if (res?.status && res?.data) {
        setReactionCounts(res.data.counts || emptyReactionCounts());
        setUserReaction(res.data.user_reaction || null);
      }
    }).catch(() => {});
  }, [episodeSlug]);

  const handleVote = async (reactionType) => {
    if (!isAuthenticated) {
      toast.warning('Silakan login terlebih dahulu untuk memberikan reaksi');
      setLoginModalOpen(true);
      return;
    }
    try {
      const res = await apiClient.submitEpisodeReaction(episodeSlug, reactionType);
      if (res?.status && res?.data) {
        setReactionCounts(res.data.counts || emptyReactionCounts());
        setUserReaction(res.data.user_reaction || null);
        toast.success('Reaksi berhasil disimpan!');
      }
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengirim reaksi');
    }
  };

  const videos = data?.videos || [];
  const downloadVideos = (videos || []).filter(v => v.quality?.includes('Download') || v.url?.includes('link.desustream.com'));

  useEffect(() => {
    const fetchEpisode = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/v/${episodeSlug}`);
        const json = await res.json();
        
        if (json.status && json.data) {
          setData(json.data);
          // Set default/first video source that is NOT a download link as active video
          const videoList = json.data.videos || [];
          const firstStream = videoList.find(v => !v.quality?.includes('Download') && !v.url?.includes('link.desustream.com')) || videoList[0];
          setActiveVideo(firstStream || null);
        } else {
          toast.error(json.error || 'Gagal memuat episode');
        }
      } catch (err) {
        console.error(err);
        toast.error('Gagal memuat detail episode');
      } finally {
        setLoading(false);
      }
    };
    fetchEpisode();
  }, [episodeSlug]);

  useEffect(() => {
    if (downloadVideos.length > 0 && (!selectedDownloadId || !downloadVideos.some(v => String(v.id) === String(selectedDownloadId)))) {
      setSelectedDownloadId(downloadVideos[0].id);
    }
  }, [downloadVideos, selectedDownloadId]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium">Memuat episode dan streaming link...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-rose-500 font-medium">
        Episode tidak ditemukan
      </div>
    );
  }

  // Format content object safely
  const content = {
    id: data.anime_id || data.content?.id || data.anime?.id,
    title: data.anime_title || data.title || data.content?.title || data.anime?.title,
    slug: data.anime_slug || data.content?.slug || data.anime?.slug || data.slug,
    cover: data.anime_cover || data.cover || data.thumbnail || data.cover_background || data.content?.cover,
    synopsis: data.anime_synopsis || data.content?.synopsis,
    content_type: data.content_type || data.content?.content_type,
    rating: data.rating || data.content?.rating,
  };

  const episodes = data.all_episodes || data.episodes || [];
  const number = data.number || data.episode_number;

  const isLockedVal = (v) => v === true || v === 1 || v === '1' || v === 'true';

  // Check login requirement (from episode or parent anime)
  const requiresLogin = isLockedVal(data.requires_login) || isLockedVal(data.episode_requires_login) || isLockedVal(data.anime_requires_login);
  const isLockedForUser = requiresLogin && !isAuthenticated;

  // Separate stream videos
  const streamVideos = (videos || []).filter(v => !v.quality?.includes('Download') && !v.url?.includes('link.desustream.com'));

  // Sorting helper for navigation
  const sortedEpisodes = [...episodes].sort((a, b) => parseFloat(a.number) - parseFloat(b.number));
  const currentIndex = sortedEpisodes.findIndex(ep => ep.slug === episodeSlug);
  const prevEpisode = currentIndex > 0 ? sortedEpisodes[currentIndex - 1] : null;
  const nextEpisode = currentIndex < sortedEpisodes.length - 1 ? sortedEpisodes[currentIndex + 1] : null;

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link video berhasil disalin!');
    } catch {
      toast.error('Gagal menyalin tautan');
    }
  };

  const handleEpisodeClick = (e, ep) => {
    const isEpLocked = isLockedVal(ep.requires_login) || isLockedVal(data.anime_requires_login);
    if (isEpLocked && !isAuthenticated) {
      e.preventDefault();
      toast.info('Episode ini wajib login. Silakan login terlebih dahulu untuk menonton.');
      setLoginModalOpen(true);
    }
  };

  // Function to switch to next available server automatically or manually
  const handleNextServer = () => {
    if (streamVideos.length <= 1) {
      toast.error('Tidak ada server alternatif lain yang tersedia.');
      return;
    }
    const currentIdx = streamVideos.findIndex(v => String(v.id) === String(activeVideo?.id));
    const nextIdx = (currentIdx + 1) % streamVideos.length;
    const nextServer = streamVideos[nextIdx];
    setActiveVideo(nextServer);
    toast.info(`Mencoba berpindah ke ${nextServer.server} (${nextServer.quality})`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-12">
      <Helmet>
        <title>{`Nonton ${content.title} Episode ${number} Sub Indo - Nesiatv`}</title>
      </Helmet>

      {/* Top Navigation / Breadcrumbs */}
      <div className="bg-slate-900 border-b border-slate-800 py-3 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link 
            to={content.slug ? `/anime/${content.slug}` : '/'} 
            className="flex items-center gap-2 text-slate-400 hover:text-white transition text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{content.slug ? 'Kembali ke Detail Anime' : 'Kembali ke Beranda'}</span>
          </Link>
          <div className="text-xs text-slate-500 font-semibold tracking-wider uppercase hidden sm:block">
            {content.title} — Episode {number}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Left Area: Player & Sources */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            
            {/* Streaming Container */}
            <div className="relative aspect-video w-full bg-black rounded-xl overflow-hidden border border-slate-800 shadow-2xl group">
              {isLockedForUser ? (
                /* Locked State Player Overlay */
                <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-10 border border-amber-500/20">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-lg shadow-amber-500/10">
                    <Lock className="w-8 h-8" />
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2">Episode Ini Wajib Login</h2>
                  <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
                    Episode ini hanya dapat ditonton oleh pengguna yang sudah terdaftar. Silakan login atau daftar akun gratis untuk mengakses video.
                  </p>
                  <button
                    onClick={() => setLoginModalOpen(true)}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold px-7 py-3 rounded-xl shadow-lg shadow-amber-500/20 transition-all hover:scale-105"
                  >
                    <LogIn className="w-5 h-5" />
                    <span>Login untuk Menonton</span>
                  </button>
                </div>
              ) : activeVideo ? (
                <>
                  <iframe
                    key={activeVideo.id}
                    src={activeVideo.url}
                    className="absolute inset-0 w-full h-full border-0"
                    allowFullScreen
                    scrolling="no"
                    allow="autoplay; encrypted-media; fullscreen"
                  />
                  {streamVideos.length > 1 && (
                    <button
                      onClick={handleNextServer}
                      className="absolute top-3 right-3 z-20 bg-slate-950/80 hover:bg-indigo-600 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold backdrop-blur-md border border-slate-700/80 transition flex items-center gap-1.5 shadow-lg"
                      title="Video bermasalah? Ganti server"
                    >
                      <Server className="w-3.5 h-3.5" />
                      <span>Ganti Server Saja</span>
                    </button>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-2">
                  <Play className="w-12 h-12 text-slate-700 animate-pulse" />
                  <p className="text-sm font-medium">Pilih server untuk mulai menonton</p>
                </div>
              )}
            </div>

            {/* Server / Quality Selector Box & Download Links */}
            <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex flex-col gap-5 shadow-xl">
              {/* Stream Servers Dropdown */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Server className="w-4 h-4 text-indigo-400" />
                    Pilih Server & Resolusi Streaming
                  </h3>
                  {streamVideos.length > 1 && !isLockedForUser && (
                    <button
                      onClick={handleNextServer}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-4"
                    >
                      Bermasalah? Switch Server Auto
                    </button>
                  )}
                </div>
                {isLockedForUser ? (
                  <p className="text-xs text-amber-400/90 flex items-center gap-1.5 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    Server streaming dikunci. Silakan login terlebih dahulu untuk mengakses pilihan server.
                  </p>
                ) : streamVideos.length > 0 ? (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="relative flex-1">
                      <select
                        value={activeVideo?.id || ''}
                        onChange={(e) => {
                          const selected = streamVideos.find(v => String(v.id) === e.target.value);
                          if (selected) setActiveVideo(selected);
                        }}
                        className="w-full bg-slate-800 hover:bg-slate-750 border border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-white text-xs font-semibold py-3 px-4 pr-10 rounded-xl appearance-none cursor-pointer outline-none transition shadow-sm"
                      >
                        {streamVideos.map((vid) => (
                          <option key={vid.id} value={vid.id} className="bg-slate-900 text-slate-200">
                            {vid.server} — {vid.quality}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Tidak ada server streaming alternatif.</p>
                )}
              </div>

              {/* Download Section Dropdown */}
              {downloadVideos.length > 0 && (
                <div className="pt-4 border-t border-slate-800/80">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Download className="w-4 h-4 text-emerald-400" />
                    Link Download Episode
                  </h3>
                  {isLockedForUser ? (
                    <p className="text-xs text-amber-400/90 flex items-center gap-1.5 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                      <Lock className="w-4 h-4 shrink-0" />
                      Link download dikunci. Silakan login untuk membuka link download episode.
                    </p>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                      <div className="relative flex-1">
                        <select
                          value={selectedDownloadId}
                          onChange={(e) => setSelectedDownloadId(e.target.value)}
                          className="w-full bg-slate-800 hover:bg-slate-750 border border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-white text-xs font-semibold py-3 px-4 pr-10 rounded-xl appearance-none cursor-pointer outline-none transition shadow-sm"
                        >
                          {downloadVideos.map((vid) => (
                            <option key={vid.id} value={vid.id} className="bg-slate-900 text-slate-200">
                              {vid.server} ({vid.quality.replace('[Download]', '').trim()})
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                      <a
                        href={downloadVideos.find(v => String(v.id) === String(selectedDownloadId))?.url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-5 py-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shrink-0 shadow-lg shadow-emerald-600/20 hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <span>Download Sekarang</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>



            {/* Episode Navigation & Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    if (prevEpisode) {
                      handleEpisodeClick(e, prevEpisode);
                      if (!Boolean(prevEpisode.requires_login || data.anime_requires_login) || isAuthenticated) {
                        navigate(`/watch/${prevEpisode.slug}`);
                      }
                    }
                  }}
                  disabled={!prevEpisode}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition ${
                    prevEpisode 
                      ? 'bg-slate-800 hover:bg-slate-700 text-white' 
                      : 'bg-slate-800/40 text-slate-600 cursor-not-allowed'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Prev
                </button>
                <button
                  onClick={(e) => {
                    if (nextEpisode) {
                      handleEpisodeClick(e, nextEpisode);
                      if (!Boolean(nextEpisode.requires_login || data.anime_requires_login) || isAuthenticated) {
                        navigate(`/watch/${nextEpisode.slug}`);
                      }
                    }
                  }}
                  disabled={!nextEpisode}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition ${
                    nextEpisode 
                      ? 'bg-slate-800 hover:bg-slate-700 text-white' 
                      : 'bg-slate-800/40 text-slate-600 cursor-not-allowed'
                  }`}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={handleShare}
                className="flex items-center gap-2 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-400 px-4 py-2 rounded-lg text-xs font-bold transition"
              >
                <Share2 className="w-4 h-4" />
                Bagikan Video
              </button>
            </div>

          </div>

          {/* Right Area: Mini Info & Number-only Episode Grid */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            
            {/* Mini Anime Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex gap-4">
              <LazyImage 
                src={getImageUrl(content.cover)} 
                alt={content.title} 
                className="w-16 h-20 rounded object-cover aspect-[3/4]"
                wrapperClassName="w-16 h-20 shrink-0"
              />
              <div className="flex flex-col justify-center truncate">
                <Link to={content.slug ? `/anime/${content.slug}` : '/'} className="font-bold text-white text-sm hover:text-indigo-400 transition truncate">
                  {content.title}
                </Link>
                <span className="text-xs text-slate-400 mt-1 capitalize">{content.content_type || 'TV'} Series</span>
                <span className="text-xs text-slate-500 mt-0.5">Rating: {parseFloat(content.rating || 0).toFixed(1)}</span>
              </div>
            </div>

            {/* Episode Grid (Number Only) */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col max-h-[600px]">
              <div className="bg-slate-800/50 p-4 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <List className="w-4 h-4 text-indigo-500" />
                  Daftar Episode
                </span>
                <span className="text-xs text-slate-500 font-semibold">{episodes.length} Eps</span>
              </div>
              <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-4 gap-2">
                  {sortedEpisodes.map((ep) => {
                    const epLocked = Boolean(ep.requires_login || data.anime_requires_login);
                    const isActive = ep.slug === episodeSlug;
                    return (
                      <Link
                        key={ep.id}
                        to={`/watch/${ep.slug}`}
                        onClick={(e) => handleEpisodeClick(e, ep)}
                        title={ep.title || `Episode ${ep.number}`}
                        className={`relative flex items-center justify-center h-10 rounded-lg text-xs font-bold transition border ${
                          isActive
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                            : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700/60'
                        }`}
                      >
                        {epLocked && (
                          <Lock className="w-2.5 h-2.5 text-amber-400 absolute top-1 right-1" />
                        )}
                        <span>{ep.number}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Section Reaksi & Komentar Paling Bawah */}
        <div className="mt-12 pt-8 border-t border-slate-800/80 space-y-8">
          {/* Reaction Section */}
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 max-w-xl mx-auto">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2 justify-center">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Reaksi Episode Ini
            </h3>
            <div className="flex flex-wrap items-center justify-around gap-2">
              {REACTION_OPTIONS.map((opt) => {
                const count = reactionCounts[opt.id] || 0;
                const isUserSelected = userReaction === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleVote(opt.id)}
                    className={`flex flex-col items-center p-2.5 rounded-xl border transition-all duration-200 ${
                      isUserSelected
                        ? 'border-indigo-500 bg-indigo-600/20 text-white scale-105 shadow-md shadow-indigo-600/30'
                        : 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700 hover:bg-slate-800/60'
                    }`}
                  >
                    <img src={opt.image} alt={opt.label} className="w-8 h-8 object-contain mb-1" />
                    <span className="text-[11px] font-semibold">{opt.label}</span>
                    <span className="text-[10px] text-slate-400 font-bold">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <CommentSection animeId={content.id} />
        </div>

      </div>

      <LoginModal 
        open={loginModalOpen} 
        onClose={() => setLoginModalOpen(false)}
        title="Wajib Login"
        description="Silakan login terlebih dahulu untuk menonton episode ini."
      />
    </div>
  );
};

export default EpisodePlayer;
