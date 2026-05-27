import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Minus } from 'lucide-react';

const faqs = [
  { q: "What is Sealed?", a: "Answer coming soon." },
  { q: "How does it work?", a: "Answer coming soon." },
  { q: "Is Sealed free?", a: "Answer coming soon." },
  { q: "Who can I send a letter to?", a: "Answer coming soon." },
  { q: "What can I include in a letter?", a: "Answer coming soon." },
  { q: "Can I edit a letter after it’s sealed?", a: "Answer coming soon." },
  { q: "What happens if I miss the open date?", a: "Answer coming soon." },
  { q: "Is my letter private?", a: "Answer coming soon." },
  { q: "What if the person I send a letter to doesn’t have the app?", a: "Answer coming soon." },
];

export default function FAQ() {
  return (
    <section className="py-24 px-6 bg-paper relative overflow-hidden">
      <div className="max-w-3xl mx-auto relative z-10">
        <h2 className="text-4xl font-serif mb-16 text-center">Frequently Asked Questions</h2>
        <div className="divide-y divide-black/10">
          {faqs.map((faq, i) => (
            <FAQItem key={i} question={faq.q} answer={faq.a} />
          ))}
        </div>
      </div>
    </section>
  );
}

interface FAQItemProps {
  question: string;
  answer: string;
  key?: number;
}

function FAQItem({ question, answer }: FAQItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="py-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left group"
      >
        <span className="text-lg font-medium group-hover:opacity-70 transition-opacity">{question}</span>
        {isOpen ? <Minus className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="pt-4 text-lg opacity-60 leading-relaxed">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
