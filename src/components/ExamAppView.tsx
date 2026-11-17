import { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Power,
  Save,
  Send,
} from 'lucide-react';
import { api } from '../lib/api';
import type { ExamQuestionClient, ExamSubmission, Workstation } from '../types';

interface ExamAppViewProps {
  workstations: Workstation[];
  examGlobalHealthy: boolean;
  submissions: ExamSubmission[];
}

export function ExamAppView({
  workstations,
  examGlobalHealthy,
  submissions,
}: ExamAppViewProps) {
  const [examTitle, setExamTitle] = useState('CS301: Operating Systems, Networks & DevOps');
  const [questions, setQuestions] = useState<ExamQuestionClient[]>([]);
  const [studentName, setStudentName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [workstationId, setWorkstationId] = useState('WS-LAB1-01');
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [secondsLeft, setSecondsLeft] = useState(1200);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [submittedResult, setSubmittedResult] = useState<ExamSubmission | null>(null);
  const [healthProbe, setHealthProbe] = useState<{ statusCode: number; status: string } | null>(
    null
  );
  const [probing, setProbing] = useState(false);

  useEffect(() => {
    api.getExamQuestions().then((res) => {
      setExamTitle(res.examTitle);
      setQuestions(res.questions);
      setSecondsLeft(res.durationMinutes * 60);
    });
  }, []);

  useEffect(() => {
    if (!started || submittedResult) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [started, submittedResult]);

  const handleProbeHealth = async () => {
    setProbing(true);
    try {
      const res = await api.checkExamHealthRaw();
      setHealthProbe({ statusCode: res.statusCode, status: res.data.status });
    } finally {
      setProbing(false);
    }
  };

  useEffect(() => {
    handleProbeHealth();
  }, [examGlobalHealthy]);

  const handleStartExam = async (e: React.FormEvent) => {
    e.preventDefault();
    const draftRes = await api.getExamDraft(rollNumber);
    if (draftRes.draft?.answers) {
      setAnswers(draftRes.draft.answers);
      setLastSavedAt(draftRes.draft.updatedAt);
    }
    setSubmittedResult(null);
    setStarted(true);
  };

  const handleSelectOption = async (questionId: string, optionIndex: number) => {
    if (!examGlobalHealthy) return;
    const next = { ...answers, [questionId]: optionIndex };
    setAnswers(next);
    const saved = await api.autosaveExam({
      rollNumber,
      studentName,
      workstationId,
      answers: next,
    });
    setLastSavedAt(saved.updatedAt);
  };

  const handleSubmitExam = async () => {
    const timeSpentSeconds = 1200 - secondsLeft;
    const result = await api.submitExam({
      rollNumber,
      studentName,
      workstationId,
      answers,
      timeSpentSeconds,
    });
    setSubmittedResult(result);
    setStarted(false);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="space-y-6">
      {/* Exam Health Monitoring Bar for Nagios Demo */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Activity
            className={`w-5 h-5 ${examGlobalHealthy ? 'text-emerald-700' : 'text-red-700'}`}
          />
          <div>
            <div className="text-sm font-semibold text-slate-900">
              Examination Service Health Endpoint:{' '}
              <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                GET /api/exam/health
              </code>
            </div>
            <div className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
              {healthProbe
                ? `HTTP ${healthProbe.statusCode} · status="${healthProbe.status}"`
                : 'Checking endpoint...'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleProbeHealth}
            disabled={probing}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg whitespace-nowrap"
          >
            {probing ? 'Probing...' : 'Probe Health'}
          </button>
          <button
            type="button"
            onClick={() => api.toggleExamService(!examGlobalHealthy)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap ${
              examGlobalHealthy
                ? 'text-red-700 bg-red-50 border border-red-200 hover:bg-red-100'
                : 'text-white bg-emerald-700 hover:bg-emerald-800'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            {examGlobalHealthy
              ? 'Simulate Service Crash (503)'
              : 'Run Ansible Recovery (Restore 200)'}
          </button>
        </div>
      </div>

      {/* Main Exam Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6">
          {!examGlobalHealthy ? (
            <div className="py-10 text-center space-y-3">
              <AlertTriangle className="w-10 h-10 text-red-600 mx-auto" />
              <h3 className="font-display text-lg font-bold text-slate-900">
                Examination Service Unavailable (HTTP 503)
              </h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                The examination process has stopped responding. Student answers remain safely auto-saved on the server. Click <strong>Run Ansible Recovery</strong> above to restore the service.
              </p>
            </div>
          ) : submittedResult ? (
            <div className="py-6 space-y-4">
              <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-5 h-5" />
                Examination Submitted Successfully
              </div>
              <h3 className="font-display text-xl font-bold text-slate-900">
                {submittedResult.studentName} ({submittedResult.rollNumber})
              </h3>
              <div className="grid grid-cols-3 gap-4 pt-2">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-xs text-slate-500">Final Score</div>
                  <div className="font-mono tabular-nums text-2xl font-bold text-slate-900 mt-1">
                    {submittedResult.score} / {submittedResult.totalQuestions}
                  </div>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-xs text-slate-500">Workstation</div>
                  <div className="font-mono text-base font-bold text-slate-900 mt-1">
                    {submittedResult.workstationId}
                  </div>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="text-xs text-slate-500">Time Taken</div>
                  <div className="font-mono tabular-nums text-base font-bold text-slate-900 mt-1">
                    {formatTime(submittedResult.timeSpentSeconds)}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSubmittedResult(null);
                  setAnswers({});
                  setStarted(false);
                }}
                className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
              >
                Start New Candidate Session
              </button>
            </div>
          ) : !started ? (
            <form onSubmit={handleStartExam} className="max-w-md space-y-4">
              <div>
                <h2 className="font-display text-xl font-bold text-slate-900">{examTitle}</h2>
                <p className="text-xs text-slate-500 mt-1">
                  {questions.length} Multiple Choice Questions · 20 Minutes · Automatic Answer Sync
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Candidate Full Name
                </label>
                <input
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="e.g. Siddharth Rao"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-700"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Roll Number
                  </label>
                  <input
                    required
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    placeholder="22BCS1050"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-blue-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Assigned Workstation
                  </label>
                  <select
                    value={workstationId}
                    onChange={(e) => setWorkstationId(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg bg-white"
                  >
                    {workstations.map((w) => (
                      <option key={w.workstationId} value={w.workstationId}>
                        {w.workstationId}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
              >
                Begin Examination
              </button>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <div className="text-xs text-slate-500">
                    {studentName} · <span className="font-mono">{rollNumber}</span> ·{' '}
                    <span className="font-mono">{workstationId}</span>
                  </div>
                  <h3 className="font-display text-base font-bold text-slate-900 mt-0.5">
                    {examTitle}
                  </h3>
                </div>
                <div className="flex items-center gap-4">
                  {lastSavedAt && (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                      <Save className="w-3.5 h-3.5" />
                      Auto-saved
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 font-mono tabular-nums text-sm font-bold text-slate-900 px-3 py-1 bg-slate-100 rounded-lg">
                    <Clock className="w-4 h-4 text-blue-700" />
                    {formatTime(secondsLeft)}
                  </span>
                </div>
              </div>

              <div className="space-y-6">
                {questions.map((q, idx) => (
                  <div key={q.id} className="pb-5 border-b border-slate-200 last:border-b-0">
                    <div className="text-xs text-slate-500 mb-1">
                      Question {idx + 1} · {q.subject}
                    </div>
                    <p className="text-sm font-medium text-slate-900 mb-3">{q.prompt}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt, optIdx) => {
                        const selected = answers[q.id] === optIdx;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleSelectOption(q.id, optIdx)}
                            className={`p-3 text-left text-xs rounded-lg border transition-colors ${
                              selected
                                ? 'border-blue-700 bg-blue-50 text-blue-900 font-medium'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span className="font-mono mr-2 text-slate-400">
                              {String.fromCharCode(65 + optIdx)}.
                            </span>
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500 tabular-nums">
                  Answered {Object.keys(answers).length} of {questions.length} questions
                </span>
                <button
                  type="button"
                  onClick={handleSubmitExam}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg"
                >
                  <Send className="w-4 h-4" />
                  Submit Final Answers
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Recent Exam Submissions */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="font-display text-base font-semibold text-slate-900">
            Completed Submissions
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">
            Verified results persisted to backend store
          </p>
          <div className="divide-y divide-slate-200">
            {submissions.map((sub) => (
              <div key={sub.submissionId} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-slate-900">{sub.studentName}</div>
                  <div className="text-xs text-slate-500 font-mono">
                    {sub.rollNumber} · {sub.workstationId}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono tabular-nums text-sm font-bold text-slate-900">
                    {sub.score}/{sub.totalQuestions}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                    {formatTime(sub.timeSpentSeconds)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
