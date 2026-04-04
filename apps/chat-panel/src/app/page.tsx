'use client';

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Send, 
  Bot, 
  Terminal, 
  ShieldCheck, 
  Search, 
  Code, 
  MessageSquare,
  History,
  Settings,
  Menu,
  X,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  status?: string;
  taskId?: string;
  timestamp: string;
};

export default function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Telegram Integration State
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramStatus, setTelegramStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'connected-active'>('idle');
  const [telegramError, setTelegramError] = useState('');
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check Telegram connection status
    axios.get(`${API_BASE_URL}/api/integrations/telegram/status`)
      .then(res => {
        if (res.data.connected) {
          setTelegramStatus('connected-active');
        }
      }).catch(() => {});

    // Load initial chat history
    axios.get(`${API_BASE_URL}/api/assistant/history`)
      .then(res => {
        if (res.data.success && res.data.history.length > 0) {
          setMessages(res.data.history);
        }
      }).catch(() => {});
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/assistant/request`, {
        prompt: input,
      });

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.data.response || response.data.message || `Initializing Task: ${response.data.taskId}. Intent: ${response.data.intent}`,
        taskId: response.data.taskId,
        status: response.data.status,
        timestamp: new Date().toLocaleTimeString(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: unknown) {
      const errorMsg = axios.isAxiosError(err) 
        ? (err.response?.data?.error || err.message) 
        : (err as Error).message || 'Unknown error';
      setMessages(prev => [...prev, {
        role: 'system',
        content: `Error: ${errorMsg}`,
        timestamp: new Date().toLocaleTimeString(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTelegramConnect = async () => {
    if (!telegramToken.trim()) return;
    setTelegramStatus('loading');
    try {
      const res = await axios.post(`${API_BASE_URL}/api/integrations/telegram/connect`, { botToken: telegramToken });
      if (res.data.success) {
        setTelegramStatus('success');
        setTimeout(() => {
          setTelegramStatus('connected-active');
          setShowTelegramModal(false);
        }, 2000);
      }
    } catch (err: unknown) {
      setTelegramStatus('error');
      const errorMsg = axios.isAxiosError(err) 
        ? (err.response?.data?.error || err.message) 
        : (err as Error).message || 'Unknown error';
      setTelegramError(errorMsg);
    }
  };

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden font-sans selection:bg-blue-500/30">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="glass-border border-r h-full flex flex-col glass z-30"
          >
            <div className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Bot size={20} />
                </div>
                <h1 className="text-xl font-bold font-mono tracking-tighter">AI_ASSISTANT</h1>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="hover:bg-white/10 p-1 rounded-md">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              <div className="flex flex-col gap-2">
                <button className="flex items-center gap-2 w-full glass-border border py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all font-medium">
                  <Plus size={18} className="text-blue-400" /> New Chat
                </button>
                <button onClick={() => setShowTelegramModal(true)} className={`flex items-center gap-2 w-full glass-border border py-2.5 px-4 rounded-xl transition-all font-medium ${telegramStatus === 'connected-active' ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border-green-500/20' : 'bg-sky-500/10 hover:bg-sky-500/20 text-sky-400'}`}>
                  <Bot size={18} /> {telegramStatus === 'connected-active' ? 'Telegram Connected' : 'Connect Telegram'}
                </button>
              </div>

              <div>
                <h2 className="text-xs uppercase text-zinc-500 font-bold mb-3 px-2">Activities</h2>
                <div className="space-y-1">
                  <SidebarItem icon={<Code size={18} />} label="Professional Coding" active />
                  <SidebarItem icon={<Search size={18} />} label="Internal Search" />
                  <SidebarItem icon={<ShieldCheck size={18} />} label="Security Sandbox" />
                  <SidebarItem icon={<Terminal size={18} />} label="Task History" />
                </div>
              </div>

              <div>
                <h2 className="text-xs uppercase text-zinc-500 font-bold mb-3 px-2">Recent Queries</h2>
                <div className="space-y-1 px-2">
                  <RecentItem label="Optimize docker-compose" />
                  <RecentItem label="Check logs for api-server" />
                  <RecentItem label="Scan workspace for malware" />
                </div>
              </div>
            </div>

            <div className="p-4 glass-border border-t flex flex-col gap-2">
              <SidebarItem icon={<Settings size={18} />} label="System Settings" />
              <div className="flex items-center gap-3 p-2 rounded-xl bg-zinc-900 border border-white/5 mt-2">
                <div className="w-10 h-10 rounded-full bg-zinc-800" />
                <div>
                  <div className="text-sm font-bold">Admin OS</div>
                  <div className="text-[10px] text-zinc-400">System Administrator</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative bg-[radial-gradient(circle_at_top,_#0a0a1a_0%,_#000000_100%)]">
        {/* Top Navigation */}
        <div className="h-16 flex items-center px-6 justify-between border-b border-white/5 glass z-20 sticky top-0">
          <div className="flex items-center gap-4">
            {!sidebarOpen && (
              <button 
                onClick={() => setSidebarOpen(true)} 
                className="hover:bg-white/10 p-2 rounded-lg transition-colors border border-white/5"
              >
                <Menu size={20} />
              </button>
            )}
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-medium text-zinc-300">SYSTEM_LIVE: PORT 3003</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-sm px-4 py-1.5 rounded-full border border-white/10 hover:bg-white/5 transition-all">
              Live Mode
            </button>
          </div>
        </div>

        {/* Messages */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 md:p-12 space-y-12 max-w-5xl mx-auto w-full scroll-smooth"
        >
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-2xl shadow-blue-500/30">
                <Bot size={40} />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tighter mb-2 glow-text">READY_FOR_INPUT</h1>
                <p className="text-zinc-500">I am your AI Assistant Operating System. Ask me to write code, manage infrastructure, or analyze files in your workspace.</p>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full">
                <QuickAction icon={<Code size={16} />} text="Build a new agent" />
                <QuickAction icon={<Search size={16} />} text="Analyze Docker network" />
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={i} 
              className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex-shrink-0 flex items-center justify-center border border-white/10 shadow-lg shadow-black">
                  <Bot size={18} className="text-blue-400" />
                </div>
              )}
              
              <div className={`flex flex-col max-w-[80%] ${msg.role === 'user' ? 'items-end' : ''}`}>
                <div className={`p-4 rounded-2xl glass-border border shadow-2xl ${
                  msg.role === 'user' 
                    ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-tr-none' 
                    : 'glass rounded-tl-none'
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
                
                {msg.taskId && (
                  <div className="mt-2 flex items-center gap-2 text-[10px] font-mono text-zinc-500 bg-black/40 px-3 py-1 rounded-full border border-white/5">
                    <History size={10} /> {msg.taskId} • Status: {msg.status || 'running'}
                  </div>
                )}
                
                <span className="mt-1 text-[10px] text-zinc-600 px-2">{msg.timestamp}</span>
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-zinc-900 flex-shrink-0 flex items-center justify-center border border-white/5 overflow-hidden">
                  <div className="w-full h-full bg-gradient-to-br from-zinc-500 to-zinc-800" />
                </div>
              )}
            </motion.div>
          ))}
          
          {isLoading && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-lg bg-zinc-800 flex-shrink-0 flex items-center justify-center border border-white/10">
                <Bot size={18} className="text-blue-400" />
              </div>
              <div className="glass p-4 rounded-2xl rounded-tl-none glass-border border">
                <div className="flex gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" />
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce delay-100" />
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="h-32 flex items-center justify-center px-6 relative z-10">
          <form 
            onSubmit={handleSubmit}
            className="glass-card p-1.5 flex items-center gap-3 w-full max-w-4xl border-white/10 focus-within:border-blue-500/50 transition-all duration-300"
          >
            <div className="pl-3 text-zinc-500">
              <MessageSquare size={20} />
            </div>
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Query the AI Operating System..."
              className="bg-transparent border-none outline-none flex-1 py-3 text-sm placeholder:text-zinc-600"
            />
            <button 
              disabled={isLoading}
              type="submit" 
              className={`p-3 rounded-xl transition-all ${
                input.trim() 
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20' 
                  : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
              }`}
            >
              <Send size={20} />
            </button>
          </form>
        </div>

        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/10 blur-[150px] -z-10 rounded-full" />
        <div className="absolute bottom-40 left-0 w-[400px] h-[400px] bg-indigo-600/10 blur-[120px] -z-10 rounded-full" />
      </div>

      {/* Telegram Modal */}
      <AnimatePresence>
        {showTelegramModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative"
            >
              <button 
                onClick={() => setShowTelegramModal(false)}
                className="absolute top-4 right-4 text-zinc-500 hover:text-white"
              >
                <X size={20} />
              </button>
              
              <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                <Bot className="text-sky-400" /> Connect Telegram
              </h2>
              <p className="text-sm text-zinc-400 mb-6">Create a bot using BotFather on Telegram and securely connect it to your AI Operating System.</p>
              
              <div className="space-y-4">
                <div className="p-3 bg-white/5 rounded-lg border border-white/5 text-sm space-y-2">
                  <p>1. Open Telegram and search for <strong>@BotFather</strong></p>
                  <p>2. Send <code>/newbot</code> and follow the instructions</p>
                  <p>3. Copy the HTTP API Token and paste it below</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1">Bot Token</label>
                  <input 
                    type="password"
                    value={telegramToken}
                    onChange={(e) => setTelegramToken(e.target.value)}
                    placeholder="1234567890:AAH_xxxxxxxxxxx_xxxxx"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-sky-500/50 transition-colors"
                  />
                </div>

                {telegramStatus === 'error' && (
                  <div className="text-red-400 text-sm p-3 bg-red-400/10 rounded-lg border border-red-400/20">
                    ❌ Setup failed: {telegramError}
                  </div>
                )}

                {telegramStatus === 'success' && (
                  <div className="text-green-400 text-sm p-3 bg-green-400/10 rounded-lg border border-green-400/20">
                    ✅ Successfully connected!
                  </div>
                )}

                {telegramStatus === 'connected-active' && (
                  <div className="text-emerald-400 text-sm p-3 bg-emerald-400/10 rounded-lg border border-emerald-400/20">
                    🟢 Bot is currently connected and actively polling.
                  </div>
                )}

                <button 
                  onClick={handleTelegramConnect}
                  disabled={telegramStatus === 'loading' || !telegramToken}
                  className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-all"
                >
                  {telegramStatus === 'loading' ? 'Connecting...' : (telegramStatus === 'connected-active' ? 'Update Bot Token' : 'Connect Bot')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SidebarItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <button className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${
      active 
        ? 'bg-white/10 text-white shadow-xl border border-white/10' 
        : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
    }`}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

function QuickAction({ icon, text }: { icon: React.ReactNode, text: string }) {
  return (
    <button className="flex items-center gap-2 p-3 glass-card text-xs font-medium hover:bg-white/10 transition-all text-left">
      <span className="text-blue-400">{icon}</span>
      <span className="text-zinc-300">{text}</span>
    </button>
  );
}

function RecentItem({ label }: { label: string }) {
  return (
    <button className="w-full text-left text-[13px] text-zinc-500 hover:text-zinc-300 py-1 flex items-center gap-2 transition-all">
      <MessageSquare size={12} />
      <span className="truncate">{label}</span>
    </button>
  );
}
