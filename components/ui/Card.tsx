import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  innerClassName?: string;
  noPadding?: boolean;
}

export function Card({ 
  className, 
  innerClassName, 
  children, 
  noPadding = false,
  ...props 
}: CardProps) {
  return (
    <div
      className={cn(
        'bento-card',
        className
      )}
      {...props}
    >
      <div
        className={cn(
          'relative h-full w-full',
          !noPadding && 'p-8 md:p-10',
          innerClassName
        )}
      >
        {children}
      </div>
    </div>
  );
}
