import ShareRow from './ShareRow';

interface WaitlistSuccessCardProps {
  onWriteLetter: () => void;
  isVisible: boolean;
}

export default function WaitlistSuccessCard({ onWriteLetter, isVisible }: WaitlistSuccessCardProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="waitlist-success" aria-live="polite">
      <div className="wls-card">
        <div className="wls-head">
          <div className="wls-mark" aria-hidden="true">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <div className="wls-title">Added to waitlist.</div>
          </div>
        </div>
        <div className="wls-divider" />
        <button type="button" className="wls-next" onClick={onWriteLetter}>
          Write your first letter now
          <span className="arrow" aria-hidden="true">↓</span>
        </button>
        <ShareRow />
      </div>
    </div>
  );
}
