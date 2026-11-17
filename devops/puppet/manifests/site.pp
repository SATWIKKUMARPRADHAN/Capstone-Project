# Puppet Site Manifest for Computer Laboratory Workstations
node /^ws-lab1-\d+\.lab\.local$/ {
  include lab_workstation
  include exam_kiosk
}

node default {
  include lab_workstation
}
