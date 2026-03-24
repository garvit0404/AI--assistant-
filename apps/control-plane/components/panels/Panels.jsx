"use client";
import React from 'react';
import { Terminal, Shield, List, Activity, Cpu, Brain, Lock } from 'lucide-react';

export const RequestPanel = ({ request, source, status }) => (
  <div className="bg-white p-4 rounded-xl border-2 border-slate-200 shadow-sm">
    <div className="flex items-center gap-2 mb-3">
      <Terminal className="w-4 h-4 text-slate-500" />
      <h3 className="text-xs font-black uppercase tracking-widest text-slate-600">Active Request</h3>
    </div>
    <div className="bg-slate-900 p-4 rounded-lg">
      <div className="text-blue-400 font-mono text-sm mb-2">&quot;{request || 'Waiting for request...'}&quot;</div>
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-black uppercase text-slate-500">Source: {source || 'N/A'}</span>
        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${status === 'running' ? 'bg-blue-500 text-white animate-pulse' : 'bg-slate-700 text-slate-400'}`}>
          {status || 'idle'}
        </span>
      </div>
    </div>
  </div>
);

export const PlanPanel = ({ plan }) => (
  <div className="bg-white p-4 rounded-xl border-2 border-slate-200 shadow-sm h-full">
    <div className="flex items-center gap-2 mb-4">
      <List className="w-4 h-4 text-slate-500" />
      <h3 className="text-xs font-black uppercase tracking-widest text-slate-600">Execution Plan</h3>
    </div>
    <div className="space-y-3">
      {plan?.length > 0 ? plan.map((p, i) => (
        <div key={i} className="flex gap-4 items-start group">
          <div className="w-6 h-6 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500 group-hover:border-blue-400 group-hover:text-blue-500 transition-colors">
            {i + 1}
          </div>
          <div className="flex-1">
            <div className="text-[11px] font-black uppercase text-slate-800">{p.tool}</div>
            <div className="text-[10px] text-slate-500 italic">{p.query || p.target}</div>
          </div>
        </div>
      )) : (
        <div className="text-slate-400 italic text-xs text-center py-8">No plan generated yet.</div>
      )}
    </div>
  </div>
);

export const PermissionPanel = ({ permissions, onApprove }) => (
  <div className="bg-white p-4 rounded-xl border-2 border-yellow-200 shadow-md bg-yellow-50/30">
    <div className="flex items-center gap-2 mb-4">
      <Lock className="w-4 h-4 text-yellow-600" />
      <h3 className="text-xs font-black uppercase tracking-widest text-yellow-700">Security Guard</h3>
    </div>
    {permissions?.filter((p) => p.status === 'pending').length > 0 ? (
      <div className="space-y-4">
        {permissions.filter((p) => p.status === 'pending').map((p) => (
          <div key={p.id} className="bg-white p-3 rounded-lg border border-yellow-200 shadow-sm translate-y-0 hover:-translate-y-1 transition-transform">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black uppercase text-slate-400">Action:</span>
              <span className="text-[9px] font-black bg-red-100 text-red-600 px-2 rounded-full">{p.risk} RISK</span>
            </div>
            <div className="text-sm font-bold text-slate-800 mb-1">{p.action}</div>
            <div className="text-[10px] text-slate-500 mb-4">{p.target}</div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => onApprove(p.id)} className="py-2 bg-green-500 hover:bg-green-600 text-white rounded text-[10px] font-black uppercase shadow-lg shadow-green-200 transition-all">Approve</button>
              <button className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded text-[10px] font-black uppercase transition-all">Deny</button>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="text-slate-400 italic text-xs text-center py-4">All operations secured.</div>
    )}
  </div>
);

export const ToolPanel = ({ tools }) => (
  <div className="bg-white p-4 rounded-xl border-2 border-slate-200 shadow-sm">
    <div className="flex items-center gap-2 mb-4">
      <Cpu className="w-4 h-4 text-slate-500" />
      <h3 className="text-xs font-black uppercase tracking-widest text-slate-600">Tool Execution</h3>
    </div>
    <div className="space-y-3">
      {tools?.length > 0 ? tools.map((t, i) => (
        <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-slate-800">{t.tool}</span>
            <span className="text-[9px] text-slate-400 italic">params: {t.params}</span>
          </div>
          <div className="flex flex-col items-end gap-1">
             <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase ${
               t.status === 'completed' ? 'bg-green-100 text-green-600' : 
               t.status === 'running' ? 'bg-blue-100 text-blue-600 animate-pulse' : 
               'bg-slate-200 text-slate-500'
             }`}>
               {t.status}
             </span>
             <span className="text-[9px] font-mono text-slate-400">{t.time}</span>
          </div>
        </div>
      )) : (
        <div className="text-slate-400 italic text-xs text-center py-4">Waiting for execution...</div>
      )}
    </div>
  </div>
);

export const LogPanel = ({ logs }) => (
  <div className="bg-slate-900 p-4 rounded-xl shadow-2xl border border-slate-800 h-[600px] flex flex-col">
    <div className="flex items-center gap-2 mb-4">
      <Activity className="w-4 h-4 text-slate-500" />
      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Telemetry Stream</h3>
    </div>
    <div className="flex-1 overflow-y-auto font-mono text-[11px] space-y-1 scrollbar-hide">
      {logs?.length > 0 ? logs.map((log, i) => (
        <div key={i} className="text-slate-400 animate-in fade-in slide-in-from-left-2">
          <span className="text-slate-600 mr-2">[{i.toString().padStart(3, '0')}]</span>
          <span className={log.includes('entering') ? 'text-blue-400' : log.includes('Waiting') ? 'text-yellow-400' : 'text-slate-300'}>
            {log}
          </span>
        </div>
      )) : (
        <div className="text-slate-700 italic">Initializing signal connection...</div>
      )}
    </div>
  </div>
);

export const ReasoningPanel = ({ request }) => (
  <div className="bg-white p-4 rounded-xl border-2 border-slate-200 shadow-sm h-full">
    <div className="flex items-center gap-2 mb-4">
      <Brain className="w-4 h-4 text-purple-500" />
      <h3 className="text-xs font-black uppercase tracking-widest text-slate-600">Planner Reasoning</h3>
    </div>
    {request ? (
      <div className="space-y-4">
        <div>
          <div className="text-[10px] font-black uppercase text-slate-400 mb-1">Goal</div>
          <p className="text-xs text-slate-800 font-bold">{request}</p>
        </div>
        <div>
          <div className="text-[10px] font-black uppercase text-slate-400 mb-1">Strategy</div>
          <p className="text-xs text-slate-600 leading-relaxed italic">
            I will first decompose the user&apos;s intent into executable units. 
            Searching internal and external documentation, I&apos;ll extract relevant entities 
            and synthesize a response while maintaining strict boundary protocols.
          </p>
        </div>
      </div>
    ) : (
      <div className="text-slate-400 italic text-xs text-center py-8">Awaiting cognitive load...</div>
    )}
  </div>
);
