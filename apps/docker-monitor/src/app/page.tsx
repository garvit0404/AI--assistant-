'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Activity, 
  Terminal, 
  RotateCcw, 
  Play, 
  Square, 
  Cpu, 
  Database, 
  Container as DockerIcon,
  Search,
  AlertTriangle,
  CheckCircle2,
  Settings2,
  RefreshCw,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

type Container = {
  id: string;
  name: string;
  image: string;
  state: 'running' | 'exited' | 'created' | 'dead' | 'paused' | 'restarting' | string;
  status: string;
};

export default function DockerMonitor() {
  const [containers, setContainers] = useState<Container[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [selectedContainer, setSelectedContainer] = useState<string | null>(null);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchContainers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/containers`);
      setContainers(response.data);
    } catch (err) {
      console.error('Failed to fetch containers:', err);
    }
  };

  const fetchMode = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/mode`);
      setIsLiveMode(response.data.mode === 'live');
    } catch (err) {}
  };

  useEffect(() => {
    fetchContainers();
    fetchMode();

    let interval: any;
    if (autoRefresh) {
      interval = setInterval(fetchContainers, 3000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const toggleMode = async () => {
    const newMode = isLiveMode ? 'mock' : 'live';
    try {
      await axios.post(`${API_BASE_URL}/api/mode`, { mode: newMode });
      setIsLiveMode(!isLiveMode);
    } catch (err) {}
  };

  const performAction = async (id: string, action: string) => {
    setIsLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/api/containers/${id}/${action}`);
      await fetchContainers();
    } catch (err) {
      alert(`Action ${action} failed: ${err}`);
    } finally {
      setIsLoading(false);
    }
  };

  const showLogs = async (id: string) => {
    setSelectedContainer(id);
    setLogs(['Fetching logs...']);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/containers/${id}/logs`);
      setLogs(response.data);
    } catch (err) {
      setLogs(['Failed to fetch logs.']);
    }
  };

  return (
    <div className="min-h-screen bg-[#020205] text-white p-6 md:p-10 selection:bg-rose-500/30">
      {/* Header */}
      <header className="max-w-7xl mx-auto mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-rose-500 rounded-lg shadow-lg shadow-rose-500/20">
              <Activity size={24} className="text-white" />
            </div>
            <h1 className="text-3xl font-black tracking-tighter uppercase italic">Docker_Health_Dashboard</h1>
          </div>
          <p className="text-zinc-500 font-mono text-sm leading-none">Status: Connected to api-server:3001</p>
        </div>

        <div className="flex items-center gap-4 bg-zinc-900/50 p-2 rounded-2xl border border-white/5 backdrop-blur-sm">
          <div className="flex items-center gap-2 px-3">
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-[10px] uppercase font-bold text-zinc-400">Auto_Refresh</span>
            <input 
              type="checkbox" 
              checked={autoRefresh} 
              onChange={() => setAutoRefresh(!autoRefresh)}
              className="accent-rose-500"
            />
          </div>
          <div className="h-4 w-[1px] bg-white/10" />
          <button 
            onClick={toggleMode}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all border flex items-center gap-2 ${
              isLiveMode 
              ? 'bg-rose-600 border-rose-500 shadow-lg shadow-rose-600/20' 
              : 'bg-zinc-800 border-zinc-700 text-zinc-400'
            }`}
          >
            <Settings2 size={14} />
            {isLiveMode ? 'LIVEMODE_ACTIVE' : 'MOCKMODE_ACTIVE'}
          </button>
        </div>
      </header>

      {/* Stats Overview */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Containers" value={containers.length.toString()} icon={<DockerIcon size={20} />} />
        <StatCard 
          label="Running" 
          value={containers.filter(c => c.state === 'running').length.toString()} 
          icon={<CheckCircle2 size={20} className="text-emerald-500" />} 
        />
        <StatCard 
          label="Down / Crashed" 
          value={containers.filter(c => c.state !== 'running').length.toString()} 
          icon={<AlertTriangle size={20} className="text-rose-500" />} 
        />
        <StatCard label="Memory Usage" value="840 MB" icon={<Cpu size={20} />} />
      </div>

      {/* Services Grid */}
      <main className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {containers.map((c) => (
            <motion.div 
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              key={c.id} 
              className={`group flex flex-col glass border-2 p-6 rounded-[2rem] transition-all relative overflow-hidden ${
                c.state === 'running' 
                  ? 'border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40' 
                  : 'border-rose-500/30 bg-rose-500/5 animate-pulse'
              }`}
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-black tracking-tight leading-none mb-1">{c.name}</h3>
                  <code className="text-[10px] text-zinc-500 bg-black/40 px-2 py-0.5 rounded-full">{c.id}</code>
                </div>
                <div className={`px-2 py-1 rounded-md text-[10px] font-black uppercase flex items-center gap-1.5 ${
                  c.state === 'running' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${c.state === 'running' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  {c.state}
                </div>
              </div>

              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Database size={14} />
                  <span className="text-xs truncate">{c.image}</span>
                </div>
                <div className="flex items-center gap-2 text-zinc-400">
                  <Activity size={14} />
                  <span className="text-xs">{c.status}</span>
                </div>
              </div>

              <div className="mt-auto grid grid-cols-4 gap-2">
                <ActionBtn 
                  icon={<Play size={16} />} 
                  color="emerald" 
                  onClick={() => performAction(c.id, 'start')} 
                  disabled={c.state === 'running' || isLoading} 
                />
                <ActionBtn 
                  icon={<Square size={16} />} 
                  color="rose" 
                  onClick={() => performAction(c.id, 'stop')} 
                  disabled={c.state !== 'running' || isLoading} 
                />
                <ActionBtn 
                  icon={<RotateCcw size={16} />} 
                  color="amber" 
                  onClick={() => performAction(c.id, 'restart')} 
                  disabled={isLoading}
                />
                <ActionBtn 
                  icon={<Terminal size={16} />} 
                  color="zinc" 
                  onClick={() => showLogs(c.id)} 
                />
              </div>

              {/* Grid Decoration */}
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-colors" />
            </motion.div>
          ))}
        </AnimatePresence>
      </main>

      {/* Logs Overlay */}
      <AnimatePresence>
        {selectedContainer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedContainer(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl max-h-[80vh] bg-[#0c0c0e] border border-white/10 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-zinc-900/40">
                <div className="flex items-center gap-3">
                  <Terminal size={20} className="text-rose-500" />
                  <h4 className="text-sm font-black uppercase tracking-widest">Logs_for_{containers.find(c=>c.id===selectedContainer)?.name}</h4>
                </div>
                <button onClick={() => setSelectedContainer(null)} className="hover:bg-white/10 p-2 rounded-xl transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 font-mono text-[11px] leading-relaxed text-zinc-400 bg-black/20">
                {logs.map((line, i) => (
                  <div key={i} className="mb-0.5 py-0.5 hover:bg-white/5 px-2 border-l border-white/5">
                    <span className="text-zinc-600 mr-4 select-none">{(i + 1).toString().padStart(4, '0')}</span>
                    {line}
                  </div>
                ))}
              </div>

              <div className="p-4 bg-zinc-900/40 border-t border-white/5 flex justify-end gap-3">
                 <button 
                  onClick={() => showLogs(selectedContainer)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                >
                  <RefreshCw size={14} /> Refresh Logs
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating System Info */}
      <div className="fixed bottom-6 right-6 p-4 glass-card border-rose-500/20 text-xs flex items-center gap-3">
        <Info size={16} className="text-rose-500" />
        <span className="font-bold text-zinc-400">DOCKER_ENGINE: UP 🟢</span>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="glass-card p-4 border-white/5 flex items-center gap-4">
      <div className="p-2 bg-zinc-900 rounded-xl text-zinc-400">
        {icon}
      </div>
      <div>
        <p className="text-[10px] uppercase font-bold text-zinc-500 leading-none mb-1">{label}</p>
        <p className="text-xl font-black tabular-nums">{value}</p>
      </div>
    </div>
  );
}

function ActionBtn({ icon, color, onClick, disabled = false }: { icon: React.ReactNode, color: string, onClick: any, disabled?: boolean }) {
  const colors: any = {
    emerald: 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white',
    rose: 'bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white',
    amber: 'bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white',
    zinc: 'bg-zinc-800 text-zinc-400 hover:bg-white/10 hover:text-white'
  };

  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`p-2.5 rounded-xl transition-all border border-white/5 flex items-center justify-center ${colors[color]} ${disabled ? 'opacity-20 cursor-not-allowed border-none bg-zinc-900/40' : ''}`}
    >
      {icon}
    </button>
  );
}

function X({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}
