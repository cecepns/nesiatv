import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Lock,
  Unlock,
  Bookmark,
  Share2,
  List,
  ChevronLeft,
  ChevronRight,
  Gauge,
  ThumbsUp,
  X,
  ArrowLeft,
  MoreVertical,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { getImageUrl } from '../utils/api';

const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.m3u8', '.mkv', '.avi', '.mov'];

export default function CustomVideoPlayer({
  activeVideo,
  streamVideos = [],
  onSelectVideo,
  episodes = [],
  currentEpisodeSlug,
  onSelectEpisode,
  prevEpisode,
  nextEpisode,
  onNavigateEpisode,
  coverImage,
  title,
  episodeNumber,
  animeSlug,
}) {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const videoRef = useRef(null);

  // Player states
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  // Menus
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showResMenu, setShowResMenu] = useState(false);
  const [showEpListDrawer, setShowEpListDrawer] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Visual
  const [skipAnimation, setSkipAnimation] = useState(null);

  const controlsTimeoutRef = useRef(null);
  const isPlayingRef = useRef(false);

  // Detect if this is a direct video file or an embed iframe
  const urlPath = activeVideo?.url ? activeVideo.url.toLowerCase().split('?')[0] : '';
  const isDirectVideo = activeVideo?.url && VIDEO_EXTENSIONS.some((ext) => urlPath.endsWith(ext));
  const isEmbed = activeVideo?.url && !isDirectVideo;

  // ── Sync isPlayingRef ──
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // ── Fullscreen listener ──
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(
        Boolean(document.fullscreenElement || document.webkitFullscreenElement)
      );
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, []);

  // ── Auto-hide controls ──
  const hideControls = useCallback(() => {
    setControlsVisible(false);
    setShowSpeedMenu(false);
    setShowResMenu(false);
    setShowMoreMenu(false);
  }, []);

  const scheduleHide = useCallback(() => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      // For embeds: always hide after timeout (we can't detect play state)
      // For direct video: only hide if video is playing
      if (isEmbed || isPlayingRef.current) {
        hideControls();
      }
    }, 3000);
  }, [isEmbed, hideControls]);

  const handleInteraction = useCallback(() => {
    setControlsVisible(true);
    scheduleHide();
  }, [scheduleHide]);

  // For direct video: react to play/pause state changes
  useEffect(() => {
    if (isEmbed) return; // embed handles its own hide via timeout
    if (isPlaying) {
      scheduleHide();
    } else {
      setControlsVisible(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    }
  }, [isPlaying, isEmbed, scheduleHide]);

  // Start auto-hide timer on mount for embeds
  useEffect(() => {
    if (isEmbed) {
      scheduleHide();
    }
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isEmbed, scheduleHide]);

  // ── HTML5 Video handlers ──
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || 0);
    }
  };

  const togglePlay = useCallback(() => {
    if (isLocked || !videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  }, [isLocked]);

  const handleSeek = (e) => {
    if (isLocked || !videoRef.current) return;
    const t = parseFloat(e.target.value);
    videoRef.current.currentTime = t;
    setCurrentTime(t);
  };

  const skipTime = (seconds) => {
    if (isLocked || !videoRef.current) return;
    videoRef.current.currentTime = Math.min(
      Math.max(0, videoRef.current.currentTime + seconds),
      duration || 9999
    );
    setCurrentTime(videoRef.current.currentTime);
    setSkipAnimation(seconds > 0 ? 'forward' : 'backward');
    setTimeout(() => setSkipAnimation(null), 700);
  };

  const toggleMute = () => {
    if (isLocked || !videoRef.current) return;
    if (isMuted) {
      videoRef.current.volume = volume || 1;
      setIsMuted(false);
    } else {
      videoRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const changeSpeed = (speed) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) videoRef.current.playbackRate = speed;
    setShowSpeedMenu(false);
    toast.info(`Kecepatan: ${speed}x`);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      (containerRef.current.requestFullscreen || containerRef.current.webkitRequestFullscreen)?.call(containerRef.current);
    } else {
      (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link episode disalin!');
    } catch {
      toast.error('Gagal menyalin link');
    }
  };

  const handleToggleSave = () => {
    setSaved((p) => !p);
    toast.success(saved ? 'Dihapus dari simpanan' : 'Episode disimpan!');
  };

  const handleToggleLike = () => {
    setLiked((p) => !p);
    toast.success(liked ? 'Dislike' : 'Liked!');
  };

  const fmt = (s) => {
    if (isNaN(s)) return '00:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m < 10 ? '0' : ''}${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  // Close all menus helper
  const closeMenus = () => {
    setShowSpeedMenu(false);
    setShowResMenu(false);
    setShowMoreMenu(false);
  };

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      onMouseMove={handleInteraction}
      onTouchStart={handleInteraction}
      onClick={(e) => {
        // Click on the container background (not buttons) toggles controls for embed, or play for video
        if (e.target === containerRef.current) {
          if (isEmbed) {
            setControlsVisible((v) => !v);
          }
        }
      }}
      className="relative aspect-video w-full bg-black rounded-xl overflow-hidden shadow-2xl select-none"
      style={{ isolation: 'isolate' }}
    >
      {/* ═══ Media Layer ═══ */}
      {activeVideo ? (
        isEmbed ? (
          /* IFRAME EMBED — let the embed handle its own playback, NO native controls duplication */
          <iframe
            src={activeVideo.url}
            className="absolute inset-0 w-full h-full border-0"
            style={{ zIndex: 1 }}
            allowFullScreen
            scrolling="no"
            allow="autoplay; encrypted-media; fullscreen"
          />
        ) : (
          /* HTML5 VIDEO — we fully control this */
          <video
            ref={videoRef}
            src={activeVideo.url}
            poster={coverImage ? getImageUrl(coverImage) : undefined}
            className="absolute inset-0 w-full h-full object-contain"
            style={{ zIndex: 1 }}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={() => {
              if (videoRef.current) setDuration(videoRef.current.duration || 0);
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            onClick={togglePlay}
            playsInline
          />
        )
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-2 p-6 text-center" style={{ zIndex: 1 }}>
          <Play className="w-12 h-12 text-slate-700 animate-pulse" />
          <p className="text-sm font-medium">Link video/mirror belum disiapkan.</p>
        </div>
      )}

      {/* ═══ Skip Animation Popup ═══ */}
      {skipAnimation && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" style={{ zIndex: 60 }}>
          <div className="bg-black/75 border border-white/20 text-white px-6 py-3.5 rounded-2xl flex items-center gap-3 backdrop-blur-md animate-bounce shadow-2xl">
            {skipAnimation === 'forward' ? (
              <>
                <span className="font-bold text-lg">+10s</span>
                <RotateCw className="w-6 h-6 text-indigo-400" />
              </>
            ) : (
              <>
                <RotateCcw className="w-6 h-6 text-indigo-400" />
                <span className="font-bold text-lg">-10s</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══ Lock Screen ═══ */}
      {isLocked && (
        <div className="absolute inset-0 bg-black/40 flex items-end justify-start p-6 backdrop-blur-[2px]" style={{ zIndex: 70 }}>
          <button
            onClick={() => {
              setIsLocked(false);
              toast.info('Layar Di-unlock 🔓');
            }}
            className="bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-white p-3 rounded-2xl shadow-2xl backdrop-blur-md transition-all hover:scale-105 flex items-center gap-2 text-xs font-bold"
          >
            <Lock className="w-5 h-5 text-amber-400" />
            <span>KUNCI AKTIF (Klik Buka)</span>
          </button>
        </div>
      )}

      {/* ═══ Controls Overlay ═══ */}
      {!isLocked && !showEpListDrawer && (
        <div
          className={`absolute inset-0 flex flex-col justify-between transition-opacity duration-300 ${
            controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          style={{ zIndex: 30 }}
        >
          {/* ── TOP BAR ── */}
          <div className="flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent p-3 sm:p-4">
            {/* Left: Back + Title */}
            <div className="flex items-center gap-2 truncate max-w-[55%]">
              <button
                onClick={() => (animeSlug ? navigate(`/anime/${animeSlug}`) : navigate(-1))}
                className="p-1.5 text-white/90 hover:text-white transition shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-white font-bold text-xs sm:text-sm truncate">
                {title} {episodeNumber ? `Eps ${episodeNumber}` : ''}
              </h2>
            </div>

            {/* Right: Speed, Resolution, More */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Speed (only for direct video) */}
              {!isEmbed && (
                <div className="relative">
                  <button
                    onClick={() => { setShowSpeedMenu((p) => !p); setShowResMenu(false); setShowMoreMenu(false); }}
                    className="flex items-center gap-1 px-2 py-1 bg-black/50 hover:bg-black/80 text-white/90 rounded-md text-[11px] font-semibold backdrop-blur-sm transition border border-white/10"
                    title="Kecepatan Video"
                  >
                    <Gauge className="w-3.5 h-3.5 text-amber-400" />
                    <span>{playbackSpeed}x</span>
                  </button>
                  {showSpeedMenu && (
                    <div className="absolute top-full right-0 mt-1.5 w-32 bg-slate-900/95 border border-slate-700 rounded-xl shadow-2xl p-1.5 backdrop-blur-md" style={{ zIndex: 50 }}>
                      <div className="text-[10px] font-bold text-slate-500 uppercase px-2 py-1 border-b border-slate-800 mb-1">Kecepatan</div>
                      {SPEED_OPTIONS.map((spd) => (
                        <button
                          key={spd}
                          onClick={() => changeSpeed(spd)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                            playbackSpeed === spd ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          {spd === 1.0 ? 'Normal' : `${spd}x`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Resolution / Server */}
              {streamVideos.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => { setShowResMenu((p) => !p); setShowSpeedMenu(false); setShowMoreMenu(false); }}
                    className="flex items-center gap-1 px-2 py-1 bg-black/50 hover:bg-black/80 text-white/90 rounded-md text-[11px] font-semibold backdrop-blur-sm transition border border-white/10"
                    title="Server / Resolusi"
                  >
                    <span className="px-1 py-0.5 bg-indigo-600 text-white text-[9px] font-black rounded">HD</span>
                    <span className="hidden sm:inline truncate max-w-[80px]">{activeVideo?.quality || ''}</span>
                  </button>
                  {showResMenu && (
                    <div className="absolute top-full right-0 mt-1.5 w-52 bg-slate-900/95 border border-slate-700 rounded-xl shadow-2xl p-1.5 backdrop-blur-md" style={{ zIndex: 50 }}>
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase px-2 py-1 border-b border-slate-800 mb-1">
                        <span>Resolusi / Server</span>
                        <button onClick={() => setShowResMenu(false)}><X className="w-3 h-3" /></button>
                      </div>
                      <div className="max-h-44 overflow-y-auto space-y-0.5">
                        {streamVideos.map((vid) => (
                          <button
                            key={vid.id}
                            onClick={() => { onSelectVideo?.(vid); setShowResMenu(false); }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition ${
                              activeVideo?.id === vid.id ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <span>{vid.server}</span>
                            <span className="text-[10px] opacity-70">{vid.quality}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* More Menu */}
              <div className="relative">
                <button
                  onClick={() => { setShowMoreMenu((p) => !p); setShowSpeedMenu(false); setShowResMenu(false); }}
                  className="p-1.5 text-white/80 hover:text-white transition"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
                {showMoreMenu && (
                  <div className="absolute top-full right-0 mt-1.5 w-40 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5" style={{ zIndex: 50 }}>
                    <button
                      onClick={() => { handleShare(); setShowMoreMenu(false); }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-800 rounded-lg flex items-center gap-2 text-xs text-slate-200"
                    >
                      <Share2 className="w-4 h-4 text-indigo-400" /> Share
                    </button>
                    <button
                      onClick={() => { handleToggleSave(); setShowMoreMenu(false); }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-800 rounded-lg flex items-center gap-2 text-xs text-slate-200"
                    >
                      <Bookmark className="w-4 h-4 text-amber-400" /> {saved ? 'Batal Simpan' : 'Simpan'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── CENTER: Play/Pause + Skip (only for direct video, NOT for embeds) ── */}
          {!isEmbed && (
            <div className="self-center flex items-center gap-8 sm:gap-12">
              <button
                onClick={() => skipTime(-10)}
                className="p-3 bg-black/50 hover:bg-black/80 text-white rounded-full transition backdrop-blur-sm hover:scale-110 border border-white/10"
                title="Mundur 10 Detik"
              >
                <RotateCcw className="w-6 h-6 sm:w-7 sm:h-7" />
              </button>

              <button
                onClick={togglePlay}
                className="p-5 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-full shadow-2xl transition hover:scale-110 border border-indigo-400/30"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-8 h-8 sm:w-9 sm:h-9" />
                ) : (
                  <Play className="w-8 h-8 sm:w-9 sm:h-9 ml-0.5" />
                )}
              </button>

              <button
                onClick={() => skipTime(10)}
                className="p-3 bg-black/50 hover:bg-black/80 text-white rounded-full transition backdrop-blur-sm hover:scale-110 border border-white/10"
                title="Maju 10 Detik"
              >
                <RotateCw className="w-6 h-6 sm:w-7 sm:h-7" />
              </button>
            </div>
          )}

          {/* Spacer for embeds so bottom bar stays at bottom */}
          {isEmbed && <div />}

          {/* ── BOTTOM BAR ── */}
          <div className="bg-gradient-to-t from-black/85 via-black/50 to-transparent p-3 sm:p-4 space-y-2">
            {/* Custom Time Slider (only for direct video) */}
            {!isEmbed && duration > 0 && (
              <div className="flex items-center gap-2.5">
                <span className="text-[11px] text-slate-300 font-mono font-semibold min-w-[38px]">
                  {fmt(currentTime)}
                </span>
                <div className="relative flex-1 h-5 flex items-center group/slider">
                  <div className="absolute w-full h-1 bg-slate-700/80 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all"
                      style={{ width: `${(currentTime / duration) * 100}%` }}
                    />
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={duration}
                    value={currentTime}
                    onChange={handleSeek}
                    className="absolute w-full h-5 opacity-0 cursor-pointer"
                  />
                </div>
                <span className="text-[11px] text-slate-400 font-mono font-semibold min-w-[38px] text-right">
                  {fmt(duration)}
                </span>
              </div>
            )}

            {/* Bottom Controls Row */}
            <div className="flex items-center justify-between gap-1">
              {/* Left: Lock, Like, Save, Share */}
              <div className="flex items-center gap-1 sm:gap-2">
                <button onClick={() => { setIsLocked(true); toast.info('Layar Dikunci 🔒'); }} className="p-1.5 text-slate-300 hover:text-white transition rounded-lg hover:bg-white/10" title="Kunci Layar">
                  <Lock className="w-[18px] h-[18px]" />
                </button>
                <button onClick={handleToggleLike} className={`p-1.5 transition rounded-lg hover:bg-white/10 ${liked ? 'text-indigo-400' : 'text-slate-300 hover:text-white'}`} title="Like">
                  <ThumbsUp className="w-[18px] h-[18px]" />
                </button>
                <button onClick={handleToggleSave} className={`p-1.5 transition rounded-lg hover:bg-white/10 ${saved ? 'text-amber-400' : 'text-slate-300 hover:text-white'}`} title="Save">
                  <Bookmark className="w-[18px] h-[18px]" />
                </button>
                <button onClick={handleShare} className="p-1.5 text-slate-300 hover:text-white transition rounded-lg hover:bg-white/10" title="Share">
                  <Share2 className="w-[18px] h-[18px]" />
                </button>
              </div>

              {/* Right: Episode List, Prev/Next, Fullscreen */}
              <div className="flex items-center gap-1 sm:gap-1.5">
                <button
                  onClick={() => { setShowEpListDrawer(true); closeMenus(); }}
                  className="px-2 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-md text-[11px] font-bold flex items-center gap-1 border border-slate-700/50 transition"
                  title="Daftar Episode"
                >
                  <List className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="hidden sm:inline">Daftar Episode</span>
                </button>

                <button
                  onClick={() => prevEpisode && onNavigateEpisode?.(prevEpisode)}
                  disabled={!prevEpisode}
                  className="px-2 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed rounded-md text-[11px] font-bold flex items-center gap-0.5 border border-slate-700/50 transition"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Prev</span>
                </button>

                <button
                  onClick={() => nextEpisode && onNavigateEpisode?.(nextEpisode)}
                  disabled={!nextEpisode}
                  className="px-2 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed rounded-md text-[11px] font-bold flex items-center gap-0.5 border border-slate-700/50 transition"
                >
                  <span className="hidden md:inline">Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <button onClick={toggleFullscreen} className="p-1.5 text-white hover:text-indigo-400 transition rounded-lg hover:bg-white/10" title="Fullscreen">
                  {isFullscreen ? <Minimize className="w-[18px] h-[18px]" /> : <Maximize className="w-[18px] h-[18px]" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Episode List Drawer ═══ */}
      {showEpListDrawer && !isLocked && (
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md flex flex-col" style={{ zIndex: 80 }}>
          <div className="flex items-center justify-between p-4 border-b border-slate-800">
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <List className="w-5 h-5 text-indigo-500" />
              Daftar Episode — {title}
            </h3>
            <button
              onClick={() => setShowEpListDrawer(false)}
              className="p-2 bg-slate-800 text-slate-300 hover:text-white rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
            {episodes.map((ep) => (
              <button
                key={ep.id || ep.slug}
                onClick={() => { onSelectEpisode?.(ep); setShowEpListDrawer(false); }}
                className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-0.5 transition ${
                  ep.slug === currentEpisodeSlug
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800'
                }`}
              >
                <span>Ep {ep.number || ep.episode_number}</span>
                <span className="text-[9px] opacity-70 truncate max-w-full">{ep.title}</span>
              </button>
            ))}
          </div>

          <div className="p-3 text-center text-[11px] text-slate-500 border-t border-slate-800">
            Klik episode untuk langsung pindah.
          </div>
        </div>
      )}
    </div>
  );
}
