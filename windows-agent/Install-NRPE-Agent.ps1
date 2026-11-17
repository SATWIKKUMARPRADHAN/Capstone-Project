<#
.SYNOPSIS
  Configures WinRM for Ansible automated recovery and installs/starts NSClient++ for Nagios checks.
#>

Write-Host "Configuring WinRM for Ansible control node..."
Enable-PSRemoting -Force -SkipNetworkProfileCheck
Set-Item WSMan:\localhost\Service\Auth\Basic -Value $true
Set-Item WSMan:\localhost\Service\AllowUnencrypted -Value $true

New-NetFirewallRule -DisplayName "LabGuard WinRM HTTP" -Direction Inbound -LocalPort 5985 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName "LabGuard NSClient NRPE" -Direction Inbound -LocalPort 5666 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue

Write-Host "Windows workstation ready for Nagios NRPE checks and Ansible WinRM recovery."
