'use client';

import { usePlatform } from '../../lib/platform';
import { cn } from '../../lib/utils';

interface ShortcutHintProps {
  /** Key names without the modifier, e.g. "K" or "Shift+R". */
  keys: string;
  className?: string;
}

/**
 * Renders a keyboard shortcut using the modifier of the OS the app is running
 * on.
 *
 * The literal "Cmd + K" was previously hard-coded into the home page and the
 * empty-workspace state, which told Windows and Linux users to press a key that
 * does not exist on their keyboards. The non-macOS label is used for the first
 * paint so the pre-rendered HTML matches the client and no hydration warning is
 * raised; macOS users see "⌘K" immediately after mount.
 */
export function ShortcutHint({ keys, className }: ShortcutHintProps) {
  const platform = usePlatform();
  const label = platform === 'macos' ? `⌘${keys}` : `Ctrl+${keys}`;

  return (
    <kbd
      className={cn(
        'px-1.5 py-0.5 rounded border border-white/20 bg-white/5 text-white font-mono text-[11px]',
        className
      )}
    >
      {label}
    </kbd>
  );
}
