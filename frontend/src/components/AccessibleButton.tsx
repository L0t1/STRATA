import React from 'react';

function AccessibleButton({ children, className = '', style, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`button ${className}`.trim()}
      style={{ outline: '2px solid transparent', ...style }}
      aria-pressed={props['aria-pressed'] || false}
    >
      {children}
    </button>
  );
}

export default AccessibleButton;
