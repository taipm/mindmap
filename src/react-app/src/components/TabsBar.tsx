import React, { useState } from 'react';
import { useTabsStore } from '../store/tabsStore';
import { useMindmapStore } from '../store/mindmapStore';
import './TabsBar.css';

export default function TabsBar() {
  const tabs = useTabsStore((state) => state.tabs);
  const activeTabId = useTabsStore((state) => state.activeTabId);
  const switchTab = useTabsStore((state) => state.switchTab);
  const closeTab = useTabsStore((state) => state.closeTab);
  const createTab = useTabsStore((state) => state.createTab);
  const [pendingTabId, setPendingTabId] = useState<string | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  const setCurrentTab = useMindmapStore((state) => state.setCurrentTab);
  const saveTabState = useMindmapStore((state) => state.saveTabState);

  const handleTabClick = (tabId: string) => {
    // Don't do anything if clicking the active tab
    if (tabId === activeTabId) {
      return;
    }

    // Check if current tab has unsaved changes
    const currentTab = tabs.find((t) => t.id === activeTabId);
    if (currentTab?.unsavedChanges) {
      setPendingTabId(tabId);
      setShowWarning(true);
      return;
    }

    saveTabState(); // Save current tab data before switching
    switchTab(tabId);
    setCurrentTab(tabId);
  };

  const handleConfirmSwitch = () => {
    if (pendingTabId) {
      saveTabState();
      switchTab(pendingTabId);
      setCurrentTab(pendingTabId);
      setShowWarning(false);
      setPendingTabId(null);
    }
  };

  const handleCancelSwitch = () => {
    setShowWarning(false);
    setPendingTabId(null);
  };

  const handleNewTab = () => {
    saveTabState(); // Save current tab data before creating new
    createTab();
  };

  const pendingTab = pendingTabId ? tabs.find((t) => t.id === pendingTabId) : null;

  return (
    <>
      {showWarning && (
        <div className="modal-overlay">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3>Unsaved Changes</h3>
            </div>
            <div className="modal-body">
              <p>
                The current tab "{tabs.find((t) => t.id === activeTabId)?.title}" has unsaved changes.
              </p>
              <p>Do you want to discard them and switch to "{pendingTab?.title}"?</p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCancelSwitch}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmSwitch}
              >
                Discard & Switch
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="tabs-bar">
        <div className="tabs-container">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`tab ${activeTabId === tab.id ? 'active' : ''}`}
              onClick={() => handleTabClick(tab.id)}
            >
              <span className="tab-title">
                {tab.title}
                {tab.unsavedChanges && <span className="unsaved-indicator">●</span>}
              </span>
              <button
                type="button"
                className="tab-close-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                title="Close tab"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="new-tab-btn"
          onClick={handleNewTab}
          title="New mindmap (Ctrl+T)"
        >
          +
        </button>
      </div>
    </>
  );
}
