import { useEffect } from 'react';

interface KeyboardShortcutsConfig {
  onNew?: () => void;
  onNewTab?: () => void;
  onSave?: () => void;
  onOpen?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

export const useKeyboardShortcuts = (config: KeyboardShortcutsConfig) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if the event target is an input or textarea (exclude shortcuts when typing)
      const isInputElement =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement;

      // Allow shortcuts with Ctrl/Cmd modifier
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      if (!isInputElement && isCtrlOrCmd) {
        switch (e.key.toLowerCase()) {
          case 'n':
            e.preventDefault();
            config.onNew?.();
            break;
          case 't':
            e.preventDefault();
            config.onNewTab?.();
            break;
          case 's':
            e.preventDefault();
            config.onSave?.();
            break;
          case 'o':
            e.preventDefault();
            config.onOpen?.();
            break;
          case 'z':
            e.preventDefault();
            config.onUndo?.();
            break;
          case 'y':
            e.preventDefault();
            config.onRedo?.();
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [config]);
};
