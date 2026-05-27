import React from 'react';
import { Twitter, Instagram, Link2 } from 'lucide-react';

interface ShareButtonsProps {
  waitlistCount: number;
  className?: string;
}

export default function ShareButtons({ waitlistCount, className = "" }: ShareButtonsProps) {
  const shareText = `I just joined the waitlist for Sealed! I'm #${waitlistCount} on the list. Join me in writing letters to our future selves.`;
  const shareUrl = window.location.href;

  const shareOnTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    // Could add a toast here if needed
  };

  return (
    <div className={`flex flex-col items-center gap-6 ${className}`}>
      <p className="text-xs font-mono uppercase tracking-widest opacity-40 font-bold">Share with friends</p>
      <div className="flex gap-4">
        <button 
          onClick={shareOnTwitter}
          className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center hover:opacity-80 transition-all group"
          title="Share on Twitter"
        >
          <Twitter className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>
        <button 
          className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center hover:opacity-80 transition-all group"
          title="Share on Instagram"
        >
          <Instagram className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>
        <button 
          onClick={copyLink}
          className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center hover:opacity-80 transition-all group"
          title="Copy Link"
        >
          <Link2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>
      </div>
    </div>
  );
}
