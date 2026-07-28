import React from 'react';
import { X, Copy } from 'lucide-react';
import {
  WhatsappShareButton,
  TelegramShareButton,
  TwitterShareButton,
  FacebookShareButton,
  WhatsappIcon,
  TelegramIcon,
  TwitterIcon,
  FacebookIcon,
} from 'react-share';
import { toast } from 'react-toastify';

const ShareModal = ({ isOpen, onClose, shareUrl, title }) => {
  if (!isOpen) return null;

  const urlToShare = shareUrl || window.location.href;
  const textToShare = title || 'Tonton anime gratis di Nesiatv!';

  const copyToClipboard = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(urlToShare);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = urlToShare;
        textarea.style.position = 'fixed';
        textarea.style.left = '-999999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      toast.success('Tautan berhasil disalin!');
      onClose();
    } catch (err) {
      toast.error('Gagal menyalin tautan');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label="Bagikan"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-800 bg-[#131622] p-5 text-left shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-lg font-bold text-white">Bagikan</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-slate-300">
          Pilih media sosial untuk membagikan tautan ini:
        </p>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={copyToClipboard}
            className="flex w-full items-center gap-3 rounded-xl border border-slate-800 bg-[#191d2d] px-3.5 py-3 text-left text-sm font-medium text-white transition-all hover:bg-[#20263a] hover:border-slate-700"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-700 text-slate-200">
              <Copy className="h-5 w-5" aria-hidden />
            </span>
            <div className="flex flex-col">
              <span className="font-bold">Salin Tautan</span>
              <span className="text-xs text-slate-400">Salin link langsung ke clipboard</span>
            </div>
          </button>

          <WhatsappShareButton
            url={urlToShare}
            title={textToShare}
            separator=" — "
            className="flex w-full items-center gap-3 rounded-xl border border-slate-800 bg-[#191d2d] px-3.5 py-3 text-left text-sm font-medium text-white transition-all hover:bg-[#20263a] hover:border-slate-700"
            resetButtonStyle={false}
            onClick={onClose}
          >
            <WhatsappIcon size={40} round />
            <div className="flex flex-col">
              <span className="font-bold">WhatsApp</span>
              <span className="text-xs text-slate-400">Bagikan ke obrolan atau status WhatsApp</span>
            </div>
          </WhatsappShareButton>

          <TwitterShareButton
            url={urlToShare}
            title={textToShare}
            className="flex w-full items-center gap-3 rounded-xl border border-slate-800 bg-[#191d2d] px-3.5 py-3 text-left text-sm font-medium text-white transition-all hover:bg-[#20263a] hover:border-slate-700"
            resetButtonStyle={false}
            onClick={onClose}
          >
            <TwitterIcon size={40} round />
            <div className="flex flex-col">
              <span className="font-bold">X (Twitter)</span>
              <span className="text-xs text-slate-400">Tweet ke pengikut X kamu</span>
            </div>
          </TwitterShareButton>

          <TelegramShareButton
            url={urlToShare}
            title={textToShare}
            className="flex w-full items-center gap-3 rounded-xl border border-slate-800 bg-[#191d2d] px-3.5 py-3 text-left text-sm font-medium text-white transition-all hover:bg-[#20263a] hover:border-slate-700"
            resetButtonStyle={false}
            onClick={onClose}
          >
            <TelegramIcon size={40} round />
            <div className="flex flex-col">
              <span className="font-bold">Telegram</span>
              <span className="text-xs text-slate-400">Kirim ke kontak atau grup Telegram</span>
            </div>
          </TelegramShareButton>

          <FacebookShareButton
            url={urlToShare}
            quote={textToShare}
            className="flex w-full items-center gap-3 rounded-xl border border-slate-800 bg-[#191d2d] px-3.5 py-3 text-left text-sm font-medium text-white transition-all hover:bg-[#20263a] hover:border-slate-700"
            resetButtonStyle={false}
            onClick={onClose}
          >
            <FacebookIcon size={40} round />
            <div className="flex flex-col">
              <span className="font-bold">Facebook</span>
              <span className="text-xs text-slate-400">Bagikan di beranda atau grup Facebook</span>
            </div>
          </FacebookShareButton>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
