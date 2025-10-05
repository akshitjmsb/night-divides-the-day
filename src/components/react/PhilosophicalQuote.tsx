import React from 'react';

interface PhilosophicalQuoteProps {
  quote: string;
  author: string;
}

export const PhilosophicalQuote: React.FC<PhilosophicalQuoteProps> = ({ quote, author }) => {
  return (
    <div className="life-pointer">
      <div className="quote-text">"{quote}"</div>
      <div className="quote-author">— {author}</div>
    </div>
  );
};
