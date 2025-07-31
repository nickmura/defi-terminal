'use client';

import { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import Terminal from './Terminal';

interface TerminalTab {
  id: string;
  name: string;
  component: React.ReactNode;
}

export default function TabbedTerminal() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState('1');
  const [tabCounter, setTabCounter] = useState(1);

  const updateTabName = (tabId: string, newName: string) => {
    setTabs(prev => prev.map(tab => 
      tab.id === tabId ? { ...tab, name: newName } : tab
    ));
  };

  const [tabs, setTabs] = useState<TerminalTab[]>([
    {
      id: '1',
      name: 'defi',
      component: <Terminal key="1" tabId="1" onTabNameChange={updateTabName} />
    }
  ]);

  const addNewTab = () => {
    const newTabId = String(tabCounter + 1);
    const newTab: TerminalTab = {
      id: newTabId,
      name: 'defi',
      component: <Terminal key={newTabId} tabId={newTabId} onTabNameChange={updateTabName} />
    };
    
    setTabs(prev => [...prev, newTab]);
    setActiveTab(newTabId);
    setTabCounter(prev => prev + 1);
  };

  const closeTab = (tabId: string) => {
    // Don't allow closing the last tab
    if (tabs.length <= 1) return;
    
    const newTabs = tabs.filter(tab => tab.id !== tabId);
    setTabs(newTabs);
    
    // If we closed the active tab, switch to the first remaining tab
    if (activeTab === tabId) {
      setActiveTab(newTabs[0].id);
    }
  };


  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+T: New tab
      if (e.ctrlKey && e.key === 't') {
        e.preventDefault();
        addNewTab();
      }
      
      // Ctrl+W: Close current tab
      if (e.ctrlKey && e.key === 'w') {
        e.preventDefault();
        if (tabs.length > 1) {
          closeTab(activeTab);
        }
      }
      
      // Ctrl+Tab or Ctrl+PageDown: Next tab
      if ((e.ctrlKey && e.key === 'Tab') || (e.ctrlKey && e.key === 'PageDown')) {
        e.preventDefault();
        const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
        const nextIndex = (currentIndex + 1) % tabs.length;
        setActiveTab(tabs[nextIndex].id);
      }
      
      // Ctrl+Shift+Tab or Ctrl+PageUp: Previous tab
      if ((e.ctrlKey && e.shiftKey && e.key === 'Tab') || (e.ctrlKey && e.key === 'PageUp')) {
        e.preventDefault();
        const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
        const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        setActiveTab(tabs[prevIndex].id);
      }
      
      // Ctrl+1-9: Switch to specific tab
      if (e.ctrlKey && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const tabIndex = parseInt(e.key) - 1;
        if (tabIndex < tabs.length) {
          setActiveTab(tabs[tabIndex].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tabs, activeTab]);

  return (
    <div className="w-full h-screen bg-black text-green-400 font-mono text-sm overflow-hidden flex flex-col">
      {/* Main Header/Navbar */}
      <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex justify-between items-center">
        <span className="text-gray-300 text-xs">
          {isConnected ? `${address?.slice(0, 6)}...${address?.slice(-4)}@terminal` : 'defi-user@terminal'}
        </span>
        <div className="flex items-center space-x-3">
          <div className="scale-75">
            <ConnectButton />
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="bg-gray-900 border-b border-gray-700 flex items-center">
        <div className="flex-1 flex items-center overflow-x-auto">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`flex items-center group min-w-0 ${
                activeTab === tab.id
                  ? 'bg-black border-b-2 border-green-400'
                  : 'bg-gray-800 hover:bg-gray-700'
              }`}
            >
              <button
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm transition-colors truncate flex-1 ${
                  activeTab === tab.id
                    ? 'text-green-400'
                    : 'text-gray-300 hover:text-white'
                }`}
                title={tab.name}
              >
                {tab.name}
              </button>
              
              {/* Close button - only show if more than 1 tab */}
              {tabs.length > 1 && (
                <button
                  onClick={() => closeTab(tab.id)}
                  className="px-2 py-2 text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Close tab"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        
        {/* New Tab Button */}
        <button
          onClick={addNewTab}
          className="px-4 py-2 text-gray-400 hover:text-green-400 border-l border-gray-700 transition-colors"
          title="New terminal (Ctrl+T)"
        >
          +
        </button>
      </div>

      {/* Terminal Content */}
      <div className="flex-1 relative">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`absolute inset-0 ${
              activeTab === tab.id ? 'block' : 'hidden'
            }`}
          >
            {tab.component}
          </div>
        ))}
      </div>

      {/* Status Bar */}
      <div className="bg-gray-800 px-4 py-1 border-t border-gray-700 text-xs text-gray-400 flex justify-between">
        <span>Tab: autocomplete • Ctrl+L: clear • ↑/↓: history</span>
        <span>Ctrl+T: new • Ctrl+W: close • Ctrl+Tab: next • Ctrl+1-9: switch • Active: {tabs.find(t => t.id === activeTab)?.name}</span>
      </div>
    </div>
  );
}