import { useState } from 'react';
import { Share2, Link, Check } from 'lucide-react';

interface ShareRowProps {
  variant?: 'light' | 'dark';
}

export default function ShareRow({ variant = 'light' }: ShareRowProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleShare = () => {
    const text = encodeURIComponent('I just sealed a letter to my 2027 self. Join me — @sealedapp_io');
    const url = encodeURIComponent('https://sealedapp.io');
    window.open(
      'https://x.com/intent/tweet?text=' + text + '&url=' + url,
      '_blank',
      'noopener,noreferrer',
    );
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText('https://sealedapp.io');
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // reset after 2s
    } catch {
      // Clipboard blocked — do not show false success (D-08 spirit)
    }
  };

  const rowClass = `share-row${variant === 'dark' ? ' share-row--dark' : ''}`;

  return (
    <div className={rowClass}>
      <button
        type="button"
        className="share-btn"
        aria-label="Share on X"
        onClick={handleShare}
      >
        <Share2 size={14} aria-hidden="true" />
        <span>Share</span>
      </button>
      <button
        type="button"
        className="share-btn"
        aria-label="Copy link"
        onClick={handleCopy}
      >
        {isCopied ? (
          <>
            <Check size={14} aria-hidden="true" />
            <span>Copied</span>
          </>
        ) : (
          <>
            <Link size={14} aria-hidden="true" />
            <span>Copy link</span>
          </>
        )}
      </button>
    </div>
  );
}
