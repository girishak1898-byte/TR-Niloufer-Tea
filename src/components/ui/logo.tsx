import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Logo({ size = 'md', className }: LogoProps) {
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-16 w-16 text-lg',
  };

  return (
    <div
      className={cn(
        'relative flex items-center justify-center rounded-xl bg-gradient-to-br from-chai-500 to-chai-700 shadow-sm',
        sizeClasses[size],
        className
      )}
    >
      <svg
        viewBox="0 0 40 40"
        fill="none"
        className="absolute inset-0 h-full w-full p-1.5"
      >
        {/* Steam lines */}
        <path
          d="M14 12c0-2 1.5-3 1.5-5"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path
          d="M20 10c0-2 1.5-3 1.5-5"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path
          d="M26 12c0-2 1.5-3 1.5-5"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        {/* Cup body */}
        <rect
          x="10"
          y="14"
          width="20"
          height="14"
          rx="3"
          fill="white"
          fillOpacity="0.9"
        />
        {/* Cup handle */}
        <path
          d="M30 17h2a3 3 0 0 1 0 6h-2"
          stroke="white"
          strokeWidth="2"
          strokeOpacity="0.9"
          fill="none"
        />
        {/* TR text */}
        <text
          x="20"
          y="24"
          textAnchor="middle"
          fill="#a65219"
          fontWeight="800"
          fontSize="9"
          fontFamily="system-ui, sans-serif"
        >
          TR
        </text>
        {/* Saucer */}
        <ellipse
          cx="20"
          cy="30"
          rx="13"
          ry="2.5"
          fill="white"
          fillOpacity="0.7"
        />
      </svg>
    </div>
  );
}

export function LogoWithText({
  size = 'md',
  className,
}: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <Logo size={size} />
      <div className="flex flex-col">
        <span className="text-sm font-bold leading-tight text-chai-800">
          TR Hyderabad
        </span>
        <span className="text-xs font-medium leading-tight text-chai-600">
          Tea Shop
        </span>
      </div>
    </div>
  );
}
