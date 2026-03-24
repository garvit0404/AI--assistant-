"use client";
import React, { useMemo } from 'react';
import { ReactFlow, Background, Controls, Handle, Position } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const nodeStyles = {
  idle: 'bg-slate-100 border-slate-300 text-slate-500',
  running: 'bg-blue-500 border-blue-600 text-white animate-pulse shadow-[0_0_15px_rgba(59,130,246,0.5)]',
  completed: 'bg-green-500 border-green-600 text-white shadow-[0_0_10px_rgba(34,197,94,0.3)]',
  failed: 'bg-red-500 border-red-600 text-white',
  waiting_permission: 'bg-yellow-500 border-yellow-600 text-white shadow-[0_0_15px_rgba(234,179,8,0.5)]',
};

const CustomNode = ({ data }) => {
  const statusClass = nodeStyles[data.status] || nodeStyles.idle;
  
  return (
    <div className={`px-4 py-2 rounded-lg border-2 font-bold text-[10px] uppercase tracking-wider transition-all duration-500 min-w-[120px] text-center ${statusClass}`}>
      <Handle type="target" position={Position.Top} className="!bg-slate-400" />
      {data.label}
      <Handle type="source" position={Position.Bottom} className="!bg-slate-400" />
      <div className="text-[8px] opacity-70 mt-1 font-mono uppercase">{data.status}</div>
    </div>
  );
};

const nodeTypes = {
  pipeline: CustomNode,
};

const STAGES = [
  { id: 'user', label: 'User' },
  { id: 'interface', label: 'Interface' },
  { id: 'intent_parser', label: 'Intent Parser' },
  { id: 'context_builder', label: 'Context Builder' },
  { id: 'planner_agent', label: 'Planner Agent' },
  { id: 'policy_validator', label: 'Policy Validator' },
  { id: 'permission_engine', label: 'Permission Engine' },
  { id: 'task_queue', label: 'Task Queue' },
  { id: 'executor_agent', label: 'Executor Agent' },
  { id: 'tool_registry', label: 'Tool Registry' },
  { id: 'sandbox_execution', label: 'Sandbox Execution' },
  { id: 'observer_agent', label: 'Observer Agent' },
  { id: 'result', label: 'Result' },
];

export default function PipelineViz({ taskStatuses }) {
  const nodes = useMemo(() => {
    return STAGES.map((stage, index) => ({
      id: stage.id,
      type: 'pipeline',
      data: { 
          label: stage.label, 
          status: taskStatuses?.[stage.id] || 'idle' 
      },
      position: { x: 250, y: index * 80 },
    }));
  }, [taskStatuses]);

  const edges = useMemo(() => {
    return STAGES.slice(0, -1).map((stage, index) => ({
      id: `e-${stage.id}-${STAGES[index + 1].id}`,
      source: stage.id,
      target: STAGES[index + 1].id,
      animated: taskStatuses?.[stage.id] === 'running' || taskStatuses?.[STAGES[index + 1].id] === 'running',
      style: { stroke: taskStatuses?.[stage.id] === 'completed' ? '#22c55e' : '#cbd5e1' },
    }));
  }, [taskStatuses]);

  return (
    <div className="h-[900px] w-full bg-slate-50 rounded-2xl border-2 border-slate-200 overflow-hidden shadow-inner">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        panOnScroll
        selectionOnDrag
      >
        <Background color="#cbd5e1" gap={20} />
        <Controls />
      </ReactFlow>
    </div>
  );
}
