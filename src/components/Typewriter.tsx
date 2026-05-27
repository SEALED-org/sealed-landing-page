import React, { useState, useEffect } from 'react';

export const typewriterPhrases = [
  "To the person you're becoming",
  "Because you're proud of yourself and you don't say that enough",
  "If you're about to take a risk",
  "Because you want to make a promise to yourself and this makes it real",
  "To reflect on the messy middle that no one talks about",
  "So you don't forget why you started",
  "To celebrate a recent win",
  "So future you has something to open when things get heavy",
  "Because a chapter is ending and you want to close it with intention",
  "To realize one day you were exactly where you needed to be",
  "From the version of you who is doing it scared",
  "To capture what you're feeling before life moves too fast",
  "For the adventure you're about to take",
  "So future you remembers how strong you were right now"
];

interface TypewriterProps {
  phrases: string[];
  className?: string;
}

export default function Typewriter({ phrases, className }: TypewriterProps) {
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isWaiting, setIsWaiting] = useState(false);

  useEffect(() => {
    const fullText = phrases[currentPhraseIndex];
    
    if (isWaiting) {
      const timer = setTimeout(() => {
        setCurrentText("");
        setIsWaiting(false);
        setCurrentPhraseIndex((prev) => (prev + 1) % phrases.length);
      }, 20);
      return () => clearTimeout(timer);
    }

    if (currentText.length < fullText.length) {
      const timer = setTimeout(() => {
        setCurrentText(fullText.substring(0, currentText.length + 1));
      }, 30);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setIsWaiting(true);
      }, 3000); // Stay on full quote for 3s
      return () => clearTimeout(timer);
    }
  }, [currentText, isWaiting, currentPhraseIndex, phrases]);

  return (
    <span className={`inline-block ${className || ""}`}>
      {currentText}
      <span className="animate-pulse ml-1">|</span>
    </span>
  );
}
