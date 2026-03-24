"use client";
import React, { useEffect, useState } from 'react';
import { socket } from '@/lib/socket';
import PipelineViz from '@/components/pipeline/PipelineViz';
import { 
  RequestPanel, 
  PlanPanel, 
  PermissionPanel, 
  ToolPanel, 
  LogPanel, 
  ReasoningPanel 
} from '@/components/panels/Panels';

export default function Dashboard() {
  const [task, setTask] = useState(null);
  const [inputRequest, setInputRequest] = useState("");
  const [systemMode, setSystemMode] = useState("MOCK");

  useEffect(() => {
    // Fetch initial system mode from API server on port 3001
    const fetchMode = async () => {
      try {
        const res = await fetch('http://127.0.0.1:3001/api/system/mode');
        const data = await res.json();
        setSystemMode(data.mode ? data.mode.toUpperCase() : "MOCK");
      } catch (err) {
        console.error("Failed to fetch system mode", err);
      }
    };
    fetchMode();

    // Listen for Real-time Mode Changes
    socket.on('mode_updated', (data) => {
      if (data?.mode) setSystemMode(data.mode.toUpperCase());
    });

    socket.on('pipeline_update', (data) => {
      if (data?.task) setTask(prev => ({ ...prev, ...data.task }));
    });

    // Also support timeline_update from real engine
    socket.on('timeline_update', (entry) => {
      setTask(prev => {
        const newTask = prev ? { ...prev } : { 
          id: entry.taskId, 
          status: 'running', 
          stages: {}, 
          logs: [], 
          request: 'New System Task',
          source: 'mission_control'
        };
        newTask.logs = [...(newTask.logs || []), `[${new Date(entry.timestamp).toLocaleTimeString()}] ${entry.message}`];
        newTask.stages[entry.stage] = entry.message.toLowerCase().includes('completed') ? 'completed' : 'running';
        return newTask;
      });
    });

    return () => {
      socket.off('pipeline_update');
      socket.off('timeline_update');
    };
  }, []);

  const startTask = async () => {
    if (!inputRequest) return;
    try {
      await fetch('http://127.0.0.1:3001/api/assistant/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: inputRequest }),
      });
      setInputRequest("");
    } catch (err) {
      console.error(err);
    }
  };

  const approvePermission = (id) => {
    socket.emit('approve_permission', { id });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 border-b-4 border-slate-900 pb-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">AI-OS MISSION CONTROL</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">System Link Synchronized</span>
          </div>
        </div>
        <div className="flex gap-4">
            <div className={`px-4 py-2 rounded shadow-xl flex flex-col justify-center items-center border-b-4 transition-all ${
                systemMode === 'LIVE' ? 'bg-emerald-600 border-emerald-950/30' : 'bg-slate-900 border-slate-950/30'
            }`}>
                <span className={`text-[9px] font-black uppercase tracking-tighter ${
                    systemMode === 'LIVE' ? 'text-emerald-300' : 'text-blue-500'
                }`}>System Status</span>
                <span className="text-lg font-black text-white italic leading-tight">{systemMode}_MODE</span>
            </div>
            <div className="flex items-center gap-2 bg-white border-2 border-slate-200 p-2 rounded-xl shadow-sm">
                <input 
                    type="text" 
                    value={inputRequest}
                    onChange={(e) => setInputRequest(e.target.value)}
                    placeholder="Enter objective..." 
                    className="bg-transparent border-none outline-none text-xs font-bold w-64 px-2"
                />
                <button 
                    onClick={startTask}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all shadow-lg active:scale-95"
                >
                    Execute
                </button>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left Column: Metrics & Flow */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
          <div className="grid grid-cols-3 gap-4">
              <RequestPanel 
                request={task?.request} 
                source={task?.source} 
                status={task?.status} 
              />
              <div className="col-span-2">
                 <ReasoningPanel request={task?.request} />
              </div>
          </div>
          
          <div className="bg-white p-4 rounded-xl border-2 border-slate-200 shadow-sm relative overflow-hidden h-[950px]">
            <div className="absolute top-4 left-4 z-10 bg-white/80 backdrop-blur-md p-2 rounded border border-slate-100 shadow-sm">
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                    Live Pipeline Viz
                </span>
            </div>
            <PipelineViz taskStatuses={task?.stages || {}} />
          </div>
        </div>

        {/* Right Column: Controls & Logs */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <LogPanel logs={task?.logs} />
          
          <div className="grid grid-cols-1 gap-6 flex-1">
             <PlanPanel plan={task?.plan} />
             <PermissionPanel 
                permissions={task?.permissions} 
                onApprove={approvePermission} 
             />
             <ToolPanel tools={task?.toolCalls} />
          </div>
        </div>
      </div>

      {/* Lifecycle Footer */}
      <div className="mt-8 bg-slate-100 p-4 rounded-xl border-2 border-slate-200 flex justify-between items-center opacity-80 filter grayscale hover:grayscale-0 transition-all">
          <div className="flex gap-8">
              {['CREATED', 'PLANNED', 'WAITING_PERMISSION', 'EXECUTING', 'COMPLETED'].map((step, idx) => {
                  const isActive = task?.status === step.toLowerCase() || (step === 'EXECUTING' && task?.status === 'running');
                  const isDone = task?.status === 'completed';
                  return (
                    <div key={step} className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full border-2 ${isActive ? 'bg-blue-500 border-blue-600 shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse' : isDone ? 'bg-green-500 border-green-600' : 'bg-slate-300 border-slate-400'}`}></div>
                        <span className={`text-[10px] font-black uppercase tracking-tighter ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>{step}</span>
                        {idx < 4 && <div className="w-8 h-[2px] bg-slate-200"></div>}
                    </div>
                  );
              })}
          </div>
          <div className="text-[11px] font-mono font-black text-slate-400 uppercase">AI-OS Control Plane V2.0_ALPHA_STABLE</div>
      </div>
    </div>
  );
}
