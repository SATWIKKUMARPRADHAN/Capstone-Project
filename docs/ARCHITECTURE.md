# System Architecture & Technical Design Decisions

## 1. Layered Architecture

LabGuard follows a four-tier event-driven architecture designed specifically for low-cost campus LAN deployments:

1. **Presentation Tier (React 19 + Tailwind CSS + Socket.IO Client)**
   - Single-page multi-view console providing Admin Overview, Workstation QR Registry, Mobile QR Issue Portal, Custom Examination App, DevOps Orchestrator, and ML Anomaly Analytics.
   - Subscribes to Socket.IO room events (`lab:state`, `incident:created`, `recovery:completed`, `telemetry:tick`) for sub-second dashboard synchronization without page reloads.

2. **Application & Orchestration Tier (Node.js + Express + Socket.IO)**
   - **REST API**: Handles workstation CRUD, QR code PNG/SVG generation, exam session autosave & grading, Nagios webhooks, and fault injection / manual recovery triggers.
   - **Triage Engine (`server/recoveryEngine.ts`)**: Correlates incoming Nagios alerts and student QR reports against deterministic fault-mapping rules (`EXAM_SERVICE_STOPPED` -> `restart_exam_service.yml`, `CPU_SATURATION` -> `recover_high_cpu.yml`, `DISK_CRITICAL` -> `cleanup_disk.yml`, `NETWORK_LOSS` -> `reset_network_adapter.yml`, `CONFIG_DRIFT` -> `restore_exam_kiosk.yml`).
   - **Hardware Escalation Guard**: Physical hardware reports (keyboard, mouse, monitor cable, power) bypass automated recovery and immediately raise an admin-intervention alert.

3. **Infrastructure & Automation Tier (Nagios + Ansible + Puppet + PowerShell)**
   - **Nagios Core** executes periodic active checks (`check_http`, `check_nrpe`) and invokes `notify-backend.sh` on state transitions.
   - **Ansible** connects over WinRM (port 5985) to Windows 10/11 workstations to run idempotent YAML playbooks and verify service restoration.
   - **Puppet** enforces baseline configuration compliance (`w32time`, `nscp`, `WinRM`, `exam-kiosk.json`) to eliminate configuration drift across exam machines.

4. **Data Science & Persistence Tier (MongoDB + Python Scikit-learn)**
   - **MongoDB** stores workstation state, time-series metric logs, incidents, recovery audit logs, and exam submissions (with a zero-config persistent file store fallback for standalone demo runs).
   - **Isolation Forest** partitions multi-feature metric vectors `[cpuPercent, memoryPercent, diskPercent, examLatencyMs]` using randomized decision trees; points requiring fewer splits to isolate receive high anomaly scores.
