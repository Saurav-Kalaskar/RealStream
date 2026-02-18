# Oracle Cloud Instance Configuration
**Project:** RealStream
**Date:** 2026-02-18

## 1. Instance Details
- **Name:** `RealStream-instance`
- **Compartment:** `skalaska (root)`
- **Availability Domain:** `AD-1`
- **Image:** `Oracle Linux 9` (Build: 2026.01.29-0)
- **Shape:** `VM.Standard.A1.Flex` (Ampere)
    - **OCPUs:** 4
    - **Memory:** 24 GB
    - **Network Bandwidth:** 4 Gbps

## 2. Networking
- **VCN Name:** `RealStream-vcn`
- **Subnet Name:** `RealStream-subnet`
- **CIDR Block:** `10.0.0.0/24`
- **DNS Record:** Yes
- **Public IPv4 Address:** *Requires "Automatically assign" to be set to YES*

## 3. Storage
- **Boot Volume:** Default (~47 GB)
- **Encryption:** In-transit Enabled

## 4. SSH Keys
- **Key Type:** RSA (ssh-rsa)
- **Status:** Key pair generated and saved locally.

## 5. Management & Agent
- **Monitoring:** Enabled (Custom Logs, Compute Instance Monitoring, Cloud Guard)
- **Vulnerability Scanning:** Disabled
- **Bastion:** Disabled
