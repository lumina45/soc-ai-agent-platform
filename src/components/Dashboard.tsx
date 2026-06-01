import React from 'react';
import { Shield, Radio, Activity, AlertTriangle, Play, Terminal, Search, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { IncidentAlert, PlaybookInstance } from '../types';

interface DashboardProps {
  alerts: IncidentAlert[];
  playbooks: PlaybookInstance[];
  onNavigate: (tab: string) => void;
  onSelectAlert: (alert: IncidentAlert) => void;
}

export default function Dashboard({ alerts, playbooks, onNavigate, onSelectAlert }: DashboardProps) {
  const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL');
  const highAlerts = alerts.filter(a => a.severity === 'HIGH');
  const activePlaybooks = playbooks.filter(p => p.status === 'running');

  return (
    <div id="dashboard-tab" className="space-y-6">
      {/* Intro Hero with Agent Status */}
      <div className="bg-[#0F1219] rounded-lg p-6 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <div className="text-[10px] font-bold text-emerald-400 tracking-wider uppercase font-mono">Agent Status: Active & Monitoring</div>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mb-1">SOC AI Command Dashboard</h1>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Automating threat hunting, continuous incident triage, and real-time security playbook orchestration to scale your security operations footprint.
          </p>
        </div>

        <div className="flex items-center gap-4 border-l border-slate-800 pl-0 md:pl-6">
          <div className="text-right">
            <div className="text-[10px] text-slate-500 uppercase font-mono font-bold tracking-wider">Average Triage Speed</div>
            <div className="text-lg font-bold text-white font-mono">4.8s / ticket</div>
          </div>
          <div className="bg-[#1A1F29] p-2.5 rounded border border-slate-800">
            <Activity className="h-4 w-4 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Grid of indicators with dark styling */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Core Stat 1 */}
        <div 
          onClick={() => onNavigate('triage')} 
          className="bg-[#151921] p-5 rounded-lg border border-slate-800 cursor-pointer hover:border-rose-500/50 transition-all group"
        >
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold text-slate-500 uppercase font-mono">Critical Alerts</p>
            <span className="bg-rose-950/40 text-rose-400 text-[10px] font-mono border border-rose-500/25 px-2 py-0.5 rounded uppercase">Action Required</span>
          </div>
          <div className="flex items-end justify-between mt-3">
            <div>
              <p className="text-2xl font-bold text-white font-mono tracking-tight">{criticalAlerts.length}</p>
              <p className="text-[10px] text-slate-500 mt-1">Requires immediate AI triage evaluation</p>
            </div>
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded border border-rose-500/20 group-hover:bg-rose-500/20 transition-colors">
              <AlertTriangle className="h-4.5 w-4.5" />
            </div>
          </div>
        </div>

        {/* Core Stat 2 */}
        <div 
          onClick={() => onNavigate('playbooks')} 
          className="bg-[#151921] p-5 rounded-lg border border-slate-800 cursor-pointer hover:border-amber-500/50 transition-all group"
        >
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold text-slate-500 uppercase font-mono">Active Playbooks</p>
            <span className="bg-amber-950/40 text-amber-400 text-[10px] font-mono border border-amber-500/25 px-2 py-0.5 rounded uppercase font-bold">Orchestrating</span>
          </div>
          <div className="flex items-end justify-between mt-3">
            <div>
              <p className="text-2xl font-bold text-white font-mono tracking-tight">{activePlaybooks.length}</p>
              <p className="text-[10px] text-slate-500 mt-1">Remediation steps running live</p>
            </div>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded border border-amber-500/20 group-hover:bg-amber-500/20 transition-colors">
              <Play className="h-4.5 w-4.5" />
            </div>
          </div>
        </div>

        {/* Core Stat 3 */}
        <div 
          onClick={() => onNavigate('hunting')} 
          className="bg-[#151921] p-5 rounded-lg border border-slate-800 cursor-pointer hover:border-blue-500/50 transition-all group"
        >
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold text-slate-500 uppercase font-mono">Threat Campaigns</p>
            <span className="bg-blue-950/40 text-blue-400 text-[10px] font-mono border border-blue-500/25 px-2 py-0.5 rounded uppercase">Continuous</span>
          </div>
          <div className="flex items-end justify-between mt-3">
            <div>
              <p className="text-2xl font-bold text-white font-mono tracking-tight">3</p>
              <p className="text-[10px] text-slate-500 mt-1">AI-scoped threat hunters loaded</p>
            </div>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20 group-hover:bg-blue-500/20 transition-colors">
              <Search className="h-4.5 w-4.5" />
            </div>
          </div>
        </div>

        {/* Core Stat 4 */}
        <div className="bg-[#151921] p-5 rounded-lg border border-slate-800">
          <div className="flex justify-between items-start">
            <p className="text-xs font-bold text-slate-500 uppercase font-mono">Autopilot Integrity</p>
            <span className="bg-emerald-950/40 text-emerald-400 text-[10px] font-mono border border-emerald-500/25 px-2 py-0.5 rounded uppercase">Optimal</span>
          </div>
          <div className="flex items-end justify-between mt-3">
            <div>
              <p className="text-2xl font-bold text-white font-mono tracking-tight">99.2%</p>
              <p className="text-[10px] text-slate-500 mt-1">SIEM log ingest matching rate</p>
            </div>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20">
              <Shield className="h-4.5 w-4.5" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Urgent Triage Queue */}
        <div className="lg:col-span-2 bg-[#151921] rounded-lg border border-slate-800 overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-[#1A1F29]">
              <div>
                <h3 className="font-bold text-white text-sm">Prioritized Incident Queue</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Urgent priority alerts ingested from enterprise connectors.</p>
              </div>
              <button 
                onClick={() => onNavigate('triage')} 
                className="text-xs font-semibold font-mono text-blue-400 hover:text-white bg-[#0B0E14] border border-slate-800 hover:bg-slate-800 px-3 py-1.5 rounded transition-colors cursor-pointer"
              >
                View Full Queue
              </button>
            </div>
            <div className="divide-y divide-slate-800/60 font-mono text-xs">
              {alerts.slice(0, 4).map((alert) => (
                <div 
                  key={alert.id}
                  onClick={() => {
                    onSelectAlert(alert);
                    onNavigate('triage');
                  }}
                  className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span className={`block h-2 w-2 rounded-full flex-shrink-0 ${
                      alert.severity === 'CRITICAL' ? 'bg-rose-500' :
                      alert.severity === 'HIGH' ? 'bg-orange-500' : 'bg-amber-400'
                    }`} />
                    <div className="min-w-0 font-sans">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-medium text-slate-500 uppercase tracking-widest">{alert.source}</span>
                        <span className="text-slate-700 font-mono">•</span>
                        <span className="text-[10px] text-slate-500 font-mono">{alert.category}</span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-200 group-hover:text-blue-400 truncate mt-1">{alert.title}</h4>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold py-0.5 px-2 rounded font-mono ${
                      alert.status === 'NEW' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                      alert.status === 'TRIAGED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {alert.status}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">{alert.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 border-t border-slate-800 bg-[#0F1219] flex items-center gap-2">
            <span className="block h-2 w-2 rounded-full bg-emerald-500" />
            <p className="text-[11px] text-slate-400 font-sans">
              AI Agent successfully auto-triaged <span className="font-bold text-white">12 tickets</span> today with zero manual overhead required.
            </p>
          </div>
        </div>

        {/* Playbook Status Overview & Agent Activity */}
        <div className="bg-[#151921] rounded-lg border border-slate-800 p-5 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-white text-sm">Orchestrated Playbooks</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Remediation action containers currently managed.</p>
            </div>

            <div className="space-y-3">
              {playbooks.map(playbook => {
                const totalSteps = playbook.steps.length;
                const completedSteps = playbook.steps.filter(s => s.status === 'completed').length;
                const progressPercentage = Math.round((completedSteps / totalSteps) * 100);

                return (
                  <div 
                    key={playbook.id}
                    onClick={() => onNavigate('playbooks')}
                    className="p-3.5 rounded bg-[#0B0E14] border border-slate-800 hover:border-slate-700 cursor-pointer transition-all space-y-2.5"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-semibold text-white">{playbook.name}</h4>
                        <p className="text-[10px] text-slate-500 truncate max-w-[200px] mt-0.5">{playbook.description}</p>
                      </div>
                      <span className={`text-[9px] uppercase font-mono px-2 py-0.5 rounded border ${
                        playbook.status === 'running' ? 'bg-amber-500/10 text-amber-400 border-amber-500/25' :
                        playbook.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {playbook.status}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono text-slate-400">
                        <span>Step {playbook.currentStepIndex + 1} of {totalSteps}</span>
                        <span>{progressPercentage}%</span>
                      </div>
                      <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full duration-500 transition-all ${
                            playbook.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800">
            <button 
              onClick={() => onNavigate('copilot')}
              className="w-full flex items-center justify-between p-3 rounded bg-[#0B0E14] border border-slate-800 hover:bg-slate-800 transition-all cursor-pointer text-left"
            >
              <div className="flex items-center gap-2.5">
                <Terminal className="h-4 w-4 text-blue-400" />
                <span className="text-xs font-semibold text-slate-300">Open Co-Pilot Sandbox</span>
              </div>
              <span className="text-[9px] bg-blue-500/15 text-blue-400 font-mono px-1.5 py-0.5 rounded border border-blue-500/20 font-bold uppercase">Online</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
