import React from 'react';

export const PapelPicado = ({ className }: { className?: string }) => {
  return (
    <div className={`w-full overflow-hidden flex justify-around opacity-90 ${className}`}>
      {[ '#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316' ].map((color, i) => (
        <svg key={i} width="60" height="80" viewBox="0 0 60 80" className="mx-1 transform origin-top animate-swing" style={{ animationDelay: `${i * 0.2}s` }}>
          <rect x="0" y="0" width="60" height="70" fill={color} />
          {/* Scalloped bottom edge */}
          <path d="M0,70 Q5,80 10,70 Q15,80 20,70 Q25,80 30,70 Q35,80 40,70 Q45,80 50,70 Q55,80 60,70 L60,0 L0,0 Z" fill={color} />
          
          {/* Cutouts */}
          <circle cx="30" cy="30" r="8" fill="transparent" stroke="white" strokeWidth="2" strokeDasharray="4 4" className="mix-blend-overlay" />
          <polygon points="30,10 40,25 20,25" fill="transparent" stroke="white" strokeWidth="2" className="mix-blend-overlay" />
          <circle cx="15" cy="45" r="4" fill="white" className="mix-blend-overlay opacity-50" />
          <circle cx="45" cy="45" r="4" fill="white" className="mix-blend-overlay opacity-50" />
          <rect x="25" y="45" width="10" height="15" fill="transparent" stroke="white" strokeWidth="2" className="mix-blend-overlay" />
          
          {/* Top String connection */}
          <line x1="0" y1="0" x2="60" y2="0" stroke="white" strokeWidth="2" opacity="0.5" />
        </svg>
      ))}
    </div>
  );
};
