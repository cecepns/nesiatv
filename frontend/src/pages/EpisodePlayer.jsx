import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Play, List, ChevronLeft, ChevronRight, Share2, Server } from 'lucide-react';
import { toast } from 'react-toastify';
import { API_BASE_URL, getImageUrl } from '../utils/api';
import CommentSection from '../components/CommentSection';

const EpisodePlayer = () => {
  const { episodeSlug } = useParams();
  const navigate = useNavigate();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState(null);

  useEffect(() => {
    const fetchEpisode = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/v/${episodeSlug}`);
        const json = await res.json();
        
        if (json.status && json.data) {
          setData(json.data);
          // Set default/first video source as active
          if (json.data.videos && json.data.videos.length > 0) {
            setActiveVideo(json.data.videos[0]);
          } else {
            setActiveVideo(null);
          }
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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400">
        Memuat episode dan streaming link...
      </div>
    );
  }

  if (!data || !data.content) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-rose-500">
        Episode tidak ditemukan
      </div>
    );
  }

  const { content, episodes, videos, number } = data;

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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-12">
      <Helmet>
        <title>{`Nonton ${content.title} Episode ${number} Sub Indo - Nesiatv`}</title>
      </Helmet>

      {/* Top Navigation / Breadcrumbs */}
      <div className="bg-slate-900 border-b border-slate-800 py-3 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link 
            to={`/anime/${content.slug}`} 
            className="flex items-center gap-2 text-slate-400 hover:text-white transition text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Detail Anime</span>
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
            <div className="relative aspect-video w-full bg-black rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
              {activeVideo ? (
                activeVideo.url.includes('iframe') || activeVideo.url.startsWith('http') ? (
                  <iframe
                    src={activeVideo.url}
                    className="w-full h-full"
                    allowFullScreen
                    scrolling="no"
                    frameBorder="0"
                    allow="autoplay; encrypted-media"
                  />
                ) : (
                  <video 
                    src={activeVideo.url} 
                    controls 
                    className="w-full h-full"
                    poster={getImageUrl(content.cover)}
                  />
                )
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-2 p-6 text-center">
                  <Play className="w-12 h-12 text-slate-700 animate-pulse" />
                  <p className="text-sm font-medium">Link video/mirror belum disiapkan.</p>
                  <p className="text-xs text-slate-600">Silakan pilih server lain jika tersedia.</p>
                </div>
              )}
            </div>

            {/* Server / Quality Selector Box */}
            <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-xl">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Server className="w-4 h-4 text-indigo-500" />
                Pilih Server & Kualitas Streaming
              </h3>
              {videos && videos.length > 0 ? (
                <div className="flex flex-wrap gap-2.5">
                  {videos.map((vid) => (
                    <button
                      key={vid.id}
                      onClick={() => setActiveVideo(vid)}
                      className={`px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wide uppercase transition border ${
                        activeVideo && activeVideo.id === vid.id
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                          : 'bg-slate-800 border-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white'
                      }`}
                    >
                      {vid.server} ({vid.quality})
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">Tidak ada server link alternatif.</p>
              )}
            </div>

            {/* Episode Navigation & Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => prevEpisode && navigate(`/watch/${prevEpisode.slug}`)}
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
                  onClick={() => nextEpisode && navigate(`/watch/${nextEpisode.slug}`)}
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

            {/* Comments */}
            <div className="mt-4">
              <CommentSection animeId={content.id} />
            </div>

          </div>

          {/* Right Area: Playlist / Sidebar Episodes */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            
            {/* Mini Anime Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex gap-4">
              <img 
                src={getImageUrl(content.cover)} 
                alt={content.title} 
                className="w-16 h-20 rounded object-cover aspect-[3/4]"
              />
              <div className="flex flex-col justify-center truncate">
                <Link to={`/anime/${content.slug}`} className="font-bold text-white text-sm hover:text-indigo-400 transition truncate">
                  {content.title}
                </Link>
                <span className="text-xs text-slate-400 mt-1 capitalize">{content.content_type || 'TV'} Series</span>
                <span className="text-xs text-slate-500 mt-0.5">Rating: {parseFloat(content.rating || 0).toFixed(1)}</span>
              </div>
            </div>

            {/* Playlist Sidebar */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col max-h-[600px]">
              <div className="bg-slate-800/50 p-4 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <List className="w-4 h-4 text-indigo-500" />
                  Semua Episode
                </span>
                <span className="text-xs text-slate-500 font-semibold">{episodes.length} Eps</span>
              </div>
              <div className="overflow-y-auto flex-1 divide-y divide-slate-800/60 custom-scrollbar">
                {sortedEpisodes.map((ep) => (
                  <Link
                    key={ep.id}
                    to={`/watch/${ep.slug}`}
                    className={`flex items-center justify-between p-3.5 transition text-xs font-medium ${
                      ep.slug === episodeSlug
                        ? 'bg-indigo-600/10 text-indigo-400 border-l-2 border-indigo-500'
                        : 'hover:bg-slate-800/50 text-slate-300 hover:text-white'
                    }`}
                  >
                    <span className="truncate pr-2">{ep.title}</span>
                    <span className="text-[10px] text-slate-500 flex-shrink-0">Eps {ep.number}</span>
                  </Link>
                ))}
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};

export default EpisodePlayer;
