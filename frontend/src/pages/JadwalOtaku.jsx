import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { CalendarDays, ChevronLeft, ChevronRight, Tv } from 'lucide-react';
import LiveChatWidget from '../components/LiveChatWidget';
import { apiClient } from '../utils/api';

const DAY_KEYS = [
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
  'Minggu',
  'Random',
];

const DAY_LABEL_MAP = {
  Senin: 'Senin',
  Selasa: 'Selasa',
  Rabu: 'Rabu',
  Kamis: 'Kamis',
  Jumat: 'Jumat',
  Sabtu: 'Sabtu',
  Minggu: 'Minggu',
  Random: 'Random',
};

function ScheduleItemCard({ item }) {
  return (
    <div className="group flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3.5 transition hover:border-sky-400/60 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:hover:border-cyan-400/40">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-cyan-950/50 dark:text-cyan-300">
          <Tv className="h-5 w-5" />
        </div>
        <p className="text-sm font-semibold text-gray-900 line-clamp-2 dark:text-gray-100 group-hover:text-sky-600 dark:group-hover:text-cyan-300">
          {item.title}
        </p>
      </div>
    </div>
  );
}

function DaySection({ dayLabel, items, isToday }) {
  const isEmpty = !items || items.length === 0;

  return (
    <section
      className={`rounded-2xl border transition-colors ${
        isToday
          ? 'border-sky-400/60 bg-sky-50/50 dark:border-cyan-400/40 dark:bg-cyan-950/15'
          : 'border-gray-200 bg-gray-50/40 dark:border-white/10 dark:bg-white/[0.03]'
      } ${isEmpty ? 'px-4 py-3 md:px-5 md:py-3.5' : 'p-4 md:p-5'}`}
    >
      <div className={`flex items-center gap-3 ${isEmpty ? '' : 'mb-4'}`}>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-800 dark:text-gray-100 md:text-base">
              {dayLabel}
            </h2>
            {isToday ? (
              <span className="rounded-full bg-sky-600 px-2.5 py-0.5 text-[10px] font-semibold text-white dark:bg-cyan-600">
                Hari ini
              </span>
            ) : null}
            {!isEmpty ? (
              <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-white/10 dark:text-gray-300">
                {items.length} Anime
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {isEmpty ? (
        <p className="text-sm text-gray-400 dark:text-gray-500">Tidak ada jadwal</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item, idx) => (
            <ScheduleItemCard key={item.slug || `${item.title}-${idx}`} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}

function ScheduleSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-gray-200 p-5 dark:border-white/10">
          <div className="mb-4 h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="h-14 rounded-xl bg-gray-200 dark:bg-gray-700" />
            <div className="hidden h-14 rounded-xl bg-gray-200 dark:bg-gray-700 sm:block" />
          </div>
        </div>
      ))}
    </div>
  );
}

const JadwalOtaku = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scheduleData, setScheduleData] = useState([]);
  const [activeDayIndex, setActiveDayIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await apiClient.getOtakudesuSchedule();
        if (!cancelled) {
          if (res?.status && Array.isArray(res?.data)) {
            setScheduleData(res.data);
          } else {
            setError('Gagal memuat jadwal Otakudesu');
          }
        }
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Gagal memuat jadwal');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const todayName = useMemo(() => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return days[new Date().getDay()];
  }, []);

  useEffect(() => {
    if (scheduleData.length > 0) {
      const idx = scheduleData.findIndex((s) => s.day?.toLowerCase() === todayName.toLowerCase());
      if (idx !== -1) {
        setActiveDayIndex(idx);
      }
    }
  }, [scheduleData, todayName]);

  const scheduleMap = useMemo(() => {
    const map = {};
    (scheduleData || []).forEach((sec) => {
      if (sec.day) {
        map[sec.day] = sec.items || [];
      }
    });
    return map;
  }, [scheduleData]);

  const sortedDays = useMemo(() => {
    const availableDays = (scheduleData || []).map((s) => s.day);
    if (availableDays.length > 0) return availableDays;
    return DAY_KEYS;
  }, [scheduleData]);

  const handlePrevDay = () => {
    setActiveDayIndex((prev) => (prev > 0 ? prev - 1 : sortedDays.length - 1));
  };

  const handleNextDay = () => {
    setActiveDayIndex((prev) => (prev < sortedDays.length - 1 ? prev + 1 : 0));
  };

  const activeDay = sortedDays[activeDayIndex] || sortedDays[0];

  return (
    <div className="min-h-screen bg-gray-100 pb-24 pt-5 text-gray-900 dark:bg-gray-950 dark:text-gray-100 md:pt-20">
      <Helmet>
        <title>Jadwal Rilis Anime | Nesiatv</title>
        <meta
          name="description"
          content="Jadwal rilis anime Otakudesu mingguan — Senin sampai Minggu & Random."
        />
      </Helmet>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xl dark:border-white/20 dark:bg-white/10 dark:backdrop-blur-2xl">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-5 dark:border-white/10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-gray-500 dark:text-gray-400">
                  Release Schedule
                </p>
                <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold md:text-3xl">
                  <CalendarDays className="h-7 w-7 text-sky-500 dark:text-cyan-400" />
                  Jadwal Rilis Anime
                </h1>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  Daftar rilis anime harian (Senin - Minggu + Random).
                </p>
              </div>

              {/* Mobile Carousel Day Controls */}
              <div className="flex items-center justify-between gap-2 rounded-2xl border border-gray-200 bg-gray-50/80 p-1.5 dark:border-white/10 dark:bg-white/5 md:hidden">
                <button
                  type="button"
                  onClick={handlePrevDay}
                  className="rounded-xl p-2 text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-white/10"
                  aria-label="Hari sebelumnya"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold uppercase tracking-wider text-sky-600 dark:text-cyan-400">
                    {activeDay}
                  </span>
                  {activeDay?.toLowerCase() === todayName.toLowerCase() && (
                    <span className="rounded-full bg-sky-600 px-2 py-0.5 text-[10px] font-semibold text-white dark:bg-cyan-600">
                      Hari ini
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleNextDay}
                  className="rounded-xl p-2 text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-white/10"
                  aria-label="Hari berikutnya"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Mobile Tab Selector Pill Bar */}
            <div className="mt-4 flex overflow-x-auto pb-1 gap-1.5 no-scrollbar md:hidden">
              {sortedDays.map((day, idx) => {
                const isSelected = idx === activeDayIndex;
                const isToday = day?.toLowerCase() === todayName.toLowerCase();
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setActiveDayIndex(idx)}
                    className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                      isSelected
                        ? 'bg-sky-600 text-white dark:bg-cyan-500 dark:text-gray-950'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10'
                    }`}
                  >
                    {day} {isToday ? '•' : ''}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 md:p-6">
            {loading ? (
              <ScheduleSkeleton />
            ) : error ? (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                {error}
              </p>
            ) : sortedDays.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 px-6 py-16 text-center dark:border-white/15">
                <CalendarDays className="mx-auto h-10 w-10 text-gray-400" />
                <p className="mt-3 font-medium text-gray-700 dark:text-gray-300">Belum ada jadwal</p>
              </div>
            ) : (
              <>
                {/* Mobile View: Display ONLY Active Day (slideable per hari) */}
                <div className="block md:hidden">
                  <DaySection
                    key={activeDay}
                    dayLabel={DAY_LABEL_MAP[activeDay] || activeDay}
                    items={scheduleMap[activeDay] || []}
                    isToday={activeDay?.toLowerCase() === todayName.toLowerCase()}
                  />
                </div>

                {/* Desktop View: Display All Days (Senin - Minggu + Random) */}
                <div className="hidden space-y-3 md:block md:space-y-4">
                  {sortedDays.map((dayKey) => {
                    const items = scheduleMap[dayKey] || [];
                    const isToday = dayKey?.toLowerCase() === todayName.toLowerCase();
                    return (
                      <DaySection
                        key={dayKey}
                        dayLabel={DAY_LABEL_MAP[dayKey] || dayKey}
                        items={items}
                        isToday={isToday}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <LiveChatWidget />
    </div>
  );
};

export default JadwalOtaku;
