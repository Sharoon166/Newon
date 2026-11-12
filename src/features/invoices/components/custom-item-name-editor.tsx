'use client';

import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';

interface CustomItemNameEditorProps {
  /** Name the line currently has - shown until the edit is committed. */
  initialValue: string;
  /** Called once with the trimmed name when the edit is committed. */
  onCommit: (value: string) => void;
  /** Called to leave edit mode (Enter, Escape or the check button). */
  onClose: () => void;
}

/**
 * Inline name editor for hand-typed ("custom") invoice / quotation lines.
 *
 * The draft lives in local state on purpose. Writing to react-hook-form on
 * every keystroke re-renders the whole document form (the `items` watch
 * re-groups every line, rebuilds the stock map and redraws the product
 * selector) and runs a full-schema validation per character, which reads as
 * severe input lag. Here the form is only touched once - on commit.
 */
export function CustomItemNameEditor({ initialValue, onCommit, onClose }: CustomItemNameEditorProps) {
  const [draft, setDraft] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const commit = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      // A blank name would fail schema validation and print an unnamed line.
      setDraft(initialValue);
      return;
    }
    setDraft(trimmed);
    if (trimmed !== initialValue) onCommit(trimmed);
  };

  return (
    <Input
      ref={inputRef}
      aria-label="Custom item name"
      value={draft}
      onChange={event => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={event => {
        if (event.key === 'Enter') {
          event.preventDefault();
          commit();
          onClose();
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose();
        }
      }}
      className="h-8 max-w-sm text-sm"
    />
  );
}
