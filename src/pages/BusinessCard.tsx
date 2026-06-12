import { Phone, Mail, Globe, MessageCircle, MapPin } from 'lucide-react';

interface CardData {
  slug: string;
  businessName: string;
  tagline: string;
  location: string;
  phone: string;          // e.g. "+14071234567"
  phoneDisplay: string;   // e.g. "(407) 123-4567"
  whatsapp: string;       // e.g. "+14071234567"
  email: string;
  website: string;
  instagram: string;      // handle without @
  logoText: string;       // initials fallback
  accentColor: string;    // tailwind color class
}

const CARDS: Record<string, CardData> = {
  lml: {
    slug:         'lml',
    businessName: 'LML Service Solution',
    tagline:      'Professional House Cleaning & Maid Service',
    location:     'Kissimmee, FL',
    phone:        '+14071234567',        // TODO: substituir pelo número Twilio/real
    phoneDisplay: '(407) 123-4567',     // TODO: substituir
    whatsapp:     '+14071234567',        // TODO: substituir
    email:        'contact@lmlservice.com', // TODO: substituir
    website:      'landing-lml.vercel.app',
    instagram:    'lmlservicesolution',  // TODO: confirmar handle
    logoText:     'LML',
    accentColor:  '#7c3aed',
  },
};

function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 text-center p-6">
      <p className="text-gray-400 text-sm">Card not found.</p>
    </div>
  );
}

export default function BusinessCard({ slug }: { slug: string }) {
  const card = CARDS[slug];
  if (!card) return <NotFound />;

  const accent = card.accentColor;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Card */}
        <div className="bg-white rounded-3xl overflow-hidden shadow-2xl">

          {/* Header */}
          <div className="relative h-28 flex items-end px-6 pb-0" style={{ background: `linear-gradient(135deg, ${accent}ee, ${accent}99)` }}>
            {/* Logo circle */}
            <div
              className="absolute -bottom-8 left-6 w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg border-4 border-white"
              style={{ background: accent }}
            >
              {card.logoText}
            </div>
          </div>

          {/* Body */}
          <div className="pt-12 px-6 pb-6 space-y-4">
            <div>
              <h1 className="text-xl font-black text-gray-900 leading-tight">{card.businessName}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{card.tagline}</p>
              <div className="flex items-center gap-1.5 mt-2">
                <MapPin size={12} className="text-gray-400" />
                <span className="text-xs text-gray-400">{card.location}</span>
              </div>
            </div>

            {/* CTA principal — WhatsApp */}
            <a
              href={`https://wa.me/${card.whatsapp.replace(/\D/g, '')}?text=Hi! I found your card and would like to request a cleaning quote.`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-white font-black text-sm shadow-lg transition active:scale-95"
              style={{ background: accent }}
            >
              <MessageCircle size={18} /> Get a Free Quote on WhatsApp
            </a>

            {/* Links */}
            <div className="grid grid-cols-2 gap-2">
              <a
                href={`tel:${card.phone}`}
                className="flex items-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-2xl transition"
              >
                <Phone size={16} style={{ color: accent }} />
                <div>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Call Us</p>
                  <p className="text-xs text-gray-700 font-bold">{card.phoneDisplay}</p>
                </div>
              </a>

              <a
                href={`mailto:${card.email}`}
                className="flex items-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-2xl transition"
              >
                <Mail size={16} style={{ color: accent }} />
                <div>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Email</p>
                  <p className="text-xs text-gray-700 font-bold truncate max-w-[80px]">{card.email.split('@')[0]}</p>
                </div>
              </a>

              <a
                href={`https://${card.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-2xl transition"
              >
                <Globe size={16} style={{ color: accent }} />
                <div>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Website</p>
                  <p className="text-xs text-gray-700 font-bold">See Our Work</p>
                </div>
              </a>

              <a
                href={`https://instagram.com/${card.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-2xl transition"
              >
                {/* Instagram icon inline SVG */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: accent }}>
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
                <div>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Instagram</p>
                  <p className="text-xs text-gray-700 font-bold">@{card.instagram.slice(0, 10)}</p>
                </div>
              </a>
            </div>

            {/* Services tags */}
            <div className="flex flex-wrap gap-1.5">
              {['Deep Cleaning', 'Move In/Out', 'Weekly & Bi-weekly', 'Commercial'].map(tag => (
                <span key={tag} className="px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ background: `${accent}18`, color: accent }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-[10px] text-gray-300">Powered by BTechSouto</p>
            <a
              href={`https://wa.me/${card.whatsapp.replace(/\D/g, '')}?text=Hi! I found your card and would like to request a cleaning quote.`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-bold"
              style={{ color: accent }}
            >
              Save Contact →
            </a>
          </div>
        </div>

        {/* QR hint */}
        <p className="text-center text-white/30 text-xs mt-4">Share this link or scan QR code</p>
      </div>
    </div>
  );
}
