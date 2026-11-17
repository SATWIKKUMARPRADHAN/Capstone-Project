# Optional Terraform Extension: Local Docker-Based Lab Simulation Nodes
# Demonstrates Infrastructure-as-Code (IaC) provisioning without paid cloud dependencies.

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0.2"
    }
  }
}

provider "docker" {}

resource "docker_network" "labguard_net" {
  name = var.lab_network_name
}

resource "docker_image" "workstation_sim" {
  name         = "alpine:3.20"
  keep_locally = true
}

resource "docker_container" "simulated_workstation" {
  count   = var.workstation_count
  name    = format("WS-LAB1-%02d", count.index + 1)
  image   = docker_image.workstation_sim.image_id
  command = ["sleep", "infinity"]

  networks_advanced {
    name = docker_network.labguard_net.name
  }

  labels {
    label = "project"
    value = "labguard-capstone"
  }
}
