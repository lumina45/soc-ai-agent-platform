export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type IncidentStatus = 'NEW' | 'TRIAGING' | 'TRIAGED' | 'RESOLVED';

export interface Entity {
  type: 'IP' | 'Host' | 'User' | 'Process' | 'File' | 'Hash';
  value: string;
}

export interface TimelineEvent {
  time: string;
  source: string;
  activity: string;
  details: string;
}

export interface TriageResult {
  riskScore: number;
  explanation: string;
  compromisingFactors: string[];
  recommendedAction: string;
  visualAttackPath: string[]; // E.g. ["Phishing Email Recieved", "User clicked link", "PowerShell executed", "Exfiltration"]
  timeline: TimelineEvent[];
}

export interface IncidentAlert {
  id: string;
  title: string;
  severity: Severity;
  status: IncidentStatus;
  timestamp: string;
  source: string;
  category: string;
  description: string;
  entities: Entity[];
  triageResult?: TriageResult;
}

export type PlaybookStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'manual_approval';

export interface PlaybookStep {
  id: string;
  label: string;
  actionType: 'check_logs' | 'isolate_host' | 'reset_password' | 'block_ip' | 'notify_manager' | 'manual_approval';
  status: PlaybookStepStatus;
  resultMessage?: string;
  choices?: string[]; // E.g., Approve / Reject for manual steps
}

export interface PlaybookInstance {
  id: string;
  name: string;
  description: string;
  steps: PlaybookStep[];
  status: 'idle' | 'running' | 'completed' | 'failed' | 'paused';
  currentStepIndex: number;
  targetAlertId?: string;
}

export type QueryLanguage = 'Splunk SPL' | 'KQL (Sentinel)' | 'Elastic ESQL' | 'Standard SQL';

export interface HuntSession {
  id: string;
  intent: string;
  targetLogs: string;
  queryLanguage: QueryLanguage;
  generatedQuery?: string;
  explanation?: string;
  suggestedDataSources?: string[];
  simulatedResultsCount?: number;
  simulatedResultsJson?: string;
  status: 'draft' | 'running' | 'completed' | 'failed';
  createdAt: string;
}

export interface Message {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  type?: 'text' | 'code' | 'action_summary';
  query?: string;
}
