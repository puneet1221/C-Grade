import { Star } from 'lucide-react';
import { useState } from 'react';
import { getVerdictLabel } from '../../utils/constants.js';

/**
 * Interactive half-star rating selector (0.5 to 5.0) with live verdict label,
 * keyboard accessibility, and read-only display mode.
 */
export function HalfStarRating({
  value = 0,
  onChange,
  readOnly = false,
  size = 'md',
  showVerdict = true,
}) {
  const [hoverValue, setHoverValue] = useState(null);
  const displayValue = hoverValue !== null ? hoverValue : Number(value) || 0;

  const sizeMap = {
    sm: 'h-3.5 w-3.5',
    md: 'h-5 w-5',
    lg: 'h-7 w-7',
  };
  const iconClass = sizeMap[size] || sizeMap.md;

  function handleKeyDown(e) {
    if (readOnly || !onChange) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(Math.min(5, Math.max(0.5, (Number(value) || 0) + 0.5)));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(Math.max(0.5, (Number(value) || 1) - 0.5));
    }
  }

  return (
    <div className="inline-flex flex-wrap items-center gap-3">
      <div
        className="inline-flex items-center gap-1"
        role={readOnly ? 'img' : 'slider'}
        aria-label={readOnly ? `Rated ${displayValue} out of 5 stars` : 'Select star rating'}
        aria-valuemin={readOnly ? undefined : 0.5}
        aria-valuemax={readOnly ? undefined : 5}
        aria-valuenow={readOnly ? undefined : displayValue}
        tabIndex={readOnly ? undefined : 0}
        onKeyDown={handleKeyDown}
        onMouseLeave={() => !readOnly && setHoverValue(null)}
      >
        {[1, 2, 3, 4, 5].map((starIndex) => {
          const leftVal = starIndex - 0.5;
          const rightVal = starIndex;
          const fillRatio =
            displayValue >= rightVal ? 1 : displayValue >= leftVal ? 0.5 : 0;

          return (
            <div key={starIndex} className="relative inline-flex items-center justify-center">
              {/* Base empty star */}
              <Star className={`${iconClass} text-zinc-700`} strokeWidth={1.6} aria-hidden="true" />

              {/* Filled overlay clipped to 50% or 100% */}
              {fillRatio > 0 && (
                <div
                  className="pointer-events-none absolute inset-y-0 left-0 overflow-hidden"
                  style={{ width: fillRatio === 0.5 ? '50%' : '100%' }}
                >
                  <Star
                    className={`${iconClass} fill-amber-400 text-amber-400`}
                    strokeWidth={1.6}
                    aria-hidden="true"
                  />
                </div>
              )}

              {/* Interactive half-star hit targets */}
              {!readOnly && (
                <>
                  <button
                    type="button"
                    aria-label={`Rate ${leftVal} stars`}
                    onMouseEnter={() => setHoverValue(leftVal)}
                    onClick={() => onChange?.(leftVal)}
                    className="absolute inset-y-0 left-0 w-1/2 cursor-pointer focus:outline-none"
                  />
                  <button
                    type="button"
                    aria-label={`Rate ${rightVal} stars`}
                    onMouseEnter={() => setHoverValue(rightVal)}
                    onClick={() => onChange?.(rightVal)}
                    className="absolute inset-y-0 right-0 w-1/2 cursor-pointer focus:outline-none"
                  />
                </>
              )}
            </div>
          );
        })}
      </div>

      {showVerdict && (
        <div className="flex items-center gap-2 text-sm">
          <span className="font-mono-tabular font-semibold text-amber-400">
            {displayValue > 0 ? displayValue.toFixed(1) : '—'}
          </span>
          <span className="text-zinc-500" aria-hidden="true">
            ·
          </span>
          <span className="text-zinc-300">{getVerdictLabel(displayValue)}</span>
        </div>
      )}
    </div>
  );
}
