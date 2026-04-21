document.addEventListener('DOMContentLoaded', () => {
    
    // Initialize Vis.js
    initTopology('vis-network-container');

    // UI Elements
    const btnStart = document.getElementById('btn-start-recon');
    const btnKill = document.getElementById('btn-kill-switch');
    const targetInput = document.getElementById('target-ip');
    const statusMsg = document.getElementById('recon-status');
    const aiOutput = document.getElementById('ai-output');
    
    // Stat Elements
    const cpuVal = document.getElementById('cpu-val');
    const ramVal = document.getElementById('ram-val');
    const ramMb = document.getElementById('ram-mb');

    // Polling System Stats
    async function fetchSysStats() {
        try {
            const res = await fetch('/api/v1/system/stats');
            if (res.ok) {
                const data = await res.json();
                cpuVal.innerText = `${data.cpu_percent.toFixed(1)}%`;
                ramVal.innerText = `${data.ram_percent.toFixed(1)}%`;
                ramMb.innerText = `(${data.ram_used_mb.toFixed(0)} / ${data.ram_total_mb.toFixed(0)} MB)`;
                
                // Alert if RAM limits approached (Kali has 4GB)
                if (data.ram_percent > 85) {
                    ramVal.style.color = '#f43f5e';
                } else {
                    ramVal.style.color = '';
                }
            }
        } catch (e) {
            console.error("Failed to fetch sys stats", e);
        }
    }
    
    setInterval(fetchSysStats, 3000);
    fetchSysStats(); // initial fetch

    // Modal Elements
    const terminalModal = document.getElementById('terminal-modal');
    const closeTerminal = document.getElementById('close-terminal');
    const terminalOutput = document.getElementById('terminal-output');
    const terminalTitle = document.getElementById('terminal-title');
    const actionGrid = document.getElementById('action-buttons-grid');
    const actionContainer = document.getElementById('action-modules-container');

    closeTerminal.addEventListener('click', () => {
        terminalModal.style.display = 'none';
    });

    // Run Tool Logic
    window.runActionTool = async function(toolName, target, btnElement) {
        // UI lock
        btnElement.classList.add('running');
        btnElement.disabled = true;
        const ogText = btnElement.innerText;
        btnElement.innerHTML = `Running ${toolName}...`;
        
        // Open Modal
        terminalModal.style.display = 'flex';
        terminalTitle.innerText = `Aegis Console // ${toolName} -> ${target}`;
        terminalOutput.innerHTML = `<p>Executing ${toolName} against ${target}...\n(Please standby, this may take several minutes)...</p>`;

        try {
            const res = await fetch('/api/v1/tools/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tool_name: toolName, target: target })
            });

            const data = await res.json();
            if (res.ok) {
                // Escape HTML tags to prevent XSS from unescaped terminal output
                let safeOutput = data.output.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                terminalOutput.innerHTML = safeOutput;
            } else {
                terminalOutput.innerHTML = `<p style="color:red;">Server error: ${data.detail || 'Unknown error'}</p>`;
            }
        } catch (e) {
            terminalOutput.innerHTML = `<p style="color:red;">Network or Timeout Error communicating with backend.</p>`;
        } finally {
            btnElement.classList.remove('running');
            btnElement.disabled = false;
            btnElement.innerText = ogText;
        }
    };

    function generateActionButtons(scanData) {
        actionGrid.innerHTML = ''; // Clear previous
        let foundTargets = 0;

        // Ensure we handle potentially broken responses securely
        if (!scanData || !scanData.nodes) return; 

        // We need to map edges to find which host has which port
        // Host nodes have id e.g., 'host_1'
        // Port nodes have id e.g., 'port_1_80' and an edge from 'host_1'
        let hostsMap = {}; // host_id -> ip
        scanData.nodes.forEach(n => {
            if (n.group === 'host') hostsMap[n.id] = n.label;
        });

        scanData.nodes.forEach(n => {
            if (n.group === 'port') {
                // Determine which host this belongs to
                let connectedEdge = scanData.edges.find(e => e.to === n.id);
                if (connectedEdge && hostsMap[connectedEdge.from]) {
                    const targetIp = hostsMap[connectedEdge.from];
                    
                    // The label is typically "80\nhttp" or "<b>80</b>\nhttp"
                    // So we split by newline, drop to first element, and strip everything except numbers
                    const firstLine = n.label.split('\n')[0];
                    const portStr = firstLine.replace(/[^0-9]/g, '');
                    
                    if (portStr) {
                        // Rule generation
                        if (portStr === '80' || portStr === '443') {
                            actionGrid.innerHTML += `<button class="btn-action" onclick="runActionTool('nikto', '${targetIp}', this)">Run Nikto (${portStr}) on ${targetIp}</button>`;
                            foundTargets++;
                        }
                        if (portStr === '445' || portStr === '139') {
                            actionGrid.innerHTML += `<button class="btn-action" onclick="runActionTool('enum4linux', '${targetIp}', this)">Run Enum4Linux on ${targetIp}</button>`;
                            foundTargets++;
                        }
                        if (portStr === '22' || portStr === '3389' || portStr === '21') {
                            actionGrid.innerHTML += `<button class="btn-action" onclick="runActionTool('hydra', '${targetIp}', this)">Run Hydra on ${targetIp}</button>`;
                            foundTargets++;
                        }
                    }
                }
            }
        });

        if (foundTargets > 0) {
            actionContainer.style.display = 'block';
        } else {
            actionContainer.style.display = 'none';
        }
    }

    // Start Recon Process
    btnStart.addEventListener('click', async () => {
        const target = targetInput.value.trim();
        if (!target) return;

        // UI Update
        btnStart.disabled = true;
        btnStart.innerHTML = `<span class="icon">🔄</span> Scanning...`;
        statusMsg.innerText = "Initiating active scan & scapy packet monitor (Please wait up to 2m)...";
        statusMsg.className = "status-msg scanning";
        aiOutput.innerHTML = `<p class="placeholder-text">Analyzing ${target}... querying OpenClaw Gateway.</p>`;
        actionContainer.style.display = 'none'; // reset buttons
        
        try {
            const res = await fetch('/api/v1/recon/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target })
            });
            
            const data = await res.json();
            
            if (res.ok) {
                // Formatting markdown slightly
                let formattedAi = data.ai_analysis
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                    .replace(/\n/g, '<br>');
                    
                statusMsg.innerText = `Scan Complete. Captured ${data.packets_captured} packets.`;
                statusMsg.className = "status-msg success";
                aiOutput.innerHTML = `<strong>AI Advisor:</strong><br><br>${formattedAi}`;
                
                // Update graph
                if (data.scan_data) {
                    updateTopology(data.scan_data);
                    generateActionButtons(data.scan_data);
                }
            } else {
                throw new Error("Server returned error.");
            }
            
        } catch (e) {
            statusMsg.innerText = "Scan failed or timed out.";
            statusMsg.className = "status-msg";
            aiOutput.innerHTML = `<p style="color:var(--danger)">Error communicating with backend.</p>`;
        } finally {
            btnStart.disabled = false;
            btnStart.innerHTML = `<span class="icon">⚡</span> Start Recon`;
        }
    });

    // Kill Switch
    btnKill.addEventListener('click', async () => {
        try {
            const res = await fetch('/api/v1/system/kill', { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                alert(`Kill Switch Activated. Killed ${data.killed_processes.length} processes.`);
            }
        } catch (e) {
            alert("Failed to activate kill switch.");
        }
    });
});
