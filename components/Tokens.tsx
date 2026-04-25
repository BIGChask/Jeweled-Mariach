import React from 'react';

export type TokenType = 'blue' | 'green' | 'heart' | 'marigold' | 'purple' | 'yellow';

interface TokenProps extends React.SVGProps<SVGSVGElement> {
  type: TokenType;
}

export const TokenIcon: React.FC<TokenProps> = ({ type, ...props }) => {
  switch (type) {
    case 'blue':
      return (
        <svg viewBox="0 0 100 100" className="drop-shadow-md" {...props}>
          <polygon points="50,5 95,45 50,95 5,45" fill="#0ea5e9" stroke="#0369a1" strokeWidth="4" strokeLinejoin="round" />
          <polygon points="50,15 80,45 50,85 20,45" fill="#38bdf8" />
          <polygon points="50,15 65,45 50,65 35,45" fill="#7dd3fc" />
          <polygon points="50,15 50,45 35,45" fill="#bae6fd" />
        </svg>
      );
    case 'green':
      return (
        <svg viewBox="0 0 100 100" className="drop-shadow-md" {...props}>
          <polygon points="30,5 70,5 95,50 70,95 30,95 5,50" fill="#22c55e" stroke="#15803d" strokeWidth="4" strokeLinejoin="round" />
          <polygon points="35,15 65,15 85,50 65,85 35,85 15,50" fill="#4ade80" />
          <polygon points="40,25 60,25 75,50 60,75 40,75 25,50" fill="#86efac" />
        </svg>
      );
    case 'heart':
      return (
        <svg viewBox="0 0 100 100" className="drop-shadow-md" {...props}>
          <path d="M50,90 C50,90 5,60 5,30 C5,10 25,5 50,30 C75,5 95,10 95,30 C95,60 50,90 50,90 Z" fill="#ef4444" stroke="#b91c1c" strokeWidth="4" strokeLinejoin="round" />
          <path d="M25,25 Q40,15 50,35" fill="none" stroke="#fca5a5" strokeWidth="6" strokeLinecap="round" />
        </svg>
      );
    case 'marigold':
      return (
        <svg viewBox="0 0 100 100" className="drop-shadow-md" {...props}>
          <circle cx="50" cy="50" r="45" fill="#f97316" stroke="#c2410c" strokeWidth="4" />
          {/* Petals */}
          {Array.from({ length: 12 }).map((_, i) => (
            <ellipse key={i} cx="50" cy="20" rx="10" ry="20" fill="#fbbf24" stroke="#d97706" strokeWidth="2" transform={`rotate(${i * 30} 50 50)`} />
          ))}
          <circle cx="50" cy="50" r="20" fill="#ea580c" />
          <circle cx="50" cy="50" r="10" fill="#c2410c" />
        </svg>
      );
    case 'purple':
      return (
        <svg viewBox="0 0 100 100" className="drop-shadow-md" {...props}>
          <polygon points="50,5 90,30 90,70 50,95 10,70 10,30" fill="#a855f7" stroke="#7e22ce" strokeWidth="4" strokeLinejoin="round" />
          <polygon points="50,15 80,35 80,65 50,85 20,65 20,35" fill="#c084fc" />
          <polygon points="50,25 70,40 70,60 50,75 30,60 30,40" fill="#d8b4fe" />
          <polygon points="50,25 50,50 30,40" fill="#f3e8ff" />
        </svg>
      );
    case 'yellow':
      return (
        <svg viewBox="0 0 100 100" className="drop-shadow-md" {...props}>
          <polygon points="50,5 80,95 20,95" fill="#eab308" stroke="#a16207" strokeWidth="4" strokeLinejoin="round" />
          <polygon points="50,20 70,85 30,85" fill="#facc15" />
          <polygon points="50,35 60,75 40,75" fill="#fef08a" />
        </svg>
      );
    default:
      return null;
  }
};
