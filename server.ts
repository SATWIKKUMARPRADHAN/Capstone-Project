import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { Server as SocketIOServer } from 'socket.io';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import { labStore } from './server/store.ts';
import { recoveryOrchestrator, type FaultKind } from './server/recoveryEngine.ts';
import { runIsolationForest } from './server/isolationForest.ts';
import { EXAM_QUESTIONS } from './server/examQuestions.ts';

const PORT = Number(process.env.PORT || 3000);
const ROOT_DIR = process.cwd();

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: { origin: '*' },
  });

  app.use(express.json({ limit: '2mb' }));
  recoveryOrchestrator.attachSocket(io);

  io.on('connection', (socket) => {
    socket.emit('lab:state', labStore.getSnapshot());
    socket.on('lab:request_sync', () => {
      socket.emit('lab:state', labStore.getSnapshot());
    });
  });

  // Periodic server-side workstation telemetry pulse (simulates PowerShell/NRPE collector)
  setInterval(() => {
    const workstations = labStore.getWorkstations();
    for (const ws of workstations) {
      if (ws.status === 'healthy') {
        const nextCpu = Number(
          Math.min(58, Math.max(12, ws.cpuPercent + (Math.random() * 6 - 3))).toFixed(1)
        );
        const nextMem = Number(
          Math.min(68, Math.max(32, ws.memoryPercent + (Math.random() * 3 - 1.5))).toFixed(1)
        );
        const nextLatency = Math.round(
          Math.min(35, Math.max(12, ws.examLatencyMs + (Math.random() * 4 - 2)))
        );
        labStore.updateWorkstation(ws.workstationId, {
          cpuPercent: nextCpu,
          memoryPercent: nextMem,
          examLatencyMs: nextLatency,
        });
      }
    }
    io.emit('lab:state', labStore.getSnapshot());
  }, 8000);

  // --- Health & Exam Monitoring Endpoints ---
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'labguard-backend', timestamp: new Date().toISOString() });
  });

  app.get('/api/exam/health', (_req, res) => {
    const healthy = labStore.getExamGlobalHealthy();
    if (!healthy) {
      return res.status(503).json({
        status: 'stopped',
        service: 'LabGuardExamService',
        message: 'Examination endpoint unavailable (simulated crash/stop)',
        timestamp: new Date().toISOString(),
      });
    }
    return res.json({
      status: 'healthy',
      service: 'LabGuardExamService',
      activeExam: 'CS301 Computer Systems & DevOps',
      questionCount: EXAM_QUESTIONS.length,
      timestamp: new Date().toISOString(),
    });
  });

  // --- Full State Snapshot & Reset ---
  app.get('/api/state', (_req, res) => {
    res.json(labStore.getSnapshot());
  });

  app.post('/api/state/reset', (_req, res) => {
    const snapshot = labStore.resetDemoState();
    io.emit('lab:state', snapshot);
    res.json(snapshot);
  });

  // --- Workstation Registry & QR Code Endpoints ---
  app.get('/api/workstations', (_req, res) => {
    res.json(labStore.getWorkstations());
  });

  app.post('/api/workstations', (req, res) => {
    try {
      const { workstationId, hostname, labRoom, seatNumber, ipAddress, osVersion } = req.body;
      if (!workstationId || !ipAddress) {
        return res.status(400).json({ error: 'workstationId and ipAddress are required' });
      }
      const created = labStore.addWorkstation({
        workstationId: String(workstationId).trim().toUpperCase(),
        hostname: hostname || `${String(workstationId).toLowerCase()}.lab.local`,
        labRoom: labRoom || 'CSE Exam Lab 1',
        seatNumber: Number(seatNumber) || labStore.getWorkstations().length + 1,
        ipAddress,
        osVersion: osVersion || 'Windows 11 Pro 23H2',
      });
      io.emit('lab:state', labStore.getSnapshot());
      res.status(201).json(created);
    } catch (err) {
      res.status(409).json({ error: (err as Error).message });
    }
  });

  app.delete('/api/workstations/:id', (req, res) => {
    const ok = labStore.deleteWorkstation(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Workstation not found' });
    io.emit('lab:state', labStore.getSnapshot());
    res.json({ deleted: true });
  });

  app.get('/api/workstations/:id/qr', async (req, res) => {
    const ws = labStore.getWorkstation(req.params.id);
    if (!ws) return res.status(404).json({ error: 'Workstation not found' });

    const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.get('host') || `localhost:${PORT}`;
    const baseUrl = process.env.APP_URL || `${proto}://${host}`;
    const reportUrl = `${baseUrl.replace(/\/$/, '')}/?view=report&ws=${encodeURIComponent(ws.workstationId)}`;

    const format = req.query.format || 'json';
    try {
      if (format === 'png') {
        const buffer = await QRCode.toBuffer(reportUrl, {
          width: 420,
          margin: 2,
          color: { dark: '#0f172a', light: '#ffffff' },
        });
        res.setHeader('Content-Type', 'image/png');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${ws.workstationId}-QR.png"`
        );
        return res.send(buffer);
      }
      if (format === 'svg') {
        const svg = await QRCode.toString(reportUrl, { type: 'svg', margin: 2 });
        res.setHeader('Content-Type', 'image/svg+xml');
        return res.send(svg);
      }
      const dataUrl = await QRCode.toDataURL(reportUrl, {
        width: 320,
        margin: 2,
        color: { dark: '#0f172a', light: '#ffffff' },
      });
      return res.json({ workstationId: ws.workstationId, reportUrl, dataUrl });
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message });
    }
  });

  // --- QR Student Issue Reporting ---
  app.post('/api/reports', (req, res) => {
    const { workstationId, studentName, rollNumber, category, description } = req.body;
    if (!workstationId || !studentName || !rollNumber || !category) {
      return res.status(400).json({ error: 'Missing required fields for issue report' });
    }
    const ws = labStore.getWorkstation(workstationId);
    if (!ws) {
      return res.status(404).json({ error: `Workstation ${workstationId} not registered` });
    }
    const result = recoveryOrchestrator.handleStudentQrReport({
      workstationId,
      studentName,
      rollNumber,
      category,
      description: description || `${category} reported via QR code scan`,
    });
    res.status(201).json(result);
  });

  app.patch('/api/reports/:id', (req, res) => {
    const updated = labStore.updateIssueReport(req.params.id, {
      status: req.body.status || 'resolved',
      resolvedAt: new Date().toISOString(),
    });
    if (!updated) return res.status(404).json({ error: 'Report not found' });

    // Also resolve matching manual_required incidents on that workstation if resolved
    if (updated.status === 'resolved') {
      const openInc = labStore
        .getIncidents()
        .filter((i) => i.workstationId === updated.workstationId && i.status !== 'resolved');
      for (const inc of openInc) {
        labStore.updateIncident(inc.incidentId, { status: 'resolved', nagiosVerified: true });
      }
      labStore.updateWorkstation(updated.workstationId, { status: 'healthy' });
    }

    io.emit('lab:state', labStore.getSnapshot());
    res.json(updated);
  });

  // --- Nagios Webhook & Windows PowerShell Telemetry ---
  app.post('/api/nagios/webhook', (req, res) => {
    const { workstationId, service, state } = req.body;
    if (!workstationId) return res.status(400).json({ error: 'workstationId is required' });

    if (state === 'OK') {
      const open = labStore
        .getIncidents()
        .filter((i) => i.workstationId === workstationId && i.status !== 'resolved');
      for (const inc of open) {
        labStore.updateIncident(inc.incidentId, { status: 'resolved', nagiosVerified: true });
      }
      labStore.updateWorkstation(workstationId, { status: 'healthy' });
      io.emit('lab:state', labStore.getSnapshot());
      return res.json({ acknowledged: true, verified: true });
    }

    let faultType: FaultKind = 'EXAM_SERVICE_STOPPED';
    if (String(service).includes('CPU')) faultType = 'CPU_SATURATION';
    else if (String(service).includes('Disk')) faultType = 'DISK_CRITICAL';
    else if (String(service).includes('Host')) faultType = 'NETWORK_LOSS';

    const result = recoveryOrchestrator.injectFault(workstationId, faultType, 'nagios', true);
    res.json(result);
  });

  app.post('/api/telemetry', (req, res) => {
    const { workstationId, cpuPercent, memoryPercent, diskPercent, examServiceUp, examLatencyMs } =
      req.body;
    const ws = labStore.getWorkstation(workstationId);
    if (!ws) return res.status(404).json({ error: 'Workstation not found' });

    labStore.updateWorkstation(workstationId, {
      cpuPercent: Number(cpuPercent ?? ws.cpuPercent),
      memoryPercent: Number(memoryPercent ?? ws.memoryPercent),
      diskPercent: Number(diskPercent ?? ws.diskPercent),
      examServiceStatus: examServiceUp === false ? 'stopped' : 'running',
      examLatencyMs: Number(examLatencyMs ?? ws.examLatencyMs),
    });

    const scored = labStore.addMetricLog({
      workstationId,
      timestamp: new Date().toISOString(),
      cpuPercent: Number(cpuPercent ?? ws.cpuPercent),
      memoryPercent: Number(memoryPercent ?? ws.memoryPercent),
      diskPercent: Number(diskPercent ?? ws.diskPercent),
      examLatencyMs: Number(examLatencyMs ?? ws.examLatencyMs),
    });

    if (scored.isAnomaly) {
      labStore.addIncident({
        incidentId: `INC-${Math.floor(1000 + Math.random() * 9000)}`,
        workstationId,
        source: 'ml_anomaly',
        faultType: 'ML_BEHAVIOR_ANOMALY',
        probableCause: `Isolation Forest flagged abnormal ${scored.dominantFeature} vector (score: ${scored.anomalyScore})`,
        severity: 'warning',
        status: 'detected',
        nagiosVerified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    io.emit('lab:state', labStore.getSnapshot());
    res.json({ recorded: true, metric: scored });
  });

  // --- Fault Injection, Ansible Recovery & Puppet Compliance ---
  app.post('/api/faults/inject', (req, res) => {
    try {
      const { workstationId, faultType, autoRecover } = req.body;
      const result = recoveryOrchestrator.injectFault(
        workstationId,
        faultType as FaultKind,
        'manual',
        autoRecover !== false
      );
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.post('/api/recovery/execute', (req, res) => {
    const { incidentId, playbook } = req.body;
    const log = recoveryOrchestrator.executeRecovery(
      incidentId,
      playbook || 'restart_exam_service.yml',
      'manual_admin'
    );
    if (!log) return res.status(404).json({ error: 'Incident or workstation not found' });
    res.json(log);
  });

  app.post('/api/puppet/enforce', (req, res) => {
    const { workstationId } = req.body;
    const updated = recoveryOrchestrator.enforcePuppetCompliance(workstationId);
    if (!updated) return res.status(404).json({ error: 'Workstation not found' });
    res.json(updated);
  });

  // --- Data Science: Isolation Forest Anomaly Analysis ---
  app.get('/api/ml/analyze', (req, res) => {
    const contamination = Number(req.query.contamination || 0.08);
    const analysis = runIsolationForest(labStore.getMetricLogs(), contamination);
    res.json(analysis);
  });

  app.get('/api/ml/export-csv', (_req, res) => {
    const rows = labStore.getMetricLogs();
    const header =
      'id,workstationId,timestamp,cpuPercent,memoryPercent,diskPercent,examLatencyMs,isAnomaly,anomalyScore,dominantFeature\n';
    const body = rows
      .map(
        (r) =>
          `${r.id},${r.workstationId},${r.timestamp},${r.cpuPercent},${r.memoryPercent},${r.diskPercent},${r.examLatencyMs},${r.isAnomaly},${r.anomalyScore},${r.dominantFeature || ''}`
      )
      .join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="labguard-telemetry-dataset.csv"');
    res.send(header + body);
  });

  // --- Custom Examination Application APIs ---
  app.get('/api/exam/questions', (_req, res) => {
    const sanitized = EXAM_QUESTIONS.map(({ correctIndex: _c, ...rest }) => rest);
    res.json({
      examTitle: 'CS301: Operating Systems, Networks & DevOps Assessment',
      durationMinutes: 20,
      questions: sanitized,
    });
  });

  app.get('/api/exam/draft/:rollNumber', (req, res) => {
    const draft = labStore.getExamDraft(req.params.rollNumber);
    res.json({ draft: draft || null });
  });

  app.post('/api/exam/autosave', (req, res) => {
    const { rollNumber, studentName, workstationId, answers } = req.body;
    if (!rollNumber) return res.status(400).json({ error: 'rollNumber required' });
    labStore.saveExamDraft({
      rollNumber,
      studentName: studentName || 'Student',
      workstationId: workstationId || 'WS-LAB1-01',
      answers: answers || {},
      updatedAt: new Date().toISOString(),
    });
    res.json({ saved: true, updatedAt: new Date().toISOString() });
  });

  app.post('/api/exam/submit', (req, res) => {
    const { rollNumber, studentName, workstationId, answers, timeSpentSeconds } = req.body;
    if (!rollNumber || !studentName) {
      return res.status(400).json({ error: 'rollNumber and studentName required' });
    }
    let score = 0;
    for (const q of EXAM_QUESTIONS) {
      if (answers && answers[q.id] === q.correctIndex) {
        score += 1;
      }
    }
    const submission = labStore.addExamSubmission({
      submissionId: `SUB-${Math.floor(1000 + Math.random() * 9000)}`,
      studentName,
      rollNumber,
      workstationId: workstationId || 'WS-LAB1-01',
      answers: answers || {},
      score,
      totalQuestions: EXAM_QUESTIONS.length,
      timeSpentSeconds: Number(timeSpentSeconds || 0),
      submittedAt: new Date().toISOString(),
    });
    io.emit('lab:state', labStore.getSnapshot());
    res.status(201).json(submission);
  });

  app.post('/api/exam/toggle-service', (req, res) => {
    const healthy = Boolean(req.body.healthy);
    labStore.setExamGlobalHealthy(healthy);
    if (!healthy) {
      recoveryOrchestrator.injectFault('WS-LAB1-01', 'EXAM_SERVICE_STOPPED', 'nagios', false);
    } else {
      const openExamInc = labStore
        .getIncidents()
        .find((i) => i.workstationId === 'WS-LAB1-01' && i.status !== 'resolved');
      if (openExamInc) {
        recoveryOrchestrator.executeRecovery(
          openExamInc.incidentId,
          'restart_exam_service.yml',
          'manual_admin'
        );
      } else {
        labStore.updateWorkstation('WS-LAB1-01', {
          status: 'healthy',
          examServiceStatus: 'running',
          examLatencyMs: 18,
        });
        io.emit('lab:state', labStore.getSnapshot());
      }
    }
    res.json({ examGlobalHealthy: labStore.getExamGlobalHealthy() });
  });

  // --- Capstone Deliverables File Explorer & Complete Downloadable ZIP ---
  app.get('/api/project/files', (_req, res) => {
    const filePaths = [
      'README.md',
      'docs/ARCHITECTURE.md',
      'docs/VIVA_GUIDE.md',
      'devops/nagios/nagios.cfg',
      'devops/nagios/commands.cfg',
      'devops/nagios/lab-workstations.cfg',
      'devops/nagios/exam-app.cfg',
      'devops/nagios/notify-backend.sh',
      'devops/ansible/ansible.cfg',
      'devops/ansible/hosts.ini',
      'devops/ansible/playbooks/restart_exam_service.yml',
      'devops/ansible/playbooks/recover_high_cpu.yml',
      'devops/ansible/playbooks/cleanup_disk.yml',
      'devops/ansible/playbooks/reset_network_adapter.yml',
      'devops/ansible/playbooks/restore_exam_kiosk.yml',
      'devops/puppet/manifests/site.pp',
      'devops/puppet/modules/lab_workstation/manifests/init.pp',
      'devops/puppet/modules/exam_kiosk/manifests/init.pp',
      'devops/terraform/main.tf',
      'devops/terraform/variables.tf',
      'devops/docker/docker-compose.yml',
      'devops/docker/Dockerfile.app',
      'devops/docker/Dockerfile.ml',
      'devops/docker/mongo-init.js',
      'ml/requirements.txt',
      'ml/anomaly_detector.py',
      'ml/ml_api.py',
      'ml/sample_telemetry.csv',
      'windows-agent/Collect-LabMetrics.ps1',
      'windows-agent/Install-NRPE-Agent.ps1',
      'database/mongodb/schemas.js',
    ];

    const files = filePaths
      .filter((rel) => fs.existsSync(path.join(ROOT_DIR, rel)))
      .map((rel) => ({
        path: rel,
        content: fs.readFileSync(path.join(ROOT_DIR, rel), 'utf-8'),
      }));

    res.json({ files });
  });

  app.get('/api/project/download-zip', async (_req, res) => {
    try {
      const zip = new JSZip();
      const rootFolder = zip.folder('LabGuard-BTech-Capstone-Project')!;

      const addDirRecursive = (absDir: string, zipFolder: JSZip) => {
        const entries = fs.readdirSync(absDir, { withFileTypes: true });
        for (const entry of entries) {
          if (
            entry.name === 'node_modules' ||
            entry.name === 'dist' ||
            entry.name === '.git' ||
            entry.name === 'data'
          ) {
            continue;
          }
          const fullPath = path.join(absDir, entry.name);
          if (entry.isDirectory()) {
            const sub = zipFolder.folder(entry.name)!;
            addDirRecursive(fullPath, sub);
          } else if (entry.isFile()) {
            const content = fs.readFileSync(fullPath);
            zipFolder.file(entry.name, content, {
              dosPermissions: 0x20,
              date: new Date('2026-11-16T12:00:00Z'),
            });
          }
        }
      };

      const includeDirs = [
        'src',
        'server',
        'devops',
        'ml',
        'windows-agent',
        'database',
        'docs',
      ];
      for (const dir of includeDirs) {
        const fullPath = path.join(ROOT_DIR, dir);
        if (fs.existsSync(fullPath)) {
          addDirRecursive(fullPath, rootFolder.folder(dir)!);
        }
      }

      const rootFiles = [
        'README.md',
        'package.json',
        'tsconfig.json',
        'vite.config.ts',
        'index.html',
        'server.ts',
        '.env.example',
        'metadata.json',
      ];
      for (const file of rootFiles) {
        const fullFile = path.join(ROOT_DIR, file);
        if (fs.existsSync(fullFile)) {
          rootFolder.file(file, fs.readFileSync(fullFile), {
            dosPermissions: 0x20,
            date: new Date('2026-11-16T12:00:00Z'),
          });
        }
      }

      const zipBuffer = await zip.generateAsync({
        type: 'nodebuffer',
        platform: 'DOS',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Length', String(zipBuffer.length));
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="LabGuard-BTech-Capstone-Project.zip"'
      );
      return res.status(200).send(zipBuffer);
    } catch (err) {
      return res.status(500).json({ error: (err as Error).message });
    }
  });

  // --- Frontend Vite Dev Middleware or Static Production Build ---
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(ROOT_DIR, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`LabGuard server listening on http://localhost:${PORT}`);
  });
}

startServer();
