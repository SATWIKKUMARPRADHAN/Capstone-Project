# Puppet Module: Baseline Configuration Management for Windows 10/11 Lab Workstations
class lab_workstation {
  # Ensure standard lab directories exist
  file { 'C:/LabGuard':
    ensure => directory,
  }

  file { 'C:/LabGuard/scripts':
    ensure  => directory,
    require => File['C:/LabGuard'],
  }

  # Enforce Windows Time Synchronization for accurate exam logs & timestamps
  service { 'w32time':
    ensure => running,
    enable => true,
  }

  # Ensure NSClient++ / NRPE Monitoring Agent stays running for Nagios checks
  service { 'nscp':
    ensure => running,
    enable => true,
  }

  # Enforce Windows WinRM service for Ansible automated fault recovery
  service { 'WinRM':
    ensure => running,
    enable => true,
  }
}
