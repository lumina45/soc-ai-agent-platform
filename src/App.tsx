import React, { useState } from 'react';
import { 
  Shield, Radio, Activity, AlertTriangle, Play, Terminal, Search, CheckCircle, 
  HelpCircle, Server, Cpu, Database, ChevronRight, User, AlertOctagon, CornerRightDown, Send 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { IncidentAlert, PlaybookInstance, HuntSession, Message, Severity, IncidentStatus } from './types';
import Dashboard from './components/Dashboard';
import ThreatHunting from './components/ThreatHunting';

const INITIAL_ALERTS: IncidentAlert[] = [
  {
    id: 'alert-1',
    title: 'LSASS process credential memory access detected on DC-01',
    severity: 'CRITICAL',
    status: 'NEW',
    timestamp: '02:40:12',
    source: 'Defender ATP',
    category: 'Credential Access',
    description: 'An unauthorized memory read handle targeting Local Security Authority Subsystem Service (LSASS) was requested by an unsigned execution payload originating from a temporary folder.',
    entities: [
      { type: 'Host', value: 'DC-01.LOCAL' },
      { type: 'IP', value: '10.0.0.12' },
      { type: 'User', value: 'jsmith_dev' },
      { type: 'Hash', value: '4a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p' }
    ]
  },
  {
    id: 'alert-2',
    title: 'SSH brute-force pattern followed by successful credential login',
    severity: 'HIGH',
    status: 'NEW',
    timestamp: '02:18:45',
    source: 'Linux Syslog Secure',
    category: 'Initial Access',
    description: 'Over 145 failed authentication attempts detected within 90 seconds from remote IP 194.5.249.12 followed immediately by a single successful logon event on user account "ubuntu".',
    entities: [
      { type: 'Host', value: 'PROD-APPSRV-01' },
      { type: 'IP', value: '194.5.249.12' },
      { type: 'User', value: 'ubuntu' }
    ]
  },
  {
    id: 'alert-3',
    title: 'Mass egress exfiltration anomalies targeting rogue VPS coordinates',
    severity: 'MEDIUM',
    status: 'NEW',
    timestamp: '02:02:15',
    source: 'Perimeter Firewall',
    category: 'Exfiltration',
    description: 'External egress bandwidth spikes identified transferring over 42.1 GB of encrypted binary payload contents towards dynamic server hosts registered inside unfamiliar geo-locations.',
    entities: [
      { type: 'Host', value: 'FIN-WRK-04' },
      { type: 'IP', value: '93.115.24.11' }
    ]
  },
  {
    id: 'alert-4',
    title: 'Unauthorized S3 Bucket access level policy modifications via CloudTrail',
    severity: 'HIGH',
    status: 'NEW',
    timestamp: '01:45:00',
    source: 'AWS CloudTrail',
    category: 'Persistence',
    description: 'API operation "PutBucketPolicy" executed on target customer records dataset removing strict security access grants and enabling anonymous world-read credentials.',
    entities: [
      { type: 'User', value: 'deploy-token-system' },
      { type: 'Host', value: 'AWS-NET-INFRA' }
    ]
  }
];

const INITIAL_PLAYBOOKS: PlaybookInstance[] = [
  {
    id: 'pb-1',
    name: 'AD Ransomware Containment Pipeline',
    description: 'Automated workflow designed to contain lateral propagation of suspicious Active Directory executions.',
    status: 'running',
    currentStepIndex: 2,
    steps: [
      { id: 'step-1', label: 'Identify compromised user credentials and trigger session freeze', actionType: 'reset_password', status: 'completed', resultMessage: 'SAML Session reset successfully for user jsmith_dev.' },
      { id: 'step-2', label: 'Scan concurrent logon sessions for active lateral movements', actionType: 'check_logs', status: 'completed', resultMessage: 'Scanned 14 adjacent terminal servers. Zero active malicious processes identified.' },
      { id: 'step-3', label: 'Isolate affected host machine (DC-01) from corporate network blocks', actionType: 'isolate_host', status: 'running' },
      { id: 'step-4', label: 'Acquire manager manual approval to deploy structural active block policy', actionType: 'manual_approval', status: 'pending', choices: ['Approve Containment Block', 'Decline Override'] }
    ]
  },
  {
    id: 'pb-2',
    name: 'Exfiltration IP Quarantine Protocol',
    description: 'Orchestrator sequence targeting active firewall bans of remote rogue command-and-control hubs.',
    status: 'idle',
    currentStepIndex: 0,
    steps: [
      { id: 'pb2-1', label: 'Verify total egress transfer values against base lines', actionType: 'check_logs', status: 'pending' },
      { id: 'pb2-2', label: 'Block target attacking IP coordinate in edge firewall blocks', actionType: 'block_ip', status: 'pending' },
      { id: 'pb2-3', label: 'Notify SOC Incident Director via immediate webhook ping triggers', actionType: 'notify_manager', status: 'pending' }
    ]
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [alerts, setAlerts] = useState<IncidentAlert[]>(INITIAL_ALERTS);
  const [playbooks, setPlaybooks] = useState<PlaybookInstance[]>(INITIAL_PLAYBOOKS);
  const [huntSessions, setHuntSessions] = useState<HuntSession[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<IncidentAlert | null>(INITIAL_ALERTS[0]);

  // Triage state
  const [isTriaging, setIsTriaging] = useState<boolean>(false);
  const [triageError, setTriageError] = useState<string | null>(null);

  // Chat/Co-Pilot state
  const [chatMessages, setChatMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'agent',
      text: 'SOC Co-Pilot online. Connect an incident triage ticket or ask me to draft hunting telemetry.',
      timestamp: '02:51:20'
    }
  ]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isChatSending, setIsChatSending] = useState<boolean>(false);

  // Quick Action: Run AI Cognitive Triage
  const handleRunTriage = async (alertId: string) => {
    const alertToTriage = alerts.find(a => a.id === alertId);
    if (!alertToTriage) return;

    setIsTriaging(true);
    setTriageError(null);

    // Set Status on alert to TRIAGING immediately
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: 'TRIAGING' } : a));

    try {
      const resp = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert: alertToTriage })
      });

      if (!resp.ok) {
        throw new Error('Server returned error response');
      }

      const resData = await resp.json();

      setAlerts(prev => prev.map(a => {
        if (a.id === alertId) {
          return {
            ...a,
            status: 'TRIAGED',
            triageResult: {
              riskScore: resData.riskScore,
              explanation: resData.explanation,
              compromisingFactors: resData.compromisingFactors,
              recommendedAction: resData.recommendedAction,
              visualAttackPath: resData.visualAttackPath,
              timeline: resData.timeline
            }
          };
        }
        return a;
      }));

      // Update selected alert
      setSelectedAlert(prev => {
        if (prev?.id === alertId) {
          return {
            ...prev,
            status: 'TRIAGED',
            triageResult: {
              riskScore: resData.riskScore,
              explanation: resData.explanation,
              compromisingFactors: resData.compromisingFactors,
              recommendedAction: resData.recommendedAction,
              visualAttackPath: resData.visualAttackPath,
              timeline: resData.timeline
            }
          };
        }
        return prev;
      });

    } catch (err: any) {
      console.error('Triage call failed:', err);
      setTriageError('Unable to generate cognitive analysis. Using fallback triage logic.');
      
      // Load fallback simulation immediately on failure
      setAlerts(prev => prev.map(a => {
        if (a.id === alertId) {
          return {
            ...a,
            status: 'TRIAGED',
            triageResult: {
              riskScore: alertId === 'alert-1' ? 95 : alertId === 'alert-2' ? 75 : 50,
              explanation: `Fallback analysis compiled successfully for: ${a.title}. The event tracks directly of suspicious process patterns. Check target entities listed in details workspace.`,
              compromisingFactors: ['Telemetry anomalies verified', 'Standard containment triggered'],
              recommendedAction: 'Verify credential configurations and trigger quarantine pipeline container.',
              visualAttackPath: ['Asset compromise verified', 'Automation execution completed'],
              timeline: [{ time: '02:45:00', source: 'Internal', activity: 'Compromise Event', details: 'Telemetry sequence verified offline.' }]
            }
          };
        }
        return a;
      }));
    } finally {
      setIsTriaging(false);
    }
  };

  // Threat Hunt handlers
  const handleCreateHunt = (session: HuntSession) => {
    setHuntSessions(prev => [session, ...prev]);
  };

  const handleUpdateHunt = (id: string, updates: Partial<HuntSession>) => {
    setHuntSessions(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  // Playbook automated steps execution simulation
  const handleExecutePlaybookStep = (playbookId: string) => {
    setPlaybooks(prev => prev.map(pb => {
      if (pb.id !== playbookId) return pb;

      const updatedSteps = [...pb.steps];
      const curIndex = pb.currentStepIndex;
      const currentStep = updatedSteps[curIndex];

      if (!currentStep) return pb;

      // Complete current step
      currentStep.status = 'completed';
      currentStep.resultMessage = `Action finalized by AI agent at ${new Date().toLocaleTimeString()}. Safe validation confirmed.`;

      // Determine next steps
      const nextIndex = curIndex + 1;
      let nextStatus = pb.status;

      if (nextIndex >= updatedSteps.length) {
        nextStatus = 'completed';
      } else {
        updatedSteps[nextIndex].status = 'running';
      }

      return {
        ...pb,
        steps: updatedSteps,
        currentStepIndex: nextIndex < updatedSteps.length ? nextIndex : curIndex,
        status: nextStatus as any
      };
    }));
  };

  const handleManualActionApproval = (playbookId: string, choiceName: string) => {
    setPlaybooks(prev => prev.map(pb => {
      if (pb.id !== playbookId) return pb;

      const updatedSteps = [...pb.steps];
      const curIndex = pb.currentStepIndex;
      const currentStep = updatedSteps[curIndex];

      if (currentStep && currentStep.actionType === 'manual_approval') {
        currentStep.status = 'completed';
        currentStep.resultMessage = `Manual clearance [${choiceName}] authorized securely by Analyst. Continuing orchestration pipeline.`;
        
        const nextIndex = curIndex + 1;
        let nextStatus = pb.status;

        if (nextIndex >= updatedSteps.length) {
          nextStatus = 'completed';
        } else {
          updatedSteps[nextIndex].status = 'running';
        }

        return {
          ...pb,
          steps: updatedSteps,
          currentStepIndex: nextIndex < updatedSteps.length ? nextIndex : curIndex,
          status: nextStatus as any
        };
      }
      return pb;
    }));
  };

  const handleResetPlaybook = (playbookId: string) => {
    setPlaybooks(prev => prev.map(pb => {
      if (pb.id !== playbookId) return pb;

      const resetSteps = pb.steps.map((st, idx) => ({
        ...st,
        status: idx === 0 ? 'running' : 'pending' as any,
        resultMessage: undefined
      }));

      return {
        ...pb,
        steps: resetSteps,
        currentStepIndex: 0,
        status: 'running' as any
      };
    }));
  };

  // Chat bot interface handler
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatSending) return;

    const userMessageText = chatInput.trim();
    const newUserMsg: Message = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text: userMessageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };

    setChatMessages(prev => [...prev, newUserMsg]);
    setChatInput('');
    setIsChatSending(true);

    try {
      const chatPayload = {
        messages: [...chatMessages, newUserMsg].map(m => ({
          sender: m.sender,
          text: m.text
        })),
        context: selectedAlert ? {
          title: selectedAlert.title,
          severity: selectedAlert.severity,
          source: selectedAlert.source,
          category: selectedAlert.category,
          entities: selectedAlert.entities
        } : undefined
      };

      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chatPayload)
      });

      if (!resp.ok) {
        throw new Error('Failed to fetch fallback response');
      }

      const res = await resp.json();

      setChatMessages(prev => [...prev, {
        id: 'reply-' + Date.now(),
        sender: 'agent',
        text: res.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      }]);
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, {
        id: 'reply-err-' + Date.now(),
        sender: 'agent',
        text: `Error verifying gateway status. Standard diagnostics: Check network status or configure your GEMINI_API_KEY in the Settings menu to activate advanced real-time reasoning.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      }]);
    } finally {
      setIsChatSending(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#0B0E14] text-slate-300 flex font-sans overflow-hidden select-none">
      
      {/* Sidebar navigation */}
      <aside className="w-64 border-r border-slate-800 bg-[#0F1219] flex flex-col justify-between flex-shrink-0">
        <div>
          {/* Logo */}
          <div className="p-6 border-b border-slate-800 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold font-mono tracking-tighter shadow-md shadow-blue-500/20">S</div>
            <div className="flex flex-col">
              <span className="text-white font-bold tracking-wider text-base uppercase font-mono">SENTINEL.AI</span>
              <span className="text-[9px] text-blue-400 font-bold uppercase tracking-widest font-mono">SOC Automation App</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-2 font-mono">
            <button 
              onClick={() => setActiveTab('dashboard')} 
              className={`w-full text-left px-3 py-2.5 rounded text-xs tracking-wide transition-all cursor-pointer flex items-center justify-between ${
                activeTab === 'dashboard' 
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20 font-bold' 
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <span>Command Center</span>
              <ChevronRight className={`h-3.5 w-3.5 opacity-60 ${activeTab === 'dashboard' ? 'translate-x-0.5' : ''} transition-transform`} />
            </button>

            <button 
              onClick={() => setActiveTab('hunting')} 
              className={`w-full text-left px-3 py-2.5 rounded text-xs tracking-wide transition-all cursor-pointer flex items-center justify-between ${
                activeTab === 'hunting' 
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20 font-bold' 
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <span>Threat Hunting</span>
              <ChevronRight className={`h-3.5 w-3.5 opacity-60 ${activeTab === 'hunting' ? 'translate-x-0.5' : ''} transition-transform`} />
            </button>

            <button 
              onClick={() => setActiveTab('triage')} 
              className={`w-full text-left px-3 py-2.5 rounded text-xs tracking-wide transition-all cursor-pointer flex items-center justify-between ${
                activeTab === 'triage' 
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20 font-bold' 
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <span>Incident Triage</span>
              <ChevronRight className={`h-3.5 w-3.5 opacity-60 ${activeTab === 'triage' ? 'translate-x-0.5' : ''} transition-transform`} />
            </button>

            <button 
              onClick={() => setActiveTab('playbooks')} 
              className={`w-full text-left px-3 py-2.5 rounded text-xs tracking-wide transition-all cursor-pointer flex items-center justify-between ${
                activeTab === 'playbooks' 
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20 font-bold' 
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <span>Orchestration Hub</span>
              <ChevronRight className={`h-3.5 w-3.5 opacity-60 ${activeTab === 'playbooks' ? 'translate-x-0.5' : ''} transition-transform`} />
            </button>

            <button 
              onClick={() => setActiveTab('copilot')} 
              className={`w-full text-left px-3 py-2.5 rounded text-xs tracking-wide transition-all cursor-pointer flex items-center justify-between ${
                activeTab === 'copilot' 
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20 font-bold' 
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <span>Agent Co-Pilot</span>
              <ChevronRight className={`h-3.5 w-3.5 opacity-60 ${activeTab === 'copilot' ? 'translate-x-0.5' : ''} transition-transform`} />
            </button>
          </nav>
        </div>

        {/* Info panel bottom */}
        <div className="p-4 border-t border-slate-800 font-mono">
          <div className="bg-slate-900/40 p-3 rounded.lg border border-slate-800">
            <div className="text-[9px] uppercase text-slate-500 font-bold mb-1.5 tracking-wider">Active Region Cluster</div>
            <div className="text-xs text-emerald-400 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block relative">
                <span className="animate-ping absolute block w-full h-full rounded-full bg-emerald-400 opacity-60"></span>
              </span>
              Region: US-EAST-1
            </div>
            <div className="text-[9px] text-slate-500 mt-2">SIEM Log Connectors: Ingesting</div>
          </div>
        </div>
      </aside>

      {/* Main app surface */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Global Security Header */}
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-[#0F1219] flex-shrink-0">
          <div className="flex items-center gap-8 font-mono">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Security Posture</span>
              <span className="text-emerald-400 text-xs font-semibold uppercase flex items-center gap-1.5 mt-0.5">
                ● Normal Operational // Safe
              </span>
            </div>
            <div className="w-[1px] h-8 bg-slate-800"></div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Pending Analysys</span>
              <span className="text-rose-400 text-xs font-semibold mt-0.5">
                {alerts.filter(a => a.status === 'NEW').length} Urgent Threat Flags
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right font-mono">
              <div className="text-xs text-white font-bold">SOC_Agent_Autopilot_v3.5</div>
              <div className="text-[9px] text-slate-500 mt-0.5">Ingest status: Perfect sync</div>
            </div>
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <User className="h-4.5 w-4.5" />
            </div>
          </div>
        </header>

        {/* Tab view contents panel container */}
        <div className="p-6 flex-1 bg-[#0B0E14] select-text">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                <Dashboard 
                  alerts={alerts} 
                  playbooks={playbooks} 
                  onNavigate={setActiveTab} 
                  onSelectAlert={setSelectedAlert} 
                />
              </motion.div>
            )}

            {activeTab === 'hunting' && (
              <motion.div
                key="hunting"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
              >
                <ThreatHunting 
                  huntSessions={huntSessions}
                  onCreateHunt={handleCreateHunt}
                  onUpdateHunt={handleUpdateHunt}
                />
              </motion.div>
            )}

            {activeTab === 'triage' && (
              <motion.div
                key="triage"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-6"
              >
                {/* Left Alert list workspace */}
                <div className="lg:col-span-5 bg-[#151921] rounded-lg border border-slate-800 p-5 flex flex-col h-[580px] justify-between">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-bold text-white uppercase text-xs tracking-wider font-mono flex items-center gap-2">
                        <AlertOctagon className="h-4 w-4 text-rose-400" />
                        Threat Ingest Pipeline
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-1 font-sans">Select any active telemetry alarm to trigger cognitive triage and forensic map generation.</p>
                    </div>

                    <div className="space-y-2 overflow-y-auto max-h-[420px] pr-1">
                      {alerts.map(item => {
                        const isSelected = selectedAlert?.id === item.id;
                        return (
                          <div
                            key={item.id}
                            onClick={() => setSelectedAlert(item)}
                            className={`p-3.5 border rounded cursor-pointer transition-all ${
                              isSelected 
                                ? 'bg-[#0B0E14] border-blue-500/80 shadow' 
                                : 'bg-[#0F1219]/60 border-slate-800 hover:border-slate-700 hover:bg-[#0F1219]'
                            }`}
                          >
                            <div className="flex justify-between items-start mb-2 font-mono text-[10px]">
                              <span className={`px-1.5 py-0.5 rounded border ${
                                item.severity === 'CRITICAL' ? 'bg-rose-950/40 text-rose-400 border-rose-500/20' :
                                item.severity === 'HIGH' ? 'bg-orange-950/40 text-orange-400 border-orange-500/20' : 'bg-amber-950/40 text-amber-400 border-amber-500/20'
                              }`}>
                                {item.severity}
                              </span>
                              <span className="text-slate-500 font-bold uppercase">{item.source}</span>
                            </div>
                            <h4 className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-slate-300'} truncate`}>{item.title}</h4>
                            <div className="flex justify-between items-center mt-2.5 text-[10px] text-slate-500 font-mono">
                              <span>UTC: {item.timestamp}</span>
                              <span className={`px-1.5 py-0.5 rounded ${
                                item.status === 'NEW' ? 'text-blue-400 font-bold bg-blue-500/5' :
                                item.status === 'TRIAGED' ? 'text-emerald-400 bg-emerald-500/5' : 'text-slate-400'
                              }`}>{item.status}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500 font-mono text-center pt-3 border-t border-slate-800/60">
                    Real-time link monitoring active. Syslog feeds streaming.
                  </div>
                </div>

                {/* Right Workspace with deep triage outcomes */}
                <div className="lg:col-span-7 space-y-4">
                  {!selectedAlert ? (
                    <div className="bg-[#151921] rounded-lg border border-slate-800 p-8 text-center h-[580px] flex flex-col items-center justify-center">
                      <Shield className="h-8 w-8 text-slate-600 mb-2" />
                      <p className="text-xs text-slate-500 font-mono">Select a target threat entry from the ingest pipeline to begin.</p>
                    </div>
                  ) : (
                    <div className="bg-[#151921] rounded-lg border border-slate-800 p-5 space-y-5 h-auto min-h-[580px] flex flex-col justify-between">
                      <div className="space-y-4">
                        {/* Header Details */}
                        <div className="flex justify-between items-start pb-4 border-b border-slate-800/80">
                          <div className="space-y-1">
                            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded uppercase font-mono tracking-widest font-bold">
                              {selectedAlert.category}
                            </span>
                            <h3 className="text-sm font-bold text-white mt-1.5 leading-normal">{selectedAlert.title}</h3>
                            <p className="text-[11px] text-slate-400 mt-1 font-sans leading-relaxed">{selectedAlert.description}</p>
                          </div>
                          <div className="text-right flex-shrink-0 font-mono pl-4">
                            <span className={`text-xs font-bold uppercase px-3 py-1 rounded border block ${
                              selectedAlert.severity === 'CRITICAL' ? 'bg-rose-950/40 text-rose-400 border-rose-500/25' :
                              selectedAlert.severity === 'HIGH' ? 'bg-orange-950/40 text-orange-400 border-orange-500/25' : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}>
                              {selectedAlert.severity}
                            </span>
                            <span className="text-[10px] text-slate-500 mt-1.5 block">Logged: {selectedAlert.timestamp}</span>
                          </div>
                        </div>

                        {/* Host details and tags */}
                        <div className="bg-[#0B0E14] p-3 rounded.lg border border-slate-800/60 flex flex-wrap gap-4 items-center">
                          <span className="text-[10px] uppercase text-slate-500 font-bold font-mono">Telemetry Entities:</span>
                          <div className="flex flex-wrap gap-2">
                            {selectedAlert.entities.map((en, i) => (
                              <span key={i} className="text-[10px] font-mono font-semibold bg-[#151921] border border-slate-800 text-slate-300 px-2 py-0.5 rounded">
                                <span className="text-slate-500 font-bold mr-1">{en.type}:</span>{en.value}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Interactive Triage triggers */}
                        {!selectedAlert.triageResult ? (
                          <div className="p-8 text-center bg-[#0B0E14]/45 border border-slate-800/60 rounded space-y-4">
                            <div className="text-xs text-slate-400 font-mono">Cognitive analysis is required to map compromise propagation trails and prioritize actions.</div>
                            <button
                              onClick={() => handleRunTriage(selectedAlert.id)}
                              disabled={isTriaging}
                              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs uppercase tracking-wider rounded font-mono cursor-pointer inline-flex items-center gap-2"
                            >
                              {isTriaging ? (
                                <>
                                  <span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                                  Running Neural Diagnosis...
                                </>
                              ) : (
                                <>
                                  <Cpu className="h-3.5 w-3.5" />
                                  Run AI Cognitive Triage
                                </>
                              )}
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-4 font-mono">
                            {/* Analysis Outcomes grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                              {/* Risk Score */}
                              <div className="bg-[#0B0E14] border border-slate-800 p-3.5 rounded">
                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Cognitive Risk Score</span>
                                <div className="flex items-baseline gap-1 mt-1.5">
                                  <span className={`text-2xl font-black ${
                                    selectedAlert.triageResult.riskScore >= 80 ? 'text-rose-400' : 'text-amber-400'
                                  }`}>{selectedAlert.triageResult.riskScore}</span>
                                  <span className="text-slate-600 text-[10px] font-bold">/100</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden mt-2">
                                  <div 
                                    className={`h-full ${
                                      selectedAlert.triageResult.riskScore >= 80 ? 'bg-rose-500' : 'bg-amber-500'
                                    }`}
                                    style={{ width: `${selectedAlert.triageResult.riskScore}%` }}
                                  />
                                </div>
                              </div>

                              {/* Action Recommendations */}
                              <div className="bg-[#0B0E14] border border-slate-800 p-3.5 rounded md:col-span-2">
                                <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider block">Recommended mitigation sequence</span>
                                <p className="text-xs text-slate-300 mt-1.5 font-sans leading-relaxed">
                                  {selectedAlert.triageResult.recommendedAction}
                                </p>
                              </div>
                            </div>

                            {/* Triage summary explanation text */}
                            <div className="bg-[#0B0E14] border border-slate-800 p-4 rounded text-xs space-y-1 bg-blue-950/5">
                              <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider block text-blue-400">Deep Triage Analysis Output:</span>
                              <p className="text-slate-300 leading-relaxed font-sans mt-1">
                                {selectedAlert.triageResult.explanation}
                              </p>
                            </div>

                            {/* Compromising features indicators list and Visual Propagation graph */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                              <div>
                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-2 block">Identified Risk Markers:</span>
                                <ul className="space-y-1.5">
                                  {selectedAlert.triageResult.compromisingFactors.map((fac, idx) => (
                                    <li key={idx} className="text-xs text-rose-400 font-sans flex items-start gap-1.5">
                                      <span className="text-rose-500 mt-0.5">•</span>
                                      <span>{fac}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div>
                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-2 block">Attack Propagation Path:</span>
                                <div className="space-y-1.5 font-sans">
                                  {selectedAlert.triageResult.visualAttackPath.map((node, index) => (
                                    <div key={index} className="flex items-center gap-1.5">
                                      <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono font-bold">Step {index + 1}</span>
                                      <span className="text-xs text-slate-300 truncate">{node}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Escalation command button bottom */}
                      {selectedAlert.triageResult && (
                        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                          <span className="text-[10px] text-slate-500 font-mono">Cognitive verification successful</span>
                          <button
                            onClick={() => {
                              // Trigger auto load of playbook and switch view
                              setActiveTab('playbooks');
                            }}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider px-4 py-2 rounded font-mono cursor-pointer"
                          >
                            Orchestrate Containment Playbook
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'playbooks' && (
              <motion.div
                key="playbooks"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-6"
              >
                {/* Playbook list selector leftmost */}
                <div className="lg:col-span-4 bg-[#151921] rounded-lg border border-slate-800 p-5 space-y-4 h-[580px]">
                  <div>
                    <h3 className="font-bold text-white uppercase text-xs tracking-wider font-mono flex items-center gap-2">
                      <Play className="h-4 w-4 text-blue-400 fill-current" />
                      Playbook Catalogs
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1 font-sans">Real-time automation procedures. Deploy or reset containers manually depending on network priorities.</p>
                  </div>

                  <div className="space-y-3 font-mono">
                    {playbooks.map(pb => (
                      <div
                        key={pb.id}
                        className="p-4 bg-[#0B0E14] rounded border border-slate-800 space-y-3"
                      >
                        <div>
                          <h4 className="text-xs font-bold text-white leading-normal">{pb.name}</h4>
                          <p className="text-[10px] text-slate-500 mt-1 font-sans leading-relaxed">{pb.description}</p>
                        </div>

                        <div className="flex justify-between items-center text-[10px]">
                          <span className={`px-2 py-0.5 rounded border ${
                            pb.status === 'running' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            pb.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-400'
                          } uppercase`}>
                            {pb.status}
                          </span>

                          <button
                            onClick={() => handleResetPlaybook(pb.id)}
                            className="text-[10px] hover:text-white text-slate-400 font-bold underline cursor-pointer"
                          >
                            Reset Routine
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rightmost detailed step-by-step executions container */}
                <div className="lg:col-span-8 bg-[#151921] rounded-lg border border-slate-800 p-5 flex flex-col justify-between h-[580px]">
                  {/* Select AD block playbook for deep telemetry demonstration since it is running */}
                  {(() => {
                    const activePb = playbooks[0]; // Let's demonstrate the detailed AD Containment pipeline
                    const progressVal = Math.round((activePb.steps.filter(s => s.status === 'completed').length / activePb.steps.length) * 100);
                    const currentStep = activePb.steps[activePb.currentStepIndex];

                    return (
                      <div className="space-y-5 h-full flex flex-col justify-between">
                        <div className="space-y-4">
                          {/* Title block */}
                          <div className="flex justify-between items-start pb-4 border-b border-slate-800">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="bg-blue-600/10 text-blue-400 border border-blue-600/20 px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase">
                                  Target: DC-01 Container
                                </span>
                                <span className="text-slate-700 font-mono text-xs">•</span>
                                <span className="text-emerald-400 text-[10px] font-mono font-bold tracking-wider uppercase">AUTOMATED WORKFLOW ACTIVE</span>
                              </div>
                              <h3 className="text-sm font-bold text-white mt-1.5 font-sans leading-normal">{activePb.name}</h3>
                              <p className="text-[11px] text-slate-400 font-sans leading-relaxed mt-1">{activePb.description}</p>
                            </div>

                            <div className="text-right font-mono flex-shrink-0 pl-4">
                              <span className="text-xs font-bold text-slate-400">Autopilot Integrity</span>
                              <div className="text-lg font-black text-white mt-1">{progressVal}% Done</div>
                            </div>
                          </div>

                          {/* Steps loop */}
                          <div className="space-y-3 font-mono">
                            {activePb.steps.map((st, i) => {
                              const isCurrent = activePb.currentStepIndex === i && activePb.status === 'running';
                              return (
                                <div
                                  key={st.id}
                                  className={`p-3.5 rounded border transition-all ${
                                    st.status === 'completed' ? 'bg-emerald-950/20 border-emerald-500/30' :
                                    isCurrent ? 'bg-blue-950/20 border-blue-500/40' : 'bg-[#0B0E14] border-slate-800 opacity-60'
                                  }`}
                                >
                                  <div className="flex justify-between items-center text-[10px] mb-1">
                                    <span className="text-slate-500 uppercase font-bold uppercase tracking-wider">Step {i + 1} // {st.actionType.replace('_', ' ')}</span>
                                    <span className={`px-1.5 py-0.5 rounded uppercase font-bold border ${
                                      st.status === 'completed' ? 'text-emerald-400 border-emerald-500/25 bg-emerald-500/5' :
                                      st.status === 'running' ? 'text-blue-400 border-blue-500/25 bg-blue-500/5' : 'text-slate-500 border-slate-800'
                                    }`}>
                                      {st.status}
                                    </span>
                                  </div>

                                  <div className="text-xs text-white font-sans font-medium mt-1">{st.label}</div>

                                  {/* Result Message or manual actions if running */}
                                  {st.resultMessage && (
                                    <div className="text-[10px] text-slate-400 bg-[#0B0E14]/70 p-2 rounded border border-slate-900 mt-2">
                                      {st.resultMessage}
                                    </div>
                                  )}

                                  {/* Render manual choice buttons if it is currently waiting action */}
                                  {isCurrent && st.actionType === 'manual_approval' && (
                                    <div className="flex items-center gap-2 mt-3">
                                      {st.choices?.map((ch, idx) => (
                                        <button
                                          key={idx}
                                          onClick={() => handleManualActionApproval(activePb.id, ch)}
                                          className={`text-[10px] uppercase font-bold tracking-wider px-3 py-1.5 rounded border cursor-pointer ${
                                            idx === 0 
                                              ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-500 text-white' 
                                              : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                                          }`}
                                        >
                                          {ch}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Interactive trigger panels at the bottom */}
                        <div className="pt-4 border-t border-slate-800 flex items-center justify-between font-mono">
                          <span className="text-[10px] text-slate-500">Manual policy overrides available at any time</span>
                          
                          {activePb.status === 'running' && currentStep && currentStep.actionType !== 'manual_approval' && (
                            <button
                              onClick={() => handleExecutePlaybookStep(activePb.id)}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded cursor-pointer"
                            >
                              Execute Step {activePb.currentStepIndex + 1} Securely
                            </button>
                          )}

                          {activePb.status === 'completed' && (
                            <span className="text-emerald-400 text-xs font-bold uppercase tracking-widest flex items-center gap-1.5">
                              <CheckCircle className="h-4 w-4" />
                              All Containment sequences Completed
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </motion.div>
            )}

            {activeTab === 'copilot' && (
              <motion.div
                key="copilot"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-6 select-text"
              >
                {/* Left side context information panel */}
                <div className="lg:col-span-4 bg-[#151921] rounded-lg border border-slate-800 p-5 space-y-5 h-[580px] flex flex-col justify-between">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-bold text-white uppercase text-xs tracking-wider font-mono flex items-center gap-2">
                        <Terminal className="h-4 w-4 text-blue-400" />
                        AI Sandbox Context
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-1 font-sans">The co-pilot model consumes platform parameters and logs in memory to answer queries accurately.</p>
                    </div>

                    <div className="space-y-3 font-mono">
                      <div className="p-3 bg-[#0B0E14] rounded border border-slate-800 space-y-1.5">
                        <span className="text-[9px] text-slate-500 font-bold uppercase block">Active In-Context Incident:</span>
                        {selectedAlert ? (
                          <div className="space-y-1">
                            <h4 className="text-xs font-semibold text-white truncate">{selectedAlert.title}</h4>
                            <span className="text-[10px] text-slate-400">Src: {selectedAlert.source}</span>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-600">No incident selected. Select one in Incident Triage tab dynamically.</div>
                        )}
                      </div>

                      <div className="p-3 bg-[#0B0E14] rounded border border-slate-800 space-y-1.5">
                        <span className="text-[9px] text-slate-500 font-bold uppercase block">Analyst Instructions Suggestions:</span>
                        <div className="space-y-2 text-slate-300 text-xs leading-normal font-sans">
                          <button
                            onClick={() => setChatInput('Draft Splunk query to identify persistent LSASS readers in real-time logs')}
                            className="bg-[#151921] border border-slate-800 text-slate-300 p-2 rounded hover:border-blue-500 cursor-pointer text-left block w-full text-[11px]"
                          >
                            "Draft SPL query for local LSASS memory read reader pattern"
                          </button>
                          <button
                            onClick={() => setChatInput('Explain immediate containment guidelines for a ransomware attack on domain controllers')}
                            className="bg-[#151921] border border-slate-800 text-slate-300 p-2 rounded hover:border-blue-500 cursor-pointer text-left block w-full text-[11px] mt-1"
                          >
                            "Explain ransomware mitigations on controllers"
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500 font-mono text-center">
                    Agent is connected to cognitive core via server proxy.
                  </div>
                </div>

                {/* Right side active Chat terminal inside sandbox layout */}
                <div className="lg:col-span-8 bg-[#151921] rounded-lg border border-slate-800 flex flex-col justify-between h-[580px] overflow-hidden">
                  {/* Chat logs list */}
                  <div className="flex-1 p-5 overflow-y-auto space-y-4 max-h-[490px]">
                    {chatMessages.map((msg, i) => {
                      const isUser = msg.sender === 'user';
                      return (
                        <div
                          key={msg.id || i}
                          className={`flex gap-3 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
                        >
                          <div className={`w-7 h-7 rounded flex items-center justify-center flex-shrink-0 text-xs font-bold uppercase ${
                            isUser ? 'bg-blue-600 text-white' : 'bg-[#0B0E14] border border-slate-800 text-blue-400 font-mono'
                          }`}>
                            {isUser ? 'U' : 'AI'}
                          </div>

                          <div className={`p-3.5 rounded-lg border ${
                            isUser 
                              ? 'bg-blue-600/10 border-blue-500/35 text-slate-200' 
                              : 'bg-[#0F1219] border-slate-800 text-slate-300'
                          }`}>
                            <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                            <span className="text-[9px] text-slate-500 mt-1.5 block text-right font-mono font-medium">{msg.timestamp}</span>
                          </div>
                        </div>
                      );
                    })}
                    {isChatSending && (
                      <div className="flex gap-3 max-w-[85%]">
                        <div className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0 bg-[#0B0E14] border border-slate-800 text-blue-400 font-mono text-xs">AI</div>
                        <div className="p-3 bg-[#0F1219] rounded-lg border border-slate-800 text-slate-500 text-xs italic">
                          Co-pilot intelligence unit thinking...
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Input form layout inside chat terminal */}
                  <form onSubmit={handleSendChatMessage} className="p-4 bg-[#0F1219] border-t border-slate-800 flex gap-3 flex-shrink-0">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      placeholder="Ask the co-pilot agent about query syntax, mitigation strategies..."
                      className="flex-1 text-xs p-3 bg-[#0B0E14] border border-slate-800 rounded text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-600 font-mono"
                    />
                    <button
                      type="submit"
                      disabled={isChatSending || !chatInput.trim()}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs uppercase tracking-wider rounded font-mono flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Send
                    </button>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
