variable "lab_network_name" {
  description = "Local Docker bridge network for laboratory nodes"
  type        = string
  default     = "labguard_network"
}

variable "workstation_count" {
  description = "Number of simulated laboratory workstation containers to provision"
  type        = number
  default     = 4
}
