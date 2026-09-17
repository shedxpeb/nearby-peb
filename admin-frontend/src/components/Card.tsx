import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'xs' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export default function Card({ children, className = '', padding = 'md', onClick }: CardProps) {
  const paddingClasses = {
    xs: 'p-3',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div 
      className={`bg-white rounded-xl border border-slate-200 shadow-sm ${paddingClasses[padding]} ${className} ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
