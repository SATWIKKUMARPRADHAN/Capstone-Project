# B.Tech CSE Capstone Viva Preparation Guide

## Key Technical Questions & Answers

### 1. Why did you combine QR-based reporting with Nagios monitoring?
Nagios detects infrastructure-level and application-level failures (HTTP 503, high CPU, disk full, host unreachable), but it cannot detect physical or ergonomic issues such as a disconnected mouse, flickering monitor, or stuck keyboard. Combining student-initiated QR reports with active Nagios probing covers both cyber and physical lab reliability gaps.

### 2. Why did you choose Isolation Forest over simple static thresholds?
Static thresholds (e.g., `CPU > 90%`) miss correlated multi-metric anomalies. For example, a workstation with 68% CPU, 79% RAM, and 380ms exam response latency during a quiet period may be experiencing a memory leak or network storm even though no single static threshold fired. Isolation Forest isolates anomalous feature combinations in `O(n log n)` time without requiring labeled failure datasets.

### 3. How do Ansible and Puppet complement each other in this system?
- **Puppet** is declarative and continuous: it maintains the desired baseline configuration of every Windows workstation (ensuring the NRPE agent, WinRM, NTP sync, and kiosk JSON remain compliant).
- **Ansible** is imperative and event-driven: when Nagios or a student triggers an incident, the Node.js backend invokes a targeted Ansible playbook on the affected machine to restart a crashed service or purge temp caches.

### 4. How does the system avoid infinite recovery loops?
Every automated recovery action is followed by a verification step (`verifyHealth`). If recovery fails twice or if the fault category is physical hardware, the incident transitions to `manual_required` and stops automated retries while alerting the lab administrator.

### 5. Why use Socket.IO alongside REST APIs?
During an active university examination with 30–60 workstations, polling every second introduces unnecessary HTTP overhead. REST APIs handle transactional mutations (registering nodes, submitting exams, posting webhooks), while Socket.IO pushes incremental state deltas immediately to connected administrator screens.
