import { useState, useRef } from 'react';
import {
  RefreshCw,
  Search,
  Download,
  CheckCircle,
  AlertCircle,
  Film,
  Play,
  CheckSquare,
  Square,
  Layers,
  StopCircle,
  ListChecks,
} from 'lucide-react';
import { apiClient } from '../../utils/api';

export default function OtakudesuSync() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchListLoading, setFetchListLoading] = useState(false);
  const [animeList, setAnimeList] = useState([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [log, setLog] = useState([]);
  const [scrapedData, setScrapedData] = useState(null);
  const [videoScrapeLoading, setVideoScrapeLoading] = useState(false);

  // Batch states
  const [selectedSlugs, setSelectedSlugs] = useState([]);
  const [autoSyncVideos, setAutoSyncVideos] = useState(true);
  const [batchProgress, setBatchProgress] = useState({
    isRunning: false,
    total: 0,
    current: 0,
    currentAnimeTitle: '',
    currentEpInfo: '',
  });
  const cancelBatchRef = useRef(false);

  const addLog = (msg, type = 'info') => {
    setLog((prev) => [
      { id: Date.now() + Math.random(), msg, type, time: new Date().toLocaleTimeString() },
      ...prev,
    ]);
  };

  const handleFetchList = async () => {
    setFetchListLoading(true);
    addLog('Mengambil daftar anime dari Otakudesu...', 'info');
    try {
      const res = await apiClient.getOtakudesuList();
      if (res?.status && Array.isArray(res.data)) {
        setAnimeList(res.data);
        setSelectedSlugs([]);
        addLog(`Berhasil mengambil ${res.data.length} anime dari Otakudesu index.`, 'success');
      } else {
        addLog('Gagal mengambil daftar anime.', 'error');
      }
    } catch (err) {
      addLog(`Error: ${err.message}`, 'error');
    } finally {
      setFetchListLoading(false);
    }
  };

  const handleScrapeDetail = async (targetUrl) => {
    const finalUrl = targetUrl || url;
    if (!finalUrl || !finalUrl.trim()) {
      addLog('URL Otakudesu anime wajib diisi.', 'error');
      return;
    }

    setLoading(true);
    setScrapedData(null);
    addLog(`Memulai scrape detail dari: ${finalUrl}`, 'info');

    try {
      const res = await apiClient.scrapeOtakudesuDetail(finalUrl.trim());
      if (res?.status) {
        setScrapedData(res.data);
        addLog(`Berhasil scrape "${res.data.title}" dengan ${res.data.episodesCount} episode! (Bebas Duplikat)`, 'success');
      } else {
        addLog(`Gagal scrape detail: ${res?.message || 'Unknown error'}`, 'error');
      }
    } catch (err) {
      addLog(`Error scrape detail: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleScrapeVideosForEpisode = async (ep) => {
    if (!ep.url || !ep.id) {
      addLog(`Episode ${ep.episodeNumber} tidak memiliki URL atau ID valid.`, 'error');
      return;
    }

    setVideoScrapeLoading(true);
    addLog(`Scrape video stream untuk Episode ${ep.episodeNumber}...`, 'info');

    try {
      const res = await apiClient.scrapeOtakudesuEpisodeVideos(ep.url, ep.id);
      if (res?.status) {
        addLog(`Berhasil scrape ${res.videoSourcesCount} link video untuk Episode ${ep.episodeNumber}!`, 'success');
      } else {
        addLog(`Gagal scrape video episode ${ep.episodeNumber}: ${res?.message}`, 'error');
      }
    } catch (err) {
      addLog(`Error scrape video episode ${ep.episodeNumber}: ${err.message}`, 'error');
    } finally {
      setVideoScrapeLoading(false);
    }
  };

  const filteredList = animeList.filter(
    (item) =>
      item.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      item.slug.toLowerCase().includes(searchFilter.toLowerCase())
  );

  // Checkbox helpers
  const handleToggleSelectAll = () => {
    const filteredSlugs = filteredList.map((item) => item.slug);
    const allSelected = filteredSlugs.every((slug) => selectedSlugs.includes(slug));

    if (allSelected) {
      setSelectedSlugs((prev) => prev.filter((s) => !filteredSlugs.includes(s)));
    } else {
      setSelectedSlugs((prev) => Array.from(new Set([...prev, ...filteredSlugs])));
    }
  };

  const handleToggleSelectOne = (slug) => {
    setSelectedSlugs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  // Batch Sync execution (Multiple Anime + All Episodes)
  const handleStartBatchSync = async () => {
    const selectedAnimeItems = animeList.filter((item) => selectedSlugs.includes(item.slug));

    if (selectedAnimeItems.length === 0) {
      addLog('Pilih minimal 1 anime untuk melakukan Batch Sync.', 'error');
      return;
    }

    cancelBatchRef.current = false;
    setBatchProgress({
      isRunning: true,
      total: selectedAnimeItems.length,
      current: 0,
      currentAnimeTitle: '',
      currentEpInfo: '',
    });

    addLog(
      `🚀 Memulai Batch Sync untuk ${selectedAnimeItems.length} anime terpilih... (${
        autoSyncVideos ? 'Dengan Auto-Sync Video Episodes' : 'Hanya Details & Episodes List'
      })`,
      'info'
    );

    for (let i = 0; i < selectedAnimeItems.length; i++) {
      if (cancelBatchRef.current) {
        addLog('⚠️ Process Batch Sync dihentikan oleh pengguna.', 'error');
        break;
      }

      const item = selectedAnimeItems[i];
      setBatchProgress((prev) => ({
        ...prev,
        current: i + 1,
        currentAnimeTitle: item.title,
        currentEpInfo: 'Scraping details & episode list...',
      }));

      addLog(`[${i + 1}/${selectedAnimeItems.length}] Scraping Detail Anime: "${item.title}"...`, 'info');

      try {
        const detailRes = await apiClient.scrapeOtakudesuDetail(item.url);

        if (detailRes?.status && detailRes.data) {
          const animeData = detailRes.data;
          addLog(
            `✓ Anime "${animeData.title}" berhasil di-sync dengan ${animeData.episodesCount} episode.`,
            'success'
          );

          // If autoSyncVideos is checked, scrape all episode videos sequentially
          if (
            autoSyncVideos &&
            Array.isArray(animeData.episodes) &&
            animeData.episodes.length > 0
          ) {
            addLog(
              `  ↳ Memulai scrape video stream untuk ${animeData.episodes.length} episode...`,
              'info'
            );

            for (let j = 0; j < animeData.episodes.length; j++) {
              if (cancelBatchRef.current) break;

              const ep = animeData.episodes[j];
              setBatchProgress((prev) => ({
                ...prev,
                currentEpInfo: `Scraping Video Stream Episode ${ep.episodeNumber} (${j + 1}/${
                  animeData.episodes.length
                })...`,
              }));

              if (ep.url && ep.id) {
                try {
                  const vidRes = await apiClient.scrapeOtakudesuEpisodeVideos(ep.url, ep.id);
                  if (vidRes?.status) {
                    addLog(
                      `  ✓ Ep ${ep.episodeNumber}: ${vidRes.videoSourcesCount} link video tersimpan`,
                      'success'
                    );
                  } else {
                    addLog(
                      `  ✕ Ep ${ep.episodeNumber}: ${vidRes?.message || 'Gagal scrape video'}`,
                      'error'
                    );
                  }
                } catch (vErr) {
                  addLog(`  ✕ Ep ${ep.episodeNumber} video error: ${vErr.message}`, 'error');
                }
              }
            }
          }
        } else {
          addLog(
            `✕ Gagal sync anime "${item.title}": ${detailRes?.message || 'Unknown error'}`,
            'error'
          );
        }
      } catch (err) {
        addLog(`✕ Error sync anime "${item.title}": ${err.message}`, 'error');
      }
    }

    setBatchProgress((prev) => ({ ...prev, isRunning: false, currentEpInfo: '' }));
    addLog('🎉 Batch Sync Selesai!', 'success');
  };

  const handleStopBatchSync = () => {
    cancelBatchRef.current = true;
    addLog('Mengirim perintah pemberhentian Batch Sync...', 'error');
  };

  const isAllFilteredSelected =
    filteredList.length > 0 &&
    filteredList.every((item) => selectedSlugs.includes(item.slug));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Film className="h-7 w-7 text-primary-600 dark:text-primary-400" />
            Otakudesu Anime & Episode Sync
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Scrape dan sinkronisasi data anime, episode, dan video stream dari Otakudesu.
          </p>
        </div>

        <button
          onClick={handleFetchList}
          disabled={fetchListLoading || batchProgress.isRunning}
          className="inline-flex items-center justify-center px-4 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl shadow-sm transition-colors"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${fetchListLoading ? 'animate-spin' : ''}`} />
          {fetchListLoading ? 'Mengambil List...' : 'Fetch Otakudesu Index'}
        </button>
      </div>

      {/* Manual Input Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Option 1: Scrape 1 per 1 (URL Manual / Single Anime)
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="url"
            placeholder="https://otakudesu.blog/anime/title-sub-indo/"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={batchProgress.isRunning}
            className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            onClick={() => handleScrapeDetail()}
            disabled={loading || !url.trim() || batchProgress.isRunning}
            className="inline-flex items-center justify-center px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium rounded-xl shadow-sm transition-colors"
          >
            <Download className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Proses Scrape...' : 'Sync Anime Details'}
          </button>
        </div>
      </div>

      {/* Scraped Result Summary for Single Scrape */}
      {scrapedData && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 mb-2">
                Sync Selesai (Bebas Duplikat)
              </span>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {scrapedData.title}
              </h3>
              {scrapedData.japaneseName && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {scrapedData.japaneseName}
                </p>
              )}
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-700 dark:text-gray-300">
                <span>
                  ⭐ Rating: <strong>{scrapedData.rating || '-'}</strong>
                </span>
                <span>
                  Status: <strong className="capitalize">{scrapedData.status}</strong>
                </span>
                <span>
                  Total Episode Tersimpan: <strong>{scrapedData.episodesCount}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Episode List */}
          {Array.isArray(scrapedData.episodes) && scrapedData.episodes.length > 0 && (
            <div className="mt-6 pt-4 border-t border-green-200 dark:border-green-800">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Pilih Episode yang Ingin Di-sync Video Streamball-nya (Opsional):
              </h4>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                {scrapedData.episodes.map((ep) => (
                  <div
                    key={ep.id || ep.slug}
                    className="flex items-center justify-between bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm"
                  >
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      Ep {ep.episodeNumber}: {ep.title}
                    </span>
                    <button
                      onClick={() => handleScrapeVideosForEpisode(ep)}
                      disabled={videoScrapeLoading || batchProgress.isRunning}
                      className="inline-flex items-center px-3 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Fetch Videos
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Batch Sync Progress Indicator */}
      {batchProgress.isRunning && (
        <div className="bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 text-white rounded-xl animate-pulse">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">
                  Batch Sync Sedang Berlangsung...
                </h3>
                <p className="text-xs text-indigo-700 dark:text-indigo-300">
                  Anime {batchProgress.current} dari {batchProgress.total}:{' '}
                  <strong className="font-semibold">{batchProgress.currentAnimeTitle}</strong>
                </p>
              </div>
            </div>

            <button
              onClick={handleStopBatchSync}
              className="inline-flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
            >
              <StopCircle className="h-4 w-4 mr-1.5" />
              Hentikan Process
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-indigo-200 dark:bg-indigo-900/60 h-3 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full transition-all duration-300"
              style={{
                width: `${Math.round((batchProgress.current / batchProgress.total) * 100)}%`,
              }}
            />
          </div>

          {batchProgress.currentEpInfo && (
            <p className="text-xs text-gray-600 dark:text-gray-400 font-mono animate-pulse">
              ➔ {batchProgress.currentEpInfo}
            </p>
          )}
        </div>
      )}

      {/* Otakudesu Index List with Batch Checkboxes */}
      {animeList.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
          {/* Header & Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-gray-100 dark:border-gray-700">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                Option 2: Batch Sync Beberapa Anime (+ Semua Episode)
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Centang anime yang ingin di-sync secara bersamaan tanpa khawatir duplikat.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cari judul anime..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Batch Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-50 dark:bg-gray-700/40 p-3 rounded-xl border border-gray-200 dark:border-gray-600">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={handleToggleSelectAll}
                disabled={batchProgress.isRunning || filteredList.length === 0}
                className="inline-flex items-center text-xs font-semibold text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                {isAllFilteredSelected ? (
                  <CheckSquare className="h-4 w-4 text-indigo-600 dark:text-indigo-400 mr-1.5" />
                ) : (
                  <Square className="h-4 w-4 text-gray-400 mr-1.5" />
                )}
                {isAllFilteredSelected ? 'Batal Pilih Semua' : 'Pilih Semua (' + filteredList.length + ')'}
              </button>

              <span className="text-xs text-gray-500 dark:text-gray-400">|</span>

              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                {selectedSlugs.length} Anime Terpilih
              </span>
            </div>

            <div className="flex items-center gap-4">
              {/* Option to also sync video stream links for all episodes */}
              <label className="inline-flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoSyncVideos}
                  onChange={(e) => setAutoSyncVideos(e.target.checked)}
                  disabled={batchProgress.isRunning}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span>Juga Scrape Video Stream Semua Episode</span>
              </label>

              <button
                type="button"
                onClick={handleStartBatchSync}
                disabled={selectedSlugs.length === 0 || batchProgress.isRunning}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all"
              >
                <Layers className="h-4 w-4 mr-1.5" />
                Sync {selectedSlugs.length} Anime + Episodes
              </button>
            </div>
          </div>

          {/* Anime List Items */}
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700">
            {filteredList.map((item) => {
              const isChecked = selectedSlugs.includes(item.slug);
              return (
                <div
                  key={item.slug}
                  className={`py-2.5 px-3 flex items-center justify-between gap-4 rounded-lg transition-colors ${
                    isChecked
                      ? 'bg-indigo-50/70 dark:bg-indigo-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleSelectOne(item.slug)}
                      disabled={batchProgress.isRunning}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 shrink-0 cursor-pointer"
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {item.title}
                    </span>
                  </div>

                  <button
                    onClick={() => handleScrapeDetail(item.url)}
                    disabled={loading || batchProgress.isRunning}
                    className="shrink-0 inline-flex items-center px-3 py-1.5 bg-primary-50 hover:bg-primary-100 dark:bg-primary-900/30 dark:hover:bg-primary-900/50 text-primary-600 dark:text-primary-400 text-xs font-medium rounded-lg transition-colors"
                  >
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Sync 1 Anime Ini
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Logs */}
      {log.length > 0 && (
        <div className="bg-gray-900 text-gray-200 rounded-2xl p-4 font-mono text-xs max-h-60 overflow-y-auto space-y-1.5 shadow-inner">
          <div className="flex items-center justify-between text-gray-400 font-bold mb-2 pb-1 border-b border-gray-800">
            <span>Activity Log:</span>
            <button
              onClick={() => setLog([])}
              className="text-[10px] text-gray-500 hover:text-gray-300 underline"
            >
              Clear Log
            </button>
          </div>
          {log.map((item) => (
            <div key={item.id} className="flex items-start gap-2">
              <span className="text-gray-500 shrink-0">[{item.time}]</span>
              {item.type === 'success' && (
                <CheckCircle className="h-3.5 w-3.5 text-green-400 shrink-0 mt-0.5" />
              )}
              {item.type === 'error' && (
                <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
              )}
              <span
                className={
                  item.type === 'success'
                    ? 'text-green-300'
                    : item.type === 'error'
                    ? 'text-red-300'
                    : 'text-gray-300'
                }
              >
                {item.msg}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
