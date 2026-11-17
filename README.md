# LabGuard: QR-Based Computer Laboratory Assistance and Self-Healing Monitoring System

**B.Tech Computer Science & Engineering Capstone Project**

LabGuard is a full-stack, real-time laboratory reliability and automated incident-recovery platform built for university computer laboratories and computer-based examination centers. It combines QR-based student issue reporting, continuous Nagios infrastructure monitoring, Ansible automated fault recovery, Puppet configuration enforcement, a custom Examination Application with health telemetry, and Scikit-learn Isolation Forest anomaly detection.

---

## 1. Key Capabilities

- **Workstation Registry & QR Code Generator**: Assign unique IDs (`WS-LAB1-01` .. `WS-LAB1-08`), track live CPU/RAM/Disk metrics, and generate/download scannable QR codes linked directly to each machine's reporting URL.
- **QR-Based Mobile Issue Reporting**: Students scan a workstation's physical QR sticker with a smartphone; the portal automatically identifies the workstation and submits categorized issues to the backend via REST + Socket.IO.
- **Custom Examination Application**: Includes student login, timed Computer Science MCQ test, real-time answer auto-save, submission grading, and a live `/api/exam/health` endpoint monitored by Nagios.
- **Continuous Infrastructure Monitoring (Nagios)**: Monitors workstation availability, exam HTTP health, CPU, RAM, and disk utilization. Nagios event handlers forward alerts via webhook (`/api/nagios/webhook`) into the Node.js triage engine.
- **Automated Fault Recovery (Ansible & Puppet)**: Maps probable failure causes to Ansible playbooks (`restart_exam_service.yml`, `recover_high_cpu.yml`, `cleanup_disk.yml`, `reset_network_adapter.yml`, `restore_exam_kiosk.yml`), executes recovery, verifies health post-recovery, and escalates hardware issues to administrators.
- **Data Science Anomaly Detection (Python + Scikit-learn)**: Analyzes historical multi-dimensional telemetry (`cpuPercent`, `memoryPercent`, `diskPercent`, `examLatencyMs`) using an `IsolationForest` model to flag subtle abnormal behavior before service outages occur.
- **Complete ZIP Export**: One-click download of the full project codebase, DevOps configurations, PowerShell agents, ML scripts, and documentation.

---

## 2. Architecture & Folder Structure

```text
labguard/
├── server.ts                  # Express + Socket.IO + REST API + Vite/Prod Server
├── server/                    # Modular Backend Services
│   ├── types.ts               # Shared domain models & contracts
│   ├── store.ts               # Persistent data repository (MongoDB-compatible schema)
│   ├── isolationForest.ts     # Real-time Isolation Forest scoring engine
│   ├── recoveryEngine.ts      # Root-cause triage + Ansible/Puppet orchestrator
│   └── examQuestions.ts       # MCQ examination bank & grading logic
├── src/                       # React + Tailwind CSS Frontend
│   ├── App.tsx                # Application shell, Socket.IO sync, navigation
│   └── components/            # Modular views (Overview, Workstations, QR Portal, Exam, DevOps, ML, Docs)
├── database/mongodb/          # Mongoose schemas for MongoDB Community Edition
├── devops/
│   ├── nagios/                # Nagios Core host/service configs & webhook handler
│   ├── ansible/               # Inventory & automated fault recovery playbooks
│   ├── puppet/                # Puppet manifests for workstation & kiosk compliance
│   ├── terraform/             # Optional Terraform IaC for local Docker nodes
│   └── docker/                # Docker Compose stack (MongoDB, App, ML, Nagios)
├── ml/                        # Python Pandas + NumPy + Scikit-learn Isolation Forest
├── windows-agent/             # PowerShell metric collector & WinRM/NRPE setup scripts
└── docs/                      # Architecture deep-dive & Technical Viva Guide
```

---

## 3. Local Setup & Execution Guide

### Option A: Standalone Local Run (Windows Laptop / WSL2)

**Prerequisites:** Node.js 20+, npm, Python 3.10+ (optional for Python ML script)

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Start the full-stack server (Express + Socket.IO + React Vite)**
   ```bash
   npm run dev
   ```
3. **Open the application**
   - Admin Dashboard: `http://localhost:3000`
   - Student QR Report Link (scan on smartphone over same Wi-Fi using your laptop LAN IP):
     `http://<YOUR_LAN_IP>:3000/?view=report&ws=WS-LAB1-01`
   - Exam Health Endpoint: `http://localhost:3000/api/exam/health`

### Option B: Full Docker Compose Stack (Ubuntu / WSL2)

Includes MongoDB Community Edition, LabGuard Node.js App, Python Scikit-learn ML API, and Nagios Core:

```bash
cd devops/docker
docker compose up --build -d
```

- LabGuard Dashboard: `http://localhost:3000`
- Nagios Web Console: `http://localhost:8080`
- ML Inference API: `http://localhost:5001/health`
- MongoDB: `mongodb://localhost:27017/labguard`

### Option C: Connecting Physical Windows 10/11 Workstations

1. On each lab Windows PC, run PowerShell as Administrator:
   ```powershell
   .\windows-agent\Install-NRPE-Agent.ps1
   .\windows-agent\Collect-LabMetrics.ps1 -WorkstationId "WS-LAB1-01" -ServerUrl "http://192.168.10.10:3000/api/telemetry"
   ```
2. Print QR stickers from the **Workstations & QR** tab and stick them onto the corresponding monitor bezels.

---

## 4. End-to-End Self-Healing Workflow

1. **Register & Label**: Admin registers `WS-LAB1-01` and downloads its QR sticker.
2. **Detect**: Either a student scans the QR code to report a frozen exam screen, OR Nagios detects `CRITICAL` on `Exam_Application_Health` / `CPU_Utilization`.
3. **Ingest & Triage**: Express receives the webhook/report, identifies the probable cause (e.g., `EXAM_SERVICE_CRASH`), and logs an incident.
4. **Automate Recovery**: The Recovery Engine selects the approved Ansible playbook (`restart_exam_service.yml`) and executes it against the target workstation.
5. **Verify**: The system polls `/api/exam/health` (or Nagios runs an active re-check) to confirm `HTTP 200 OK`.
6. **Escalate if Needed**: Hardware faults (`Keyboard/Mouse Hardware`) or failed verifications are marked `manual_required` and surfaced immediately on the Admin Dashboard via Socket.IO.
7. **Analyze Trends**: Isolation Forest evaluates historical telemetry batches to highlight latent anomalies.
