// Mongoose Schemas for LabGuard MongoDB Community Edition
import mongoose from "mongoose";

const WorkstationSchema = new mongoose.Schema(
  {
    workstationId: { type: String, required: true, unique: true },
    hostname: { type: String, required: true },
    labRoom: { type: String, required: true },
    seatNumber: { type: Number, required: true },
    ipAddress: { type: String, required: true },
    osVersion: { type: String, default: "Windows 11 Pro" },
    status: {
      type: String,
      enum: ["healthy", "degraded", "failed", "recovering"],
      default: "healthy",
    },
    examServiceStatus: {
      type: String,
      enum: ["running", "stopped", "error"],
      default: "running",
    },
    puppetConfigStatus: {
      type: String,
      enum: ["compliant", "drifted"],
      default: "compliant",
    },
    cpuPercent: { type: Number, default: 20 },
    memoryPercent: { type: Number, default: 42 },
    diskPercent: { type: Number, default: 48 },
    examLatencyMs: { type: Number, default: 18 },
    lastSeen: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const IssueReportSchema = new mongoose.Schema(
  {
    reportId: { type: String, required: true, unique: true },
    workstationId: { type: String, required: true, index: true },
    studentName: { type: String, required: true },
    rollNumber: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    severity: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
    status: { type: String, enum: ["open", "auto_recovering", "resolved", "escalated"], default: "open" },
    assignedPlaybook: { type: String, default: null },
  },
  { timestamps: true }
);

const IncidentSchema = new mongoose.Schema(
  {
    incidentId: { type: String, required: true, unique: true },
    workstationId: { type: String, required: true, index: true },
    source: { type: String, enum: ["nagios", "qr_report", "ml_anomaly", "manual"], required: true },
    faultType: { type: String, required: true },
    probableCause: { type: String, required: true },
    severity: { type: String, enum: ["warning", "critical"], required: true },
    status: { type: String, enum: ["detected", "recovering", "resolved", "manual_required"], default: "detected" },
    nagiosVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const RecoveryLogSchema = new mongoose.Schema(
  {
    recoveryId: { type: String, required: true, unique: true },
    incidentId: { type: String, required: true },
    workstationId: { type: String, required: true },
    playbook: { type: String, required: true },
    triggerMode: { type: String, enum: ["automated", "manual_admin"], required: true },
    success: { type: Boolean, required: true },
    verificationStatus: { type: String, enum: ["verified_ok", "verification_failed"], required: true },
    durationMs: { type: Number, required: true },
    ansibleOutput: { type: String, required: true },
  },
  { timestamps: true }
);

const MetricLogSchema = new mongoose.Schema({
  workstationId: { type: String, required: true, index: true },
  cpuPercent: Number,
  memoryPercent: Number,
  diskPercent: Number,
  examLatencyMs: Number,
  isAnomaly: { type: Boolean, default: false },
  anomalyScore: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now },
});

const ExamSubmissionSchema = new mongoose.Schema(
  {
    submissionId: { type: String, required: true, unique: true },
    studentName: { type: String, required: true },
    rollNumber: { type: String, required: true },
    workstationId: { type: String, required: true },
    answers: { type: Map, of: Number },
    score: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    timeSpentSeconds: { type: Number, required: true },
  },
  { timestamps: true }
);

export const WorkstationModel = mongoose.model("Workstation", WorkstationSchema);
export const IssueReportModel = mongoose.model("IssueReport", IssueReportSchema);
export const IncidentModel = mongoose.model("Incident", IncidentSchema);
export const RecoveryLogModel = mongoose.model("RecoveryLog", RecoveryLogSchema);
export const MetricLogModel = mongoose.model("MetricLog", MetricLogSchema);
export const ExamSubmissionModel = mongoose.model("ExamSubmission", ExamSubmissionSchema);
