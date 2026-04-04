"use client";

import React, { useEffect, useState } from 'react';

export default function ApiRoutesExplorer() {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const response = await fetch('http://127.0.0.1:3001/routes');
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        
        // Remove duplicates and sort
        const uniqueRoutes = [...new Map(data.routes.map(item =>
          [item.method + item.path, item])).values()];
          
        uniqueRoutes.sort((a, b) => a.path.localeCompare(b.path));
        
        setRoutes(uniqueRoutes);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchRoutes();
  }, []);

  const getMethodColor = (method) => {
    switch (method) {
      case 'GET': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'POST': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'PUT': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'DELETE': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const filteredRoutes = routes.filter(route => 
    route.path.toLowerCase().includes(searchTerm.toLowerCase()) || 
    route.method.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 border-b-4 border-slate-900 pb-4 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">API EXPLORER</h1>
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mt-1">
              Internal Service Mesh Routes • api-server:3001
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white border-2 border-slate-200 p-2 rounded-xl shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 ml-2">
              <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input 
              type="text" 
              placeholder="Filter endpoints..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-xs font-bold w-64 px-2 text-slate-700"
            />
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center items-center h-64">
             <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin"></div>
          </div>
        ) : error ? (
          <div className="bg-rose-50 border-2 border-rose-200 text-rose-700 p-6 rounded-xl font-mono text-sm shadow-sm">
            <strong className="block mb-2 uppercase tracking-widest text-[10px]">Connection Error</strong>
            {error}. Ensure api-server holds connection on port 3001.
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border-2 border-slate-200 overflow-hidden">
            <div className="flex bg-slate-100 px-6 py-3 border-b-2 border-slate-200 font-black text-[10px] uppercase tracking-widest text-slate-500">
               <div className="w-24">Method</div>
               <div className="flex-1">Endpoint Path</div>
               <div className="w-32 text-right">Status</div>
            </div>
            <div className="divide-y divide-slate-100">
              {filteredRoutes.map((route, idx) => (
                <div key={idx} className="flex items-center px-6 py-4 hover:bg-slate-50 transition-colors group">
                  <div className="w-24">
                    <span className={`px-2 py-1 rounded text-[10px] font-black tracking-widest border ${getMethodColor(route.method)}`}>
                      {route.method}
                    </span>
                  </div>
                  <div className="flex-1 font-mono text-sm text-slate-700 group-hover:text-blue-600 transition-colors">
                    {route.path}
                  </div>
                  <div className="w-32 text-right flex justify-end">
                     <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"></span>
                  </div>
                </div>
              ))}
              {filteredRoutes.length === 0 && (
                <div className="p-8 text-center text-slate-400 font-mono text-xs">
                  No routes match your filter criteria.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
