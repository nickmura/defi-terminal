'use client';

import { useState, useRef, useEffect } from 'react';

interface TerminalLine {
  id: number;
  type: 'command' | 'output' | 'error';
  content: string;
}

export default function Terminal() {
  const [lines, setLines] = useState<TerminalLine[]>([
    { id: 0, type: 'output', content: 'Welcome to DeFi Terminal v1.0.0' },
    { id: 1, type: 'output', content: 'Type "help" for available commands.' }
  ]);
  const [currentCommand, setCurrentCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    terminalRef.current?.scrollTo(0, terminalRef.current.scrollHeight);
    inputRef.current?.focus();
  }, [lines]);

  const addLine = (content: string, type: 'command' | 'output' | 'error' = 'output') => {
    setLines(prev => [...prev, { id: Date.now(), type, content }]);
  };

  const processCommand = async (command: string) => {
    const [cmd, ...args] = command.split(' ');
    const commands: Record<string, () => void | Promise<void>> = {
      help: () => ['help - Show commands', 'clear - Clear terminal', 'echo <text> - Echo text', 'date - Show date', 'whoami - Show user', 'pwd - Show directory', 'ls - List files', 'history - Command history', 'curl <url> - HTTP request', 'sleep <ms> - Wait'].forEach(addLine),
      // clear: () => setLines([]),
      // echo: () => addLine(args.join(' ')),
      // date: () => addLine(new Date().toString()),
      // whoami: () => addLine('defi-user'),
      // pwd: () => addLine('/home/defi-user/terminal'),
      // ls: () => ['contracts/', 'scripts/', 'config.json', 'README.md'].forEach(addLine),
      // history: () => commandHistory.forEach((cmd, i) => addLine(`${i + 1}  ${cmd}`)),
      curl: async () => {
        if (!args[0]) return addLine('Usage: curl <url>', 'error');
        try {
          addLine(`Fetching ${args[0]}...`);
          const res = await fetch(args[0]);
          addLine(`Status: ${res.status}`);
          const text = await res.text();
          addLine(text.slice(0, 500) + (text.length > 500 ? '...' : ''));
        } catch { addLine(`Failed to fetch ${args[0]}`, 'error'); }
      },
      sleep: async () => {
        const ms = parseInt(args[0]) || 1000;
        addLine(`Sleeping for ${ms}ms...`);
        await new Promise(resolve => setTimeout(resolve, ms));
        addLine('Done!');
      }
    };
    
    if (commands[cmd.toLowerCase()]) {
      await commands[cmd.toLowerCase()]();
    } else {
      addLine(`Command not found: ${cmd}`, 'error');
      addLine('Type "help" for available commands.');
    }
  };

  const executeCommand = async (command: string) => {
    const trimmed = command.trim();
    if (!trimmed) return;
    
    addLine(`$ ${trimmed}`, 'command');
    setIsProcessing(true);
    try { await processCommand(trimmed); } 
    catch (e) { addLine(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`, 'error'); }
    setIsProcessing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isProcessing) return;
    
    if (e.key === 'Enter' && currentCommand.trim()) {
      setCommandHistory(prev => [...prev, currentCommand]);
      executeCommand(currentCommand);
      setCurrentCommand('');
      setHistoryIndex(-1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistory[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= commandHistory.length) {
          setHistoryIndex(-1);
          setCurrentCommand('');
        } else {
          setHistoryIndex(newIndex);
          setCurrentCommand(commandHistory[newIndex]);
        }
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const commands = ['help', 'clear', 'echo', 'date', 'whoami', 'pwd', 'ls', 'history', 'curl', 'sleep'];
      const matches = commands.filter(cmd => cmd.startsWith(currentCommand.toLowerCase()));
      if (matches.length === 1) setCurrentCommand(matches[0] + ' ');
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    }
  };

  return (
    <div className="w-full h-screen bg-black text-green-400 font-mono text-sm overflow-hidden flex flex-col">
      <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex justify-between items-center">
        <span className="text-gray-300 text-xs">defi-user@terminal</span>
        <div className="flex space-x-1">
          <div className="w-3 h-3 bg-gray-600 border border-gray-500 hover:bg-gray-500 cursor-pointer"></div>
          <div className="w-3 h-3 bg-gray-600 border border-gray-500 hover:bg-gray-500 cursor-pointer"></div>
          <div className="w-3 h-3 bg-red-600 border border-red-500 hover:bg-red-500 cursor-pointer"></div>
        </div>
      </div>
      
      <div ref={terminalRef} className="flex-1 p-4 overflow-y-auto cursor-text" onClick={() => inputRef.current?.focus()}>
        {lines.map((line) => (
          <div key={line.id} className={`mb-1 ${
            line.type === 'command' ? 'text-white' :
            line.type === 'error' ? 'text-red-400' : 'text-green-400'
          }`}>
            {line.content}
          </div>
        ))}
        
        {!isProcessing ? (
          <div className="flex items-center mt-2">
            <span className="text-white mr-2">$</span>
            <input
              ref={inputRef}
              type="text"
              value={currentCommand}
              onChange={(e) => setCurrentCommand(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent text-green-400 outline-none caret-green-400"
              spellCheck={false}
              autoComplete="off"
            />
          </div>
        ) : (
          <div className="text-yellow-400 animate-pulse mt-2">Processing...</div>
        )}
      </div>
      
      <div className="bg-gray-800 px-4 py-1 border-t border-gray-700 text-xs text-gray-400">
        Tab: autocomplete • Ctrl+L: clear • ↑/↓: history
      </div>
    </div>
  );
}