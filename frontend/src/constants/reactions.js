import senangImg from '../assets/votes/senang.png';
import biasaAjaImg from '../assets/votes/biasa-aja.png';
import kecewaImg from '../assets/votes/kecewa.png';
import marahImg from '../assets/votes/marah.png';
import sedihImg from '../assets/votes/sedih.png';

/** Backend vote_type / chapter reaction_type keys (unchanged for API compatibility). */
export const REACTION_OPTIONS = [
  { id: 'senang', label: 'Suka', emoji: '😍', image: senangImg },
  { id: 'biasaAja', label: 'Lucu', emoji: '😂', image: biasaAjaImg },
  { id: 'kecewa', label: 'Terkejut', emoji: '😳', image: kecewaImg },
  { id: 'sedih', label: 'Sedih', emoji: '😭', image: sedihImg },
  { id: 'marah', label: 'Marah', emoji: '😡', image: marahImg },
];

export const emptyReactionCounts = () =>
  REACTION_OPTIONS.reduce((acc, { id }) => {
    acc[id] = 0;
    return acc;
  }, {});

export function sumReactionCounts(data) {
  if (!data || typeof data !== 'object') return 0;
  return REACTION_OPTIONS.reduce((sum, { id }) => sum + Number(data[id] || 0), 0);
}
