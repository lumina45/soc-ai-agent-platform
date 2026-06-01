import React, { useState } from 'react';
import { Search, Terminal, FileCode, CheckCircle, Copy, Database, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { HuntSession, QueryLanguage } from '../types';

interface ThreatHuntingProps {
  huntSessions: HuntSession[];
  onCreateHunt: (session: HuntSession) => void;
  onUpdateHunt: (id: string, updates: Partial<HuntSession>) => void;
}

const PRESETS = [
  {
    intent: "Identify potential Kerberoasting execution patterns in Active Directory ticket logs",
    logs: "Active Directory Event Log EventID 4769",
    language: "KQL (Sentinel)" as QueryLanguage
  },
  {
    intent: "Detect sudden SSH brute-force login success from a single IP address with continuous prior failures",
    logs: "Linux Secure Auth logs /var/log/auth.log",
    language: "Splunk SPL" as QueryLanguage
  },
  {
    intent: "Locate massive outbound network data transfers targeting non-standard cloud proxy IPs",
    logs: "Firewall NetFlow Egress Records",
    language: "Elastic ESQL" as QueryLanguage
  }
];

export default function ThreatHunting({ huntSessions, onCreateHunt, onUpdateHunt }: ThreatHuntingProps) {
  const [intent, setIntent] = useState('');
  const [targetLogs, setTargetLogs] = useState('Syslog Security Logs');
  const [queryLanguage, setQueryLanguage] = useState<QueryLanguage>('KQL (Sentinel)');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedQuery, setCopiedQuery] = useState(false);

  const activeSession = huntSessions.find(s => s.id === activeSessionId) || huntSessions[0];

  const handleSelectPreset = (preset: typeof PRESETS[0]) => {
    setIntent(preset.intent);
    setTargetLogs(preset.logs);
    setQueryLanguage(preset.language);
  };

  const handleCreateSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intent.trim()) return;

    setIsGenerating(true);

    const newSession: HuntSession = {
      id: 'hunt-' + Date.now(),
      intent: intent.trim(),
      targetLogs,
      queryLanguage,
      status: 'draft',
      createdAt: new Date().toLocaleTimeString()
    };

    onCreateHunt(newSession);
    setActiveSessionId(newSession.id);

    try {
      const response = await fetch('/api/hunt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intent: newSession.intent,
          targetLogs: newSession.targetLogs,
          queryLanguage: newSession.queryLanguage
        })
      });

      if (!response.ok) {
        throw new Error('API server failed');
      }

      const data = await response.json();

      onUpdateHunt(newSession.id, {
        generatedQuery: data.generatedQuery,
        explanation: data.explanation,
        suggestedDataSources: data.suggestedDataSources || [],
        simulatedResultsCount: data.simulatedResultsCount || 0,
        simulatedResultsJson: data.simulatedResultsJson,
        status: 'completed'
      });
    } catch (err) {
      console.error('Failed to run hunt query', err);
      onUpdateHunt(newSession.id, {
        status: 'failed',
        explanation: 'Encountered network connectivity issue during AI query creation.'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text?: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedQuery(true);
    setTimeout(() => setCopiedQuery(false), 2000);
  };

  const getSimulatedResultsArray = (jsonString?: string) => {
    if (!jsonString) return [];
    try {
      return JSON.parse(jsonString);
    } catch {
      return [];
    }
  };

  return (
    <div id="hunting-tab" className="grid grid-cols-1 lg:grid-cols-12 gap-6 select-text">
      {/* Search Input Panel */}
      <div className="lg:col-span-5 bg-[#151921] rounded-lg border border-slate-800 p-5 shadow-sm space-y-6 flex flex-col justify-between h-auto min-h-[500px]">
        <div className="space-y-5">
          <div>
            <h3 className="font-bold text-white flex items-center gap-2 text-sm uppercase tracking-wider">
              <Search className="h-4 w-4 text-blue-400" />
              Configure Hunt Campaign
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">Define incident indicators to automatically synthesize SIEM search statements.</p>
          </div>

          <form onSubmit={handleCreateSearch} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Investigation Intent</label>
              <textarea
                value={intent}
                onChange={e => setIntent(e.target.value)}
                placeholder="E.g. Search for outbound network exfiltration on port 443 with anomalous sizes..."
                className="w-full h-24 p-2.5 text-xs bg-[#0B0E14] border border-slate-800 rounded text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none font-sans"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">Target Logs</label>
                <input
                  type="text"
                  value={targetLogs}
                  onChange={e => setTargetLogs(e.target.value)}
                  placeholder="AWS, Windows logs, etc."
                  className="w-full text-xs p-2.5 bg-[#0B0E14] border border-slate-800 rounded text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase font-mono">SIEM Language</label>
                <select
                  value={queryLanguage}
                  onChange={e => setQueryLanguage(e.target.value as QueryLanguage)}
                  className="w-full text-xs p-2.5 bg-[#0B0E14] border border-slate-800 rounded text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                >
                  <option value="Splunk SPL">Splunk SPL</option>
                  <option value="KQL (Sentinel)">Sentinel KQL</option>
                  <option value="Elastic ESQL">Elastic ESQL</option>
                  <option value="Standard SQL">Standard SQL</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isGenerating || !intent.trim()}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs py-2.5 px-4 rounded flex items-center justify-center gap-2 transition-all cursor-pointer uppercase tracking-wider"
            >
              {isGenerating ? (
                <>
                  <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                  Cognitive AI Processing...
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" />
                  Synthesize Threat Hunting Vector
                </>
              )}
            </button>
          </form>

          {/* Presets / Templates */}
          <div className="pt-4 border-t border-slate-800/80">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase font-mono mb-2.5">Quick Hunt Blueprints</h4>
            <div className="space-y-2">
              {PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectPreset(preset)}
                  className="w-full text-left p-2.5 rounded border border-slate-800 bg-[#0B0E14]/40 hover:bg-[#0B0E14] hover:border-slate-700 transition-all cursor-pointer"
                >
                  <div className="flex justify-between items-center text-[9px] font-mono text-blue-400 mb-1 font-bold">
                    <span>{preset.language}</span>
                    <span className="bg-slate-800 text-slate-400 px-1 py-0.5 rounded uppercase">{preset.logs.split(' ')[0]}</span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium truncate font-sans">{preset.intent}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* List of Recent Investigations */}
        <div className="pt-4 border-t border-slate-800">
          <h4 className="text-[10px] font-bold text-slate-500 uppercase font-mono mb-2">History & Sessions</h4>
          <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1 font-sans">
            {huntSessions.map(session => (
              <button
                key={session.id}
                onClick={() => setActiveSessionId(session.id)}
                className={`w-full text-left p-2 rounded text-xs leading-normal truncate block cursor-pointer transition-colors ${
                  activeSessionId === session.id || (!activeSessionId && activeSession?.id === session.id)
                    ? 'bg-[#0B0E14] font-semibold text-white border-l-2 border-blue-500'
                    : 'text-slate-400 hover:bg-[#0B0E14]/60'
                }`}
              >
                {session.intent}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Query Workspace Showcase */}
      <div className="lg:col-span-7 space-y-4">
        <AnimatePresence mode="wait">
          {!activeSession ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#151921] rounded-lg border border-slate-800 p-8 text-center h-full min-h-[500px] flex flex-col items-center justify-center space-y-4"
            >
              <div className="p-4 bg-[#0B0E14] text-blue-400 rounded border border-slate-800">
                <Terminal className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-white text-base font-sans uppercase tracking-wide">AI Threat Hunting Studio</h4>
                <p className="text-xs text-slate-400 max-w-sm font-sans leading-relaxed">
                  Define a target cyber-attack intention or choose a logical blueprint on the left to review standard SIEM search queries instantly.
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={activeSession.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Query Panel */}
              <div className="bg-[#0F1219] rounded-lg border border-slate-800 p-5 shadow-sm text-slate-100 space-y-4 font-mono">
                <div className="flex justify-between items-center pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-2.5">
                    <FileCode className="h-4.5 w-4.5 text-emerald-400" />
                    <div>
                      <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Autogenerated Hunt Query</div>
                      <div className="text-xs text-white font-semibold font-sans">{activeSession.queryLanguage} Spec</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(activeSession.generatedQuery)}
                      disabled={!activeSession.generatedQuery}
                      className="text-xs text-slate-400 hover:text-white p-2 rounded hover:bg-slate-800 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {copiedQuery ? (
                        <>
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="text-[10px] font-semibold text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span className="text-[10px] sm:inline hidden">Copy Statement</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="bg-[#0B0E14] p-4 rounded border border-slate-850 overflow-x-auto text-[11px] font-medium leading-relaxed max-h-[160px] text-emerald-400">
                  {activeSession.status === 'draft' ? (
                    <span className="text-slate-600 animate-pulse">Waiting for hunt execution query generation...</span>
                  ) : activeSession.generatedQuery ? (
                    <pre className="whitespace-pre-wrap">{activeSession.generatedQuery}</pre>
                  ) : (
                    <span className="text-rose-400">Unable to generate queries. Please verify server integrity in details index.</span>
                  )}
                </div>

                {/* Explanation Context */}
                {activeSession.explanation && (
                  <div className="text-xs text-slate-300 border-t border-slate-800/60 pt-3 space-y-1 bg-[#0B0E14]/60 p-3 rounded border border-slate-800/40 font-sans">
                    <div className="font-semibold text-slate-200 text-[11px] uppercase tracking-wider font-mono text-blue-400 mb-1">AI Query Explanation:</div>
                    <p className="leading-relaxed text-slate-300 text-xs">{activeSession.explanation}</p>
                  </div>
                )}
              </div>

              {/* Data Ingest Recommender & Simulator */}
              <div className="bg-[#151921] rounded-lg border border-slate-800 p-5 shadow-sm space-y-4">
                <div>
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider font-mono mb-2">Recommended Log Vectors</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {activeSession.suggestedDataSources && activeSession.suggestedDataSources.length > 0 ? (
                      activeSession.suggestedDataSources.map((ds, index) => (
                        <span key={index} className="bg-[#0B0E14] border border-slate-800 text-blue-400 text-[10px] font-semibold font-mono px-2 py-1 rounded">
                          {ds}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">Awaiting target system recommendation analytics...</span>
                    )}
                  </div>
                </div>

                {/* Simulated Target Outliers List */}
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="font-bold text-white text-xs uppercase tracking-wider font-mono flex items-center gap-1.5">
                      <Database className="h-3.5 w-3.5 text-slate-400" />
                      Simulated Threat Findings
                    </h4>
                    <span className="text-[10px] bg-[#0B0E14] text-slate-400 font-mono px-2 py-0.5 rounded border border-slate-800 font-bold">
                      {getSimulatedResultsArray(activeSession.simulatedResultsJson).length} Hits Simulated
                    </span>
                  </div>

                  {activeSession.status === 'draft' ? (
                    <div className="p-4 bg-[#0B0E14]/40 border border-slate-800/40 rounded text-xs text-slate-500 text-center font-sans">
                      Compile query to fetch interactive mock hit tables.
                    </div>
                  ) : activeSession.simulatedResultsJson ? (
                    <div className="overflow-x-auto rounded border border-slate-800">
                      <table className="w-full text-left border-collapse text-xs font-mono">
                        <thead>
                          <tr className="bg-[#0D1017] text-slate-400 border-b border-slate-800">
                            <th className="p-2.5 font-bold">Timestamp</th>
                            <th className="p-2.5 font-bold">Indicator Type / Source</th>
                            <th className="p-2.5 font-bold">Finding Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                          {getSimulatedResultsArray(activeSession.simulatedResultsJson).map((res: any, index: number) => (
                            <tr key={index} className="hover:bg-slate-800/20 bg-[#0F1219]/20">
                              <td className="p-2.5 text-[11px] text-slate-500 whitespace-nowrap">{res.timestamp || '02:51:20Z'}</td>
                              <td className="p-2.5 text-[11px] font-semibold text-rose-400 font-mono whitespace-nowrap">
                                {res.src_ip || res.host || 'Alert finding'}
                              </td>
                              <td className="p-2.5 text-[11px] text-slate-300 max-w-xs truncate" title={JSON.stringify(res)}>
                                {res.details || res.command_line || res.volume_gb || 'Telemetry matches threat profile.'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-4 bg-[#0B0E14]/40 border border-slate-850 rounded text-xs text-slate-500 text-center font-sans">
                      No matching log items. Try modifying the intent request logic.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
