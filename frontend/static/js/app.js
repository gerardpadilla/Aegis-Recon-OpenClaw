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
