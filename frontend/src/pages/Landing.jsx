import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { ExternalLink, Flame, Tv, Crown, Smartphone, Moon, Sun, ChevronDown, Sparkles, Heart } from "lucide-react";
import logo from "../assets/logo.png";
import discordIcon from "../assets/discord.svg";
import { apiClient } from "../utils/api";

const stats = [
  { value: "5000+", label: "Judul Anime" },
  { value: "100K+", label: "Episode" },
  { value: "24/7", label: "Update Harian" },
];

const genreItems = [
  "Action",
  "Romance",
  "Fantasy",
  "Comedy",
  "Adventure",
  "Martial Arts",
  "Shounen",
  "Seinen",
  "Isekai",
  "Slice of Life",
  "Horror",
  "School Life",
  "Drama",
  "Harem",
  "Supernatural",
  "Ecchi",
];

const faqItems = [
  {
    question: "Apa itu Nesiatv?",
    answer:
      "Nesiatv adalah platform nonton anime, donghua, film, dan serial online terbaru dengan subtitle Indonesia secara gratis. Nesiatv telah dipercaya oleh ratusan ribu penonton di seluruh Indonesia.",
  },
  {
    question: "Apakah Nesiatv gratis?",
    answer:
      "Ya! Kamu bisa menonton semua anime, donghua, dan film di Nesiatv secara gratis. Tersedia juga pilihan tayangan berkualitas HD dan update setiap hari.",
  },
  {
    question: "Apa domain resmi Nesiatv?",
    answer:
      "Domain utama Nesiatv adalah v1.nesiatv.com. Hati-hati dengan domain lain yang mengatasnamakan Nesiatv dan pastikan kamu selalu mengakses domain resmi.",
  },
  {
    question: "Genre apa saja yang tersedia?",
    answer:
      "Nesiatv menyediakan banyak genre termasuk Action, Romance, Fantasy, Comedy, Slice of Life, Martial Arts, Isekai, Horror, Seinen, Shounen, dan masih banyak lagi.",
  },
  {
    question: "Bagaimana cara nonton anime di Nesiatv?",
    answer:
      'Sangat mudah! Klik tombol "Nonton Anime, Donghua & Film" di atas, cari judul anime yang kamu inginkan, pilih episode, dan mulai menonton.',
  },
];

const decorativeStars = [
  { top: "8%", left: "10%", size: 16, rotate: "-12deg" },
  { top: "14%", right: "8%", size: 14, rotate: "8deg" },
  { top: "32%", left: "6%", size: 12, rotate: "20deg" },
  { top: "42%", right: "12%", size: 18, rotate: "-10deg" },
  { top: "58%", left: "9%", size: 14, rotate: "15deg" },
  { top: "73%", right: "7%", size: 12, rotate: "-6deg" },
  { top: "86%", left: "12%", size: 16, rotate: "12deg" },
];

const Landing = () => {
  const [isLightMode, setIsLightMode] = useState(false);
  const [openFaqItems, setOpenFaqItems] = useState(() => new Set([faqItems[0]?.question]));
  const [siteSettings, setSiteSettings] = useState({
    discord_url: 'https://discord.gg/dgC22PSm9h',
    donate_url: 'https://trakteer.id/Nesiatv.id',
    komik_id_url: 'https://v1.komiknesiaku.com/',
    komik_alt_url: 'https://id.nusakomik.com/',
    baca_manga_url: 'https://v1.nesiatv.com/',
    premium_url: 'https://v1.nesiatv.com/premium',
    site_title: 'NesiaTV - Nonton Anime, Donghua & Film Subtitle Indonesia',
    meta_description: 'NesiaTV adalah platform streaming untuk menonton anime, donghua, film, dan serial terbaru dengan subtitle Indonesia. Nikmati tayangan berkualitas HD, update setiap hari, dan koleksi lengkap hanya di NesiaTV.',
  });

  useEffect(() => {
    apiClient.getSettings().then((s) => {
      setSiteSettings({
        discord_url: s?.discord_url || 'https://discord.gg/dgC22PSm9h',
        donate_url: s?.donate_url || 'https://trakteer.id/Nesiatv.id',
        komik_id_url: s?.komik_id_url || 'https://v1.komiknesiaku.com/',
        komik_alt_url: s?.komik_alt_url || 'https://id.nusakomik.com/',
        baca_manga_url: s?.baca_manga_url || 'https://v1.nesiatv.com/',
        premium_url: s?.premium_url || 'https://v1.nesiatv.com/premium',
        site_title: s?.site_title || 'NesiaTV - Nonton Anime, Donghua & Film Subtitle Indonesia',
        meta_description: s?.meta_description || 'NesiaTV adalah platform streaming untuk menonton anime, donghua, film, dan serial terbaru dengan subtitle Indonesia. Nikmati tayangan berkualitas HD, update setiap hari, dan koleksi lengkap hanya di NesiaTV.',
      });
    }).catch(() => {});
  }, []);

  const ctaItems = [
    {
      title: "Nonton Anime, Donghua & Film",
      subtitle: "Streaming anime, donghua & film subtitle Indonesia",
      href: siteSettings.baca_manga_url,
      icon: Tv,
      iconWrapClass: "bg-purple-100 ring-purple-200",
      iconWrapClassDark: "bg-[#a855f7] ring-[#a855f7]",
      iconClass: "text-purple-700",
      iconClassDark: "text-white",
      badge: "Hot",
      badgeClass: "bg-purple-400 text-purple-950",
    },
    {
      title: "Baca Komik ID",
      subtitle: "Ribuan komik, manga, manhwa & manhua bahasa Indonesia",
      href: siteSettings.komik_id_url,
      icon: Tv,
      iconWrapClass: "bg-emerald-100 ring-emerald-300",
      iconWrapClassDark: "bg-[#10b981] ring-[#10b981]",
      iconClass: "text-emerald-700",
      iconClassDark: "text-white",
    },
    {
      title: "Baca Komik (Alternatif)",
      subtitle: "Server alternatif untuk membaca komik online",
      href: siteSettings.komik_alt_url,
      icon: Tv,
      iconWrapClass: "bg-indigo-100 ring-indigo-300",
      iconWrapClassDark: "bg-[#6366f1] ring-[#6366f1]",
      iconClass: "text-indigo-700",
      iconClassDark: "text-white",
    },
    {
      title: "Discord",
      subtitle: "Komunitas penonton & update info terbaru",
      href: siteSettings.discord_url,
      customIcon: discordIcon,
      iconWrapClass: "bg-[#5865F2] ring-[#7c85f7]",
      iconWrapClassDark: "bg-[#5865F2] ring-[#7c85f7]",
    },
    {
      title: "Donasi",
      subtitle: "Dukung perkembangan NesiaTV via Trakteer",
      href: siteSettings.donate_url,
      icon: Heart,
      iconWrapClass: "bg-rose-100 ring-rose-300",
      iconWrapClassDark: "bg-[#f43f5e] ring-[#f43f5e]",
      iconClass: "text-rose-700",
      iconClassDark: "text-white",
    },
  ];

  const allFaqOpen = openFaqItems.size === faqItems.length;

  const toggleFaq = (question) => {
    setOpenFaqItems((prev) => {
      const next = new Set(prev);
      if (next.has(question)) {
        next.delete(question);
      } else {
        next.add(question);
      }
      return next;
    });
  };

  const toggleAllFaq = () => {
    setOpenFaqItems(() => {
      if (allFaqOpen) return new Set();
      return new Set(faqItems.map((item) => item.question));
    });
  };

  return (
    <main
      className={`relative min-h-screen overflow-hidden transition-colors duration-300 ${isLightMode ? "bg-white text-gray-900" : "bg-gray-950 text-gray-100"
        }`}
    >
      <Helmet>
        <title>{siteSettings.site_title}</title>
        <meta name="description" content={siteSettings.meta_description} />
        <meta property="og:title" content={siteSettings.site_title} />
        <meta property="og:description" content={siteSettings.meta_description} />
      </Helmet>
      <div
        className={`pointer-events-none absolute inset-0 ${isLightMode
          ? "bg-[radial-gradient(circle_at_15%_20%,rgba(168,85,247,0.08),transparent_35%),radial-gradient(circle_at_85%_75%,rgba(236,72,153,0.08),transparent_35%)]"
          : "bg-[radial-gradient(circle_at_15%_20%,rgba(168,85,247,0.15),transparent_35%),radial-gradient(circle_at_85%_75%,rgba(236,72,153,0.15),transparent_35%)]"
          }`}
      />
      <div
        className={`pointer-events-none absolute inset-0 [background-size:36px_36px] ${isLightMode
          ? "opacity-10 [background-image:radial-gradient(circle,rgba(2,6,23,0.2)_1px,transparent_1px)]"
          : "opacity-15 [background-image:radial-gradient(circle,rgba(255,255,255,0.25)_1px,transparent_1px)]"
          }`}
      />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {decorativeStars.map((star, index) => (
          <svg
            key={`${star.top}-${index}`}
            viewBox="0 0 24 24"
            aria-hidden="true"
            className={`${isLightMode ? "text-purple-400/70" : "text-purple-300/70"} absolute`}
            style={{
              top: star.top,
              left: star.left,
              right: star.right,
              width: `${star.size}px`,
              height: `${star.size}px`,
              transform: `rotate(${star.rotate})`,
            }}
          >
            <path
              fill="currentColor"
              d="M12 2.5l2.2 6.1 6.3 2.2-6.3 2.2-2.2 6.1-2.2-6.1-6.3-2.2 6.3-2.2L12 2.5z"
            />
          </svg>
        ))}
      </div>

      <section className="relative mx-auto flex min-h-screen max-w-3xl flex-col items-center px-4 pb-12 pt-10 sm:px-6">
        <button
          type="button"
          onClick={() => setIsLightMode((prev) => !prev)}
          className={`absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full border transition-colors sm:right-6 ${isLightMode
            ? "border-purple-400/40 bg-white text-purple-600 hover:bg-purple-50"
            : "border-purple-300/40 bg-[#3b0764] text-purple-100 hover:bg-[#581c87]"
            }`}
          aria-label={isLightMode ? "Aktifkan dark mode" : "Aktifkan light mode"}
        >
          {isLightMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </button>

        <img src={logo} alt="Nesiatv" className="w-44 sm:w-56" />

        <div
          className={`mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold ring-1 sm:text-sm ${isLightMode
            ? "bg-purple-300/30 text-purple-900 ring-purple-500/30"
            : "bg-purple-400/20 text-purple-100 ring-purple-300/40"
            }`}
        >
          <Flame className={`h-4 w-4 ${isLightMode ? "text-purple-700" : "text-purple-200"}`} />
          Nonton anime, donghua & film favoritmu di sini !!
        </div>

        <div className="mt-7 w-full space-y-4">
          {ctaItems.map((item) => {
            const Icon = item.icon;

            return (
              <a
                key={item.title}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`group flex w-full items-center justify-between rounded-3xl border px-4 py-4 shadow-[0_7px_0_0_#9333ea] transition-all duration-200 hover:-translate-y-0.5 ${isLightMode
                  ? "border-purple-300/70 bg-white/95 hover:bg-purple-50"
                  : "border-purple-300/40 bg-[#1e1b4b]/95 hover:bg-[#312e81]"
                  }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl ring-1 ${isLightMode
                      ? item.iconWrapClass || "bg-purple-100 ring-purple-200"
                      : item.iconWrapClassDark || "bg-purple-400/25 ring-purple-300/35"
                      }`}
                  >
                    {item.customIcon ? (
                      <img src={item.customIcon} alt="" aria-hidden="true" className="h-5 w-5" />
                    ) : (
                      Icon && (
                        <Icon
                          className={`h-5 w-5 ${isLightMode
                            ? item.iconClass || "text-purple-700"
                            : item.iconClassDark || "text-purple-100"
                            }`}
                        />
                      )
                    )}
                  </span>

                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <p className={`text-base font-bold sm:text-xl ${isLightMode ? "text-[#3b0764]" : "text-purple-50"}`}>
                        {item.title}
                      </p>
                      {item.badge && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${item.badgeClass}`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className={`text-xs sm:text-sm ${isLightMode ? "text-purple-800/80" : "text-purple-100/80"}`}>
                      {item.subtitle}
                    </p>
                  </div>
                </div>

                <ExternalLink
                  className={`h-4 w-4 transition-transform group-hover:translate-x-0.5 ${isLightMode ? "text-purple-600" : "text-purple-200"
                    }`}
                />
              </a>
            );
          })}
        </div>

        <div
          className={`mt-8 grid w-full grid-cols-3 gap-3 rounded-3xl border p-4 shadow-[0_7px_0_0_#9333ea] ${isLightMode
            ? "border-purple-300/60 bg-white/95"
            : "border-purple-300/30 bg-[#1e1b4b]/90"
            }`}
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={`rounded-2xl p-3 text-center ${isLightMode ? "bg-purple-100/80" : "bg-[#312e81]"}`}
            >
              <p className={`text-lg font-bold sm:text-2xl ${isLightMode ? "text-purple-700" : "text-purple-200"}`}>
                {stat.value}
              </p>
              <p className={`text-[11px] sm:text-xs ${isLightMode ? "text-purple-900/70" : "text-purple-100/80"}`}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 w-full space-y-5">
          <section
            className={`rounded-3xl border p-5 shadow-[0_7px_0_0_#9333ea] sm:p-6 ${isLightMode ? "border-purple-300/60 bg-white/95" : "border-purple-300/30 bg-[#1e1b4b]/90"
              }`}
          >
            <h2 className={`text-2xl font-extrabold ${isLightMode ? "text-[#3b0764]" : "text-purple-50"}`}>
              Apa itu Nesiatv? <span className="align-middle">🎌</span>
            </h2>
            <p className={`mt-3 text-sm leading-7 sm:text-base ${isLightMode ? "text-purple-900/80" : "text-purple-100/80"}`}>
              Nesiatv adalah platform streaming anime, donghua, film, dan serial online berbahasa Indonesia yang paling
              lengkap dan terupdate. Dengan ribuan judul dari berbagai genre, Nesiatv menjadi pilihan utama para
              pecinta anime dan animasi di Indonesia.
            </p>
            <p className={`mt-3 text-sm leading-7 sm:text-base ${isLightMode ? "text-purple-900/80" : "text-purple-100/80"}`}>
              Nikmati pengalaman menonton yang nyaman dengan update episode terbaru setiap hari, kualitas HD, tampilan modern yang
              responsif di semua perangkat, dan fitur favorit untuk menyimpan tayangan incaranmu. Semua bisa kamu akses
              secara gratis!
            </p>
          </section>

          <section
            className={`rounded-3xl border p-5 shadow-[0_7px_0_0_#9333ea] sm:p-6 ${isLightMode ? "border-purple-300/60 bg-white/95" : "border-purple-300/30 bg-[#1e1b4b]/90"
              }`}
          >
            <h2 className={`text-2xl font-extrabold ${isLightMode ? "text-[#3b0764]" : "text-purple-50"}`}>
              Jelajahi Genre <span className="align-middle">🔍</span>
            </h2>
            <p className={`mt-3 text-sm sm:text-base ${isLightMode ? "text-purple-900/80" : "text-purple-100/80"}`}>
              Temukan anime, donghua, dan film sesuai genre favoritmu:
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {genreItems.map((genre) => (
                <span
                  key={genre}
                  className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:text-sm ${isLightMode
                    ? "bg-purple-100 text-purple-700 ring-1 ring-purple-200 hover:bg-purple-600 hover:text-white hover:ring-purple-600"
                    : "bg-[#312e81] text-purple-100 ring-1 ring-purple-200/30 hover:bg-purple-500 hover:text-slate-950 hover:ring-purple-300"
                    }`}
                >
                  {genre}
                </span>
              ))}
            </div>
          </section>

          <section
            className={`rounded-3xl border p-5 shadow-[0_7px_0_0_#9333ea] sm:p-6 ${isLightMode ? "border-purple-300/60 bg-white/95" : "border-purple-300/30 bg-[#1e1b4b]/90"
              }`}
          >
            <h2 className={`text-2xl font-extrabold ${isLightMode ? "text-[#3b0764]" : "text-purple-50"}`}>
              Kenapa Nesiatv? <span className="align-middle">⚡</span>
            </h2>
            <ul className={`mt-4 space-y-3 text-sm leading-7 sm:text-base ${isLightMode ? "text-purple-900/80" : "text-purple-100/80"}`}>
              <li>🎬 <strong>Koleksi Terlengkap</strong> — Ribuan judul anime, donghua, dan film tersedia dengan subtitle Indonesia.</li>
              <li>⚡ <strong>Update Tercepat</strong> — Episode terbaru langsung tersedia begitu dirilis. Jangan sampai ketinggalan!</li>
              <li>📱 <strong>Nonton di Mana Saja</strong> — Tampilan responsif yang nyaman di HP, tablet, maupun laptop.</li>
              <li>🔖 <strong>Favorit & Riwayat</strong> — Simpan anime favoritmu dan lanjutkan menonton kapan saja.</li>
              <li>🌙 <strong>Mode Gelap</strong> — Menonton dengan nyaman di malam hari tanpa menyakiti mata.</li>
              <li>💎 <strong>Kualitas HD</strong> — Pengalaman streaming jernih dan lancar.</li>
            </ul>
          </section>

          <section
            className={`rounded-3xl border p-5 shadow-[0_7px_0_0_#9333ea] sm:p-6 ${isLightMode ? "border-purple-300/60 bg-white/95" : "border-purple-300/30 bg-[#1e1b4b]/90"
              }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className={`text-2xl font-extrabold ${isLightMode ? "text-[#3b0764]" : "text-purple-50"}`}>
                FAQ <span className="align-middle">❓</span>
              </h2>
              <button
                type="button"
                onClick={toggleAllFaq}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm ${isLightMode
                  ? "bg-purple-100 text-purple-700 hover:bg-purple-200"
                  : "bg-[#312e81] text-purple-100 hover:bg-[#4338ca]"
                  }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {allFaqOpen ? "Tutup semua" : "Buka semua"}
              </button>
            </div>
            <div className="mt-4 space-y-4">
              {faqItems.map((item) => (
                <div
                  key={item.question}
                  className={`rounded-2xl p-3 transition-colors sm:p-4 ${isLightMode ? "bg-purple-50" : "bg-[#312e81]"
                    }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(item.question)}
                    className="flex w-full items-center justify-between gap-3 text-left"
                    aria-expanded={openFaqItems.has(item.question)}
                  >
                    <h3 className={`text-base font-bold ${isLightMode ? "text-[#3b0764]" : "text-purple-50"}`}>
                      {item.question}
                    </h3>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 transition-transform ${openFaqItems.has(item.question)
                        ? "rotate-180"
                        : "rotate-0"
                        } ${isLightMode ? "text-purple-700" : "text-purple-100"}`}
                    />
                  </button>
                  <div
                    className={`grid transition-all duration-300 ${openFaqItems.has(item.question)
                      ? "mt-2 grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                      }`}
                  >
                    <p
                      className={`overflow-hidden text-sm leading-7 sm:text-base ${isLightMode ? "text-purple-900/80" : "text-purple-100/80"
                        }`}
                    >
                      {item.answer}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section
            className={`rounded-3xl border p-5 shadow-[0_7px_0_0_#9333ea] sm:p-6 ${isLightMode ? "border-purple-300/60 bg-white/95" : "border-purple-300/30 bg-[#1e1b4b]/90"
              }`}
          >
            <h2 className={`text-2xl font-extrabold ${isLightMode ? "text-[#3b0764]" : "text-purple-50"}`}>
              Nonton Anime Subtitle Indonesia di Nesiatv <span className="align-middle">📺</span>
            </h2>
            <p className={`mt-3 text-sm leading-7 sm:text-base ${isLightMode ? "text-purple-900/80" : "text-purple-100/80"}`}>
              Mencari tempat nonton anime, donghua & film subtitle Indonesia yang lengkap dan gratis? Nesiatv hadir sebagai solusi untuk
              kamu yang ingin menikmati anime Jepang, donghua China, dan berbagai film menarik dengan terjemahan bahasa
              Indonesia berkualitas.
            </p>
            <p className={`mt-3 text-sm leading-7 sm:text-base ${isLightMode ? "text-purple-900/80" : "text-purple-100/80"}`}>
              Di Nesiatv, kamu bisa menemukan judul-judul populer yang selalu update setiap hari. Dari genre
              action, romance, fantasy, hingga slice of life semuanya tersedia lengkap. Nesiatv juga mendukung
              tampilan yang nyaman di semua perangkat agar kamu bisa streaming tayangan favorit kapan saja.
            </p>
            <p className={`mt-3 text-sm leading-7 sm:text-base ${isLightMode ? "text-purple-900/80" : "text-purple-100/80"}`}>
              Bergabunglah dengan komunitas Nesiatv di Discord untuk berdiskusi, mendapatkan rekomendasi, dan
              selalu update dengan informasi terbaru seputar anime, donghua, dan film favoritmu.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
};

export default Landing;
