# Puppet Module: Examination Kiosk Policy & Service State
class exam_kiosk {
  # Keep the LabGuard Exam Client service enabled and running
  service { 'LabGuardExamService':
    ensure => running,
    enable => true,
  }

  # Enforce kiosk configuration file checksum to prevent unauthorized tampering
  file { 'C:/LabGuard/exam-kiosk.json':
    ensure  => file,
    content => "{\n  \"examServer\": \"http://192.168.10.10:3000\",\n  \"kioskLock\": true,\n  \"autoSaveIntervalSec\": 10\n}\n",
  }

  # Ensure telemetry collector scheduled task script is deployed
  file { 'C:/LabGuard/scripts/Collect-LabMetrics.ps1':
    ensure => file,
    source => 'puppet:///modules/exam_kiosk/Collect-LabMetrics.ps1',
  }
}
