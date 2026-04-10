import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-chai-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          {
            'bg-chai-600 text-white hover:bg-chai-700 active:bg-chai-800':
              variant === 'primary',
            'bg-gray-200 text-gray-900 hover:bg-gray-300 active:bg-gray-400':
              variant === 'secondary',
            'bg-red-600 text-white hover:bg-red-700 active:bg-red-800':
              variant === 'danger',
            'bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200':
              variant === 'ghost',
          },
          {
            'px-3 py-1.5 text-sm': size === 'sm',
            'px-4 py-2 text-base': size === 'md',
            'px-6 py-3 text-lg': size === 'lg',
            'px-8 py-4 text-xl': size === 'xl',
          },
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
export { Button };
