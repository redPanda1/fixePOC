import { useRef, type ClipboardEvent, type FocusEvent, type KeyboardEvent } from 'react';
import { Stack, TextField } from '@mui/material';

interface OtpCodeInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
}

export default function OtpCodeInput({
  length = 6,
  value,
  onChange,
  autoFocus,
}: OtpCodeInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  const setDigit = (index: number, digit: string) => {
    const chars = digits.slice();
    chars[index] = digit;
    onChange(chars.join('').replace(/\s+$/, ''));
  };

  const handleChange = (index: number, raw: string) => {
    const char = raw.replace(/[^0-9]/g, '').slice(-1);
    setDigit(index, char);
    if (char && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Backspace') return;
    // Handle deletion ourselves rather than relying on the browser's native text
    // deletion: a single-character box doesn't reliably place the cursor after the
    // character on click/focus, which can make native backspace a no-op.
    event.preventDefault();
    if (digits[index]) {
      setDigit(index, '');
      return;
    }
    if (index > 0) {
      setDigit(index - 1, '');
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
    event.target.select();
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, length);
    if (!pasted) return;
    onChange(pasted);
    inputRefs.current[Math.min(pasted.length, length - 1)]?.focus();
  };

  return (
    <Stack direction="row" spacing={1} sx={{ justifyContent: 'center' }}>
      {digits.map((digit, index) => (
        <TextField
          key={index}
          inputRef={(el: HTMLInputElement | null) => {
            inputRefs.current[index] = el;
          }}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onFocus={handleFocus}
          onPaste={handlePaste}
          autoFocus={autoFocus && index === 0}
          slotProps={{
            htmlInput: {
              inputMode: 'numeric',
              maxLength: 1,
              'aria-label': `Reset code digit ${index + 1}`,
              sx: { textAlign: 'center', fontSize: '1.25rem', px: 0 },
            },
          }}
          sx={{ width: 48 }}
        />
      ))}
    </Stack>
  );
}
