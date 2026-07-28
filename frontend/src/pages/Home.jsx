import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import {
  X,
  Share2,
  ExternalLink,
  Copy,
  Smartphone,
  Heart,
  ChevronRight,
  Tv,
  Film,
  Sparkles,
  Swords,
  Theater,
  Wand2,
  BookOpen,
} from "lucide-react";
import UpdateSection from "../components/UpdateSection";
import PopularSection from "../components/PopularSection";
import FeaturedBanner from "../components/FeaturedBanner";
import HomeCategorySection from "../components/HomeCategorySection";
import "../styles/featured-banner.css";
import { Link, useNavigate } from "react-router-dom";
import {
  WhatsappShareButton,
  TelegramShareButton,
  TwitterShareButton,
  WhatsappIcon,
  TelegramIcon,
  TwitterIcon,
} from "react-share";
import { toast } from "react-toastify";
import AOS from "aos";
import "aos/dist/aos.css";
import AdBanner from "../components/AdBanner";
import { useAds } from "../hooks/useAds";
import { apiClient } from "../utils/api";
import discordIcon from "../assets/discord.svg";
import LiveChatWidget from "../components/LiveChatWidget";
import LoginModal from "../components/LoginModal";
import ShareModal from "../components/ShareModal";
import { useChapterAccess } from "../hooks/useChapterAccess";

const Home = () => {
  const navigate = useNavigate();
  const { loginOpen, openChapter, handleLoginSuccess, closeLogin } = useChapterAccess();
  const [bannerManga, setBannerManga] = useState([]);
  const [bannerLoading, setBannerLoading] = useState(true);
  const [popupBannerVisible, setPopupBannerVisible] = useState(false);
  const [homePopupIntervalMinutes, setHomePopupIntervalMinutes] = useState(10);
  const [popupSettingsReady, setPopupSettingsReady] = useState(false);
  const [sharePopupOpen, setSharePopupOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
          toast.success("Aplikasi berhasil dipasang!");
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.error("Install prompt error:", err);
        toast.info("Silakan gunakan menu browser untuk 'Tambahkan ke Layar Utama'");
      }
    } else {
      toast.info("Silakan gunakan menu browser (titik 3) -> 'Tambahkan ke Layar Utama'");
    }
  };
  const shareUrl = typeof window !== "undefined" ? window.location.origin : "https://nesiatv.com";
  const shareTitle =
    "Baca anime, manga, manhwa, dan manhua Bahasa Indonesia di Nesiatv!";
  const discordInviteUrl = "https://discord.gg/dgC22PSm9h";
  const donateUrl = "https://trakteer.id/Nesiatv.id";

  const copyShareLink = async (context = "default") => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      if (context === "tiktok") {
        toast.success("Link disalin. Buka TikTok dan tempel di bio, DM, atau caption.");
      } else {
        toast.success("Tautan berhasil disalin.");
      }
    } catch {
      toast.error("Gagal menyalin. Salin manual: " + shareUrl);
    }
  };

  useEffect(() => {
    fetchBannerManga();
  }, []);

  const fetchBannerManga = async () => {
    try {
      const items = await apiClient.getFeaturedItems("banner", true);
      const sorted = items.sort((a, b) => a.display_order - b.display_order);
      setBannerManga(sorted);
    } catch (error) {
      console.error("Error fetching banner manga:", error);
    } finally {
      setBannerLoading(false);
    }
  };

  // Fetch ads by type
  const { ads: homeTopAds } = useAds("home-top");
  const { ads: populerAds } = useAds("populer");
  const { ads: homeFooterAds } = useAds("home-footer");
  const { ads: homePopupAds } = useAds("home-popup");

  useEffect(() => {
    apiClient
      .getSettings()
      .then((s) => {
        const v = s.home_popup_interval_minutes;
        if (Number.isFinite(v) && [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60].includes(v)) {
          setHomePopupIntervalMinutes(v);
        }
      })
      .catch(() => {})
      .finally(() => setPopupSettingsReady(true));
  }, []);

  useEffect(() => {
    AOS.init({
      duration: 600,
      once: true,
      easing: "ease-out-cubic",
    });
  }, []);

  // Home-only popup banner: jangan tampil sampai getSettings selesai (default 10 menit), baru pakai interval dari admin
  useEffect(() => {
    if (typeof window === "undefined" || !popupSettingsReady) return;

    try {
      const storageKey = "homePopupLastShownAt";
      const lastShownRaw = localStorage.getItem(storageKey);
      const intervalMs = homePopupIntervalMinutes * 60 * 1000;

      if (!lastShownRaw) {
        setPopupBannerVisible(true);
        return;
      }

      const lastShown = parseInt(lastShownRaw, 10);
      if (Number.isNaN(lastShown) || Date.now() - lastShown >= intervalMs) {
        setPopupBannerVisible(true);
      }
    } catch (error) {
      console.error("Error reading home popup timestamp:", error);
      setPopupBannerVisible(true);
    }
  }, [popupSettingsReady, homePopupIntervalMinutes]);

  const handleReadLatest = (latest, mangaSlug) => {
    if (latest?.slug) {
      openChapter(navigate, latest, true);
      return;
    }
    if (mangaSlug) navigate(`/anime/${mangaSlug}`);
  };

  const handleClosePopupBanner = () => {
    setPopupBannerVisible(false);

    if (typeof window === "undefined") return;

    try {
      const storageKey = "homePopupLastShownAt";
      localStorage.setItem(storageKey, Date.now().toString());
    } catch (error) {
      console.error("Error saving home popup timestamp:", error);
    }
  };

  return (
    <div className="pt-5 md:pt-20 pb-4">
      <Helmet>
        <title>Nesiatv | Nonton Anime, Manga, Manhwa, dan Manhua Bahasa Indonesia</title>
        <meta name="description" content="Baca anime, manga, manhwa, dan manhua bahasa Indonesia gratis di Nesiatv. Update terbaru, kualitas terbaik, dan mudah dibaca di semua perangkat." />
      </Helmet>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Home Top Ads - 6 ads */}
        {homeTopAds.length > 0 && (
          <div className="mb-4 md:mb-8" data-aos="fade-up">
            <AdBanner
              ads={homeTopAds}
              layout="grid"
              columns={2}
            />
          </div>
        )}

        {/* Home Popup Announcement Banner - fixed, centered, closeable */}
        {homePopupAds.length > 0 && popupBannerVisible && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
          >
            <div className="relative max-w-64 w-full">
              <button
                onClick={handleClosePopupBanner}
                className="absolute -top-2 -right-2 z-10 p-1.5 rounded-full bg-blue-700 dark:bg-blue-800 text-white hover:bg-blue-800 dark:hover:bg-blue-900 shadow-lg transition-colors"
                aria-label="Tutup banner"
              >
                <X className="h-5 w-5" />
              </button>
              <AdBanner
                ads={homePopupAds}
                layout="grid"
                columns={1}
              />
            </div>
          </div>
        )}
      </div>
      {/* Hero Section with Dark Background */}
   

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Featured Slider */}
        <div
          className="mb-12"
          data-aos="fade-up"
          data-aos-delay="100"
        >
          <FeaturedBanner
            items={bannerManga}
            loading={bannerLoading}
            onReadLatest={handleReadLatest}
          />
        </div>

        <div
          className="mx-auto mb-8 grid max-w-4xl grid-cols-1 gap-3 md:grid-cols-2 md:gap-4"
          data-aos="fade-up"
          data-aos-delay="120"
        >

          <a
            href="https://komiknesia.id/"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex w-full items-center gap-4 rounded-2xl border border-slate-700/90 bg-[#111827] p-4 text-left shadow-md transition-all hover:border-slate-600 hover:bg-slate-800/95 md:p-5"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white shadow-inner md:h-14 md:w-14">
              <BookOpen className="h-6 w-6 md:h-7 md:w-7" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-white md:text-lg">Baca Komik ID</p>
              <p className="text-sm text-slate-400">Baca Komik Bahasa Indonesia gratis</p>
            </div>
            <ExternalLink className="h-5 w-5 shrink-0 text-slate-500 group-hover:text-slate-300" aria-hidden />
          </a>

          <a
            href="https://nusakomik.id/"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex w-full items-center gap-4 rounded-2xl border border-slate-700/90 bg-[#111827] p-4 text-left shadow-md transition-all hover:border-slate-600 hover:bg-slate-800/95 md:p-5"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-inner md:h-14 md:w-14">
              <BookOpen className="h-6 w-6 md:h-7 md:w-7" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-white md:text-lg">Baca Komik (alternatif)</p>
              <p className="text-sm text-slate-400">Situs baca komik alternatif</p>
            </div>
            <ExternalLink className="h-5 w-5 shrink-0 text-slate-500 group-hover:text-slate-300" aria-hidden />
          </a>

          <a
            href={discordInviteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex w-full items-center gap-4 rounded-2xl border border-slate-700/90 bg-[#111827] p-4 text-left shadow-md transition-all hover:border-slate-600 hover:bg-slate-800/95 md:p-5"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#5865F2] text-white shadow-inner md:h-14 md:w-14">
              <img src={discordIcon} alt="" className="h-7 w-7" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-white md:text-lg">Discord</p>
              <p className="text-sm text-slate-400">Gabung komunitas pembaca</p>
            </div>
            <ExternalLink className="h-5 w-5 shrink-0 text-slate-500 group-hover:text-slate-300" aria-hidden />
          </a>

          <a
            href={donateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex w-full items-center gap-4 rounded-2xl border border-slate-700/90 bg-[#111827] p-4 text-left shadow-md transition-all hover:border-slate-600 hover:bg-slate-800/95 md:p-5"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-inner md:h-14 md:w-14">
              <Heart className="h-6 w-6 md:h-7 md:w-7" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-white md:text-lg">Donasi</p>
              <p className="text-sm text-slate-400">Dukung lewat Trakteer</p>
            </div>
            <ExternalLink className="h-5 w-5 shrink-0 text-slate-500 group-hover:text-slate-300" aria-hidden />
          </a>

          <button
            type="button"
            onClick={() => setSharePopupOpen(true)}
            className="group flex w-full items-center gap-4 rounded-2xl border border-slate-700/90 bg-[#111827] p-4 text-left shadow-md transition-all hover:border-slate-600 hover:bg-slate-800/95 md:p-5"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white shadow-inner md:h-14 md:w-14">
              <Share2 className="h-6 w-6 md:h-7 md:w-7" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-white md:text-lg">Share Nesiatv</p>
              <p className="text-sm text-slate-400">
                Salin tautan, WhatsApp, X, TikTok, Telegram
              </p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-300" aria-hidden />
          </button>

          <button
            type="button"
            onClick={handleInstallPwa}
            className="group flex w-full items-center gap-4 rounded-2xl border border-slate-700/90 bg-[#111827] p-4 text-left shadow-md transition-all hover:border-slate-600 hover:bg-slate-800/95 md:p-5"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-inner md:h-14 md:w-14">
              <Smartphone className="h-6 w-6 md:h-7 md:w-7" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-white md:text-lg">Unduh aplikasi</p>
              <p className="text-sm text-slate-400">Pasang ke layar utama (PWA)</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-300" aria-hidden />
          </button>
        </div>

        <ShareModal
          isOpen={sharePopupOpen}
          onClose={() => setSharePopupOpen(false)}
          shareUrl={shareUrl}
          title={shareTitle}
        />





        {/* 2. Anime Section */}
        <div data-aos="fade-up" data-aos-delay="160">
          <HomeCategorySection
            title="Anime"
            icon={Tv}
            iconBgGradient="from-indigo-600 to-blue-600"
            filterParams={{ type: "anime" }}
            viewAllUrl="/content?type=anime"
          />
        </div>

        {/* 3. Donghua Section */}
        <div data-aos="fade-up" data-aos-delay="175">
          <HomeCategorySection
            title="Donghua"
            icon={Sparkles}
            iconBgGradient="from-amber-500 to-red-500"
            filterParams={{ type: "donghua" }}
            viewAllUrl="/content?type=donghua"
          />
        </div>

        {/* 4. Film Section */}
        <div data-aos="fade-up" data-aos-delay="190">
          <HomeCategorySection
            title="Film"
            icon={Film}
            iconBgGradient="from-rose-600 to-pink-600"
            filterParams={{ type: "film" }}
            viewAllUrl="/content?type=film"
          />
        </div>

        {/* 5. New Episode (Update Section) */}
        <div data-aos="fade-up" data-aos-delay="200">
          <UpdateSection />
        </div>

        {/* Populer Ads - 4 ads above Popular Section */}
        {populerAds.length > 0 && (
          <div className="mb-8" data-aos="fade-up" data-aos-delay="220">
            <AdBanner
              ads={populerAds}
              layout="grid"
              columns={2}
            />
          </div>
        )}

        {/* 6. Populer Section */}
        <div data-aos="fade-up" data-aos-delay="240">
          <PopularSection />
        </div>

        {/* 7. Genre Action */}
        <div data-aos="fade-up" data-aos-delay="260">
          <HomeCategorySection
            title="Genre Action"
            icon={Swords}
            iconBgGradient="from-red-600 to-orange-600"
            filterParams={{ genre: "action" }}
            viewAllUrl="/content?genre=Action"
          />
        </div>

        {/* 8. Genre Drama */}
        <div data-aos="fade-up" data-aos-delay="280">
          <HomeCategorySection
            title="Genre Drama"
            icon={Theater}
            iconBgGradient="from-purple-600 to-indigo-600"
            filterParams={{ genre: "drama" }}
            viewAllUrl="/content?genre=Drama"
          />
        </div>

        {/* 9. Genre Fantasy */}
        <div data-aos="fade-up" data-aos-delay="300">
          <HomeCategorySection
            title="Genre Fantasy"
            icon={Wand2}
            iconBgGradient="from-emerald-600 to-teal-600"
            filterParams={{ genre: "fantasy" }}
            viewAllUrl="/content?genre=Fantasy"
          />
        </div>

        {/* 10. Genre Romance */}
        <div data-aos="fade-up" data-aos-delay="320">
          <HomeCategorySection
            title="Genre Romance"
            icon={Heart}
            iconBgGradient="from-pink-500 to-rose-500"
            filterParams={{ genre: "romance" }}
            viewAllUrl="/content?genre=Romance"
          />
        </div>

        {/* Home Footer Ads - 2 ads at bottom */}
        {homeFooterAds.length > 0 && (
          <div className="mt-8" data-aos="fade-up" data-aos-delay="350">
            <AdBanner
              ads={homeFooterAds}
              layout="grid"
              columns={2}
              className="mb-6"
            />
          </div>
        )}
      </div>

      <LiveChatWidget />

      <LoginModal
        open={loginOpen}
        onClose={closeLogin}
        onSuccess={() => handleLoginSuccess(navigate)}
      />
    </div>
  );
};

export default Home;
