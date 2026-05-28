import { useState } from 'react';

interface FaqEntry {
  q: string;
  a: string;
}

const faqs: FaqEntry[] = [
  {
    q: 'What is SEALED?',
    a: "SEALED is an app for writing letters to your future self. You write when something matters, pick the day the letter opens, and seal it. Once sealed, the letter is locked. No one can read it until the delivery date. Not even you.<br><br>When the day comes, your letter arrives in the app and to your email. You can write from the iOS app or the web. It’s built on a simple belief: some things are worth writing down before you forget why they mattered.",
  },
  {
    q: 'Is SEALED free?',
    a: 'Yes. Write as many letters as you want, with delivery dates up to one year out.<br><br>A premium plan unlocks longer time horizons, plus the ability to attach photos and voice notes to your letters.',
  },
  {
    q: 'Who can I send a letter to?',
    a: "Right now, you. Only you.<br><br>SEALED is built for letters to your future self. The experience is personal, private, and designed around the act of writing to the person you’re becoming. Sending to others is something we’re exploring for future releases.",
  },
  {
    q: 'What can I include in a letter?',
    a: "Your words. Write as much or as little as you want.<br><br>Photos and voice notes are coming with premium, so you can attach the sound of a room or a face you don’t want to forget. But the core of every letter is always text. Some things are better written.",
  },
  {
    q: 'Can I edit a letter after it’s sealed?',
    a: "No. Once sealed, a letter cannot be opened or edited.<br><br>You can delete a letter within 24 hours of sealing it. After that, it’s permanent. No edits, no deletions, no exceptions. A letter you can take back isn’t a letter worth opening.",
  },
  {
    q: 'Is my letter private?',
    a: "Yes. Once you seal a letter, it's locked at the database level until the open date — no peeking, no editing, no early access, not even by you. We built the lock that way on purpose: sealing is a one-way commitment, and the system enforces it. Sealed means sealed.",
  },
  {
    q: 'Why not just schedule the email from Gmail or Outlook?',
    a: "Gmail and Outlook are built for short-term communication, not messages meant to survive years into the future. Accounts can be disabled after long periods of inactivity, emails can fail without you realizing. <strong>Simply put: there's no long-term guarantee that a scheduled email will actually be delivered years later.</strong> SEALED is built specifically for long-term delivery, with a clear promise, safeguards, and an experience designed around intentional messages to your future self or others, not everyday inbox management.",
  },
  {
    q: 'What if you shut down the app? What happens to my letters?',
    a: "SEALED is a long-term commitment, not a side project. We're not planning to shut down — we know how much these letters matter, and we've built the company around outlasting them. But if the unthinkable ever happened, we're committed to delivering every last letter on its open date, even after the service itself stops. A sealed letter is a promise. We keep it, no matter what.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="faq">
      <div className="faq-inner">
        <div className="faq-head">
          <h2>Frequently Asked Questions (FAQs)</h2>
        </div>
        <div className="faq-list" id="faq-list">
          {faqs.map((f, i) => {
            const isOpen = openIndex === i;
            const num = String(i + 1).padStart(2, '0');
            return (
              <div key={i} className={`faq-item${isOpen ? ' open' : ''}`}>
                <button
                  className="faq-q"
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  aria-expanded={isOpen}
                >
                  <span
                    className="num"
                    style={{ ['--faq-i' as string]: String(i) } as React.CSSProperties}
                  >
                    {num}
                  </span>
                  <span className="label">{f.q}</span>
                  <svg
                    className="faq-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
                <div className="faq-a">
                  <div
                    className="faq-a-inner"
                    dangerouslySetInnerHTML={{ __html: f.a }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
