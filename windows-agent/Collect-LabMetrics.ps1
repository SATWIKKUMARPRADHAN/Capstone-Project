<#
.SYNOPSIS
  Collects live Windows 10/11 workstation CPU, RAM, Disk, and Exam App health
  metrics and posts them to the LabGuard Node.js Backend every 15 seconds.
#>

param(
    [string]$WorkstationId = $env:COMPUTERNAME,
    [string]$ServerUrl = "http://192.168.10.10:3000/api/telemetry",
    [string]$ExamHealthUrl = "http://localhost:3000/api/exam/health"
)

while ($true) {
    try {
        $cpu = [math]::Round((Get-Counter '\Processor(_Total)\% Processor Time').CounterSamples[0].CookedValue, 1)

        $os = Get-CimInstance Win32_OperatingSystem
        $memUsed = [math]::Round((($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) / $os.TotalVisibleMemorySize) * 100, 1)

        $disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
        $diskUsed = [math]::Round((($disk.Size - $disk.FreeSpace) / $disk.Size) * 100, 1)

        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        $examHealthy = $false
        try {
            $resp = Invoke-RestMethod -Uri $ExamHealthUrl -TimeoutSec 3
            $examHealthy = ($resp.status -eq "healthy")
        } catch {
            $examHealthy = $false
        }
        $sw.Stop()

        $payload = @{
            workstationId = $WorkstationId
            cpuPercent    = $cpu
            memoryPercent = $memUsed
            diskPercent   = $diskUsed
            examServiceUp = $examHealthy
            examLatencyMs = [int]$sw.ElapsedMilliseconds
        } | ConvertTo-Json

        Invoke-RestMethod -Uri $ServerUrl -Method Post -Body $payload -ContentType "application/json" -TimeoutSec 5 | Out-Null
        Write-Host "[$((Get-Date).ToString('HH:mm:ss'))] Telemetry sent for $WorkstationId (CPU: $cpu%, RAM: $memUsed%, Disk: $diskUsed%)"
    }
    catch {
        Write-Warning "Failed to push telemetry: $_"
    }

    Start-Sleep -Seconds 15
}
