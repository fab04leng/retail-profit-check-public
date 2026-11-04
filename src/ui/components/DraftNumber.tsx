import { useState, type InputHTMLAttributes } from 'react';

/**
 * Number input that keeps what the user is typing and only commits values that are
 * complete and within limits; out-of-range values are clamped when the field loses focus.
 */
export function DraftNumber({ value, onCommit, min, max, ...rest }: { value: number; onCommit: (n: number) => void; min?: number; max?: number } & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'min' | 'max'>) {
  const [draft, setDraft] = useState(String(value));
  const [shown, setShown] = useState(value);
  if (shown !== value) {
    // The value changed from outside (e.g. "Reset all"): show it.
    setShown(value);
    setDraft(String(value));
  }
  const inRange = (n: number) => (min === undefined || n >= min) && (max === undefined || n <= max);
  const finish = () => {
    const n = Number(draft);
    if (draft.trim() === '' || !Number.isFinite(n)) setDraft(String(value));
    else {
      const c = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));
      if (c !== value) onCommit(c);
      setDraft(String(c));
    }
  };
  return (
    <input
      {...rest}
      type="number"
      inputMode="decimal"
      min={min}
      max={max}
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value);
        const n = Number(e.target.value);
        if (e.target.value.trim() !== '' && Number.isFinite(n) && inRange(n) && n !== value) onCommit(n);
      }}
      onBlur={finish}
      onKeyDown={(e) => {
        if (e.key === 'Enter') finish();
      }}
    />
  );
}
