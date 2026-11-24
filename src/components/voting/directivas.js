import { Users, Heart, Sparkles } from 'lucide-react';

// Identidad visual de cada directiva en la papeleta.
export const DIRECTIVA_STYLE = {
  CAB: { icon: Users, band: 'bg-blue-800', soft: 'bg-blue-50', text: 'text-blue-900', ring: 'ring-blue-800', avatar: 'bg-blue-100 text-blue-900' },
  DAM: { icon: Heart, band: 'bg-rose-700', soft: 'bg-rose-50', text: 'text-rose-900', ring: 'ring-rose-700', avatar: 'bg-rose-100 text-rose-900' },
  JOV: { icon: Sparkles, band: 'bg-teal-700', soft: 'bg-teal-50', text: 'text-teal-900', ring: 'ring-teal-700', avatar: 'bg-teal-100 text-teal-900' },
};

export const directivaStyle = (id) => DIRECTIVA_STYLE[id] || DIRECTIVA_STYLE.CAB;
