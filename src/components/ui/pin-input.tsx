'use client';

import { cn } from '@/lib/utils';
import { useRef, useState, KeyboardEvent } from 'react';

interface PinInputProps {
  length?: number;
  onComplete: (pin: string) => void;
  disabled?: boolean;
  error?: string;
}

export function PinInput({
  length = 4,
  onComplete,
  disabled,
  error,
}: PinInputProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(''));
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newValues = [...values];
    newValues[index] = value.slice(-1);
    setValues(newValues);

    if (value && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }

    if (
      newValues.every((v) => v !== '') &&
      newValues.join('').length === length
    ) {
      onComplete(newValues.join(''));
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !values[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const reset = () => {
    setValues(Array(length).fill(''));
    inputsRef.current[0]?.focus();
  };

  return (
    <div>
      <div className="flex justify-center gap-3">
        {values.map((value, index) => (
          <input
            key={index}
            ref={(el) => {
              inputsRef.current[index] = el;
            }}
            type="password"
            inputMode="numeric"
            maxLength={1}
            value={value}
            disabled={disabled}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onFocus={(e) => e.target.select()}
            className={cn(
              'h-14 w-14 rounded-xl border-2 text-center text-2xl font-bold transition-colors focus:border-chai-500 focus:outline-none focus:ring-2 focus:ring-chai-500/20',
              error ? 'border-red-400' : 'border-gray-300',
              disabled && 'opacity-50'
            )}
          />
        ))}
      </div>
      {error && (
        <p className="mt-2 text-center text-sm text-red-600">{error}</p>
      )}
      <button
        type="button"
        onClick={reset}
        className="mt-2 w-full text-center text-sm text-gray-500 hover:text-gray-700"
      >
        Clear
      </button>
    </div>
  );
}
