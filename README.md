# Aegis-Recon Platform v4.0

## 🎯 Objective
To deliver a fully functional, air-gapped network reconnaissance and topology mapping tool for a lightweight Kali Linux VM, designed to maintain strict OPSEC parameters while remaining highly intuitive.

## 🛠️ Features Implemented

### 1. Actionable Pentest Modules
When a network scan successfully maps out the ports of discovered hosts, Aegis-Recon dynamically injects execution buttons for natively installed Kali Linux tools underneath your Pentest Mentor.
- **Dynamic Targeting**: Clicking a rule automatically executes that industry-standard exploitation tool securely in the background.
- **Terminal Consolidation**: An embedded Hacker-Green Modal Console intercepts the raw `STDOUT` and `STDERR` feeds of these local tools so you never have to tab away into a separate terminal.
- **Safe Process Termination**: All active instances of `nikto`, `enum4linux`, and `hydra` are seamlessly hooked up to the **[KILL SCANS]** safety switch logic.
- Supported Defaults: `nikto` (80, 443), `enum4linux` (139, 445), `hydra ssh` (22, 21, 3389).

### 2. Reconnaissance Engine & Packet Monitor
- **Nmap Orchestrator**: Executes stealth `-sS` scans to bypass rudimentary endpoint loggers and graphs it dynamically using **Vis.js** on the frontend.
- **Scapy Wiretap**: Quietly listens to network traffic concurrently alongside active scans without blowing past the 4GB RAM boundary.

### 3. OpenClaw API AI Integration
- Connects directly into your local offline Large Language Model routing via OpenClaw Gateway (Port 18789).
- Hardcoded to request responses styled for a red-team operator ("Junior Pentest Mentor").
- Automatically gracefully degrades into an offline rulesheet via `[Fallback Offline Mode]` if the AI is unreachable.

## 🚀 Deployment Guide (Kali Linux)
When updating your script on Kali Linux after pulling from GitHub, ensure that you always perform a hard reset so unstaged local changes do not block your update flow:
```bash
# Pull Latest Code
git reset --hard origin/main
git pull

# Run Server
sudo $(which python3) backend/main.py
```
*Note: Ensure you are running Python 3 with `sudo` permissions so Scapy can legally attach to your raw network interface adapters to sniff packets!*
