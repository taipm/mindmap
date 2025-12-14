import { create } from 'zustand';

export interface Tab {
  id: string;
  filename: string;
  title: string;
  unsavedChanges: boolean;
  createdAt: number;
}

interface TabsStore {
  tabs: Tab[];
  activeTabId: string | null;

  // Tab operations
  createTab: (filename?: string) => string;
  closeTab: (tabId: string) => void;
  switchTab: (tabId: string) => void;
  renameTab: (tabId: string, newFilename: string) => void;
  markTabAsUnsaved: (tabId: string) => void;
  markTabAsSaved: (tabId: string) => void;

  // Utility
  getActiveTab: () => Tab | null;
  hasUnsavedTabs: () => boolean;
}

export const useTabsStore = create<TabsStore>((set, get) => {
  // Load tabs from localStorage
  let initialTabs: Tab[] = [];
  let initialActiveTabId: string | null = null;

  try {
    const stored = localStorage.getItem('mindmap_tabs');
    if (stored) {
      const data = JSON.parse(stored);
      initialTabs = data.tabs || [];
      initialActiveTabId = data.activeTabId || null;
    }
  } catch (error) {
    console.warn('Failed to load tabs from localStorage:', error);
  }

  // If no tabs exist, create a default one
  if (initialTabs.length === 0) {
    const defaultTabId = `tab-${Date.now()}`;
    initialTabs = [{
      id: defaultTabId,
      filename: 'Untitled',
      title: 'Untitled',
      unsavedChanges: false,
      createdAt: Date.now(),
    }];
    initialActiveTabId = defaultTabId;
  }

  return {
    tabs: initialTabs,
    activeTabId: initialActiveTabId,

    createTab: (filename?: string) => {
      const newTabId = `tab-${Date.now()}`;
      const newTab: Tab = {
        id: newTabId,
        filename: filename || 'Untitled',
        title: filename || 'Untitled',
        unsavedChanges: false,
        createdAt: Date.now(),
      };

      set((state) => {
        const updatedTabs = [...state.tabs, newTab];
        // Save to localStorage
        try {
          localStorage.setItem('mindmap_tabs', JSON.stringify({
            tabs: updatedTabs,
            activeTabId: newTabId,
          }));
        } catch (error) {
          console.warn('Failed to save tabs to localStorage:', error);
        }

        return {
          tabs: updatedTabs,
          activeTabId: newTabId,
        };
      });

      return newTabId;
    },

    closeTab: (tabId: string) => {
      set((state) => {
        let remainingTabs = state.tabs.filter((t) => t.id !== tabId);

        // If closing the active tab, switch to another
        let newActiveTabId = state.activeTabId;
        if (state.activeTabId === tabId) {
          newActiveTabId = remainingTabs.length > 0 ? remainingTabs[0].id : null;
        }

        // Keep at least one tab (Untitled)
        if (remainingTabs.length === 0) {
          const defaultTabId = `tab-${Date.now()}`;
          remainingTabs = [{
            id: defaultTabId,
            filename: 'Untitled',
            title: 'Untitled',
            unsavedChanges: false,
            createdAt: Date.now(),
          }];
          newActiveTabId = defaultTabId;
        }

        // Save to localStorage
        try {
          localStorage.setItem('mindmap_tabs', JSON.stringify({
            tabs: remainingTabs,
            activeTabId: newActiveTabId,
          }));
        } catch (error) {
          console.warn('Failed to save tabs to localStorage:', error);
        }

        return {
          tabs: remainingTabs,
          activeTabId: newActiveTabId,
        };
      });
    },

    switchTab: (tabId: string) => {
      set((state) => {
        if (state.tabs.find((t) => t.id === tabId)) {
          // Save to localStorage
          try {
            localStorage.setItem('mindmap_tabs', JSON.stringify({
              tabs: state.tabs,
              activeTabId: tabId,
            }));
          } catch (error) {
            console.warn('Failed to save tabs to localStorage:', error);
          }

          return { activeTabId: tabId };
        }
        return state;
      });
    },

    renameTab: (tabId: string, newFilename: string) => {
      set((state) => {
        const updatedTabs = state.tabs.map((t) =>
          t.id === tabId ? { ...t, filename: newFilename, title: newFilename } : t
        );

        // Save to localStorage
        try {
          localStorage.setItem('mindmap_tabs', JSON.stringify({
            tabs: updatedTabs,
            activeTabId: state.activeTabId,
          }));
        } catch (error) {
          console.warn('Failed to save tabs to localStorage:', error);
        }

        return { tabs: updatedTabs };
      });
    },

    markTabAsUnsaved: (tabId: string) => {
      set((state) => {
        const updatedTabs = state.tabs.map((t) =>
          t.id === tabId ? { ...t, unsavedChanges: true } : t
        );
        return { tabs: updatedTabs };
      });
    },

    markTabAsSaved: (tabId: string) => {
      set((state) => {
        const updatedTabs = state.tabs.map((t) =>
          t.id === tabId ? { ...t, unsavedChanges: false } : t
        );

        // Save to localStorage
        try {
          localStorage.setItem('mindmap_tabs', JSON.stringify({
            tabs: updatedTabs,
            activeTabId: state.activeTabId,
          }));
        } catch (error) {
          console.warn('Failed to save tabs to localStorage:', error);
        }

        return { tabs: updatedTabs };
      });
    },

    getActiveTab: () => {
      const state = get();
      return state.tabs.find((t) => t.id === state.activeTabId) || null;
    },

    hasUnsavedTabs: () => {
      const state = get();
      return state.tabs.some((t) => t.unsavedChanges);
    },
  };
});
