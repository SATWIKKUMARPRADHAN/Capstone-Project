export interface ExamQuestion {
  id: string;
  subject: string;
  prompt: string;
  options: string[];
  correctIndex: number;
}

export const EXAM_QUESTIONS: ExamQuestion[] = [
  {
    id: 'Q1',
    subject: 'Operating Systems',
    prompt: 'Which CPU scheduling algorithm can suffer from indefinite blocking (starvation) unless aging is applied?',
    options: [
      'Round Robin (RR)',
      'First-Come, First-Served (FCFS)',
      'Priority Scheduling',
      'Multilevel Feedback with equal quantum',
    ],
    correctIndex: 2,
  },
  {
    id: 'Q2',
    subject: 'Computer Networks',
    prompt: 'Which TCP mechanism prevents a fast sender from overwhelming a slow receiver buffer?',
    options: [
      'ARP Resolution',
      'Sliding Window Flow Control',
      'ICMP Echo Request',
      'DNS Caching',
    ],
    correctIndex: 1,
  },
  {
    id: 'Q3',
    subject: 'DevOps & Infrastructure',
    prompt: 'In Ansible, what property guarantees that running a recovery playbook multiple times produces the same system state without side effects?',
    options: [
      'Polymorphism',
      'Idempotency',
      'Virtualization',
      'Sharding',
    ],
    correctIndex: 1,
  },
  {
    id: 'Q4',
    subject: 'Database Systems',
    prompt: 'In MongoDB, which command creates an index to speed up time-series queries sorted by workstationId and timestamp?',
    options: [
      'db.metriclogs.createIndex({ workstationId: 1, timestamp: -1 })',
      'db.metriclogs.dropCollection()',
      'db.metriclogs.aggregateCache()',
      'db.metriclogs.lockIndex()',
    ],
    correctIndex: 0,
  },
  {
    id: 'Q5',
    subject: 'Machine Learning',
    prompt: 'How does the Isolation Forest algorithm identify anomalous telemetry points?',
    options: [
      'By fitting linear regression slopes on labeled crashes',
      'Anomalies require fewer random feature splits to isolate in decision trees',
      'By computing k-means centroids over text logs only',
      'By sorting timestamps alphabetically',
    ],
    correctIndex: 1,
  },
  {
    id: 'Q6',
    subject: 'Operating Systems',
    prompt: 'What condition occurs when a system spends more time paging memory between RAM and disk than executing instructions?',
    options: [
      'Deadlock avoidance',
      'Thrashing',
      'Spooling',
      'Context switching',
    ],
    correctIndex: 1,
  },
  {
    id: 'Q7',
    subject: 'Infrastructure Monitoring',
    prompt: 'In Nagios Core, which check state triggers an automated event handler after all retry attempts fail?',
    options: [
      'SOFT WARNING',
      'PENDING',
      'HARD CRITICAL',
      'FLAPPING OK',
    ],
    correctIndex: 2,
  },
  {
    id: 'Q8',
    subject: 'Configuration Management',
    prompt: 'How does Puppet primarily enforce consistent software and service configuration across laboratory workstations?',
    options: [
      'Declarative manifests evaluated periodically by the Puppet agent',
      'Manual SSH copy-paste by lab assistants',
      'Browser cookies stored in local storage',
      'BIOS firmware flashing on every reboot',
    ],
    correctIndex: 0,
  },
];
