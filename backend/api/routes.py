from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any

from backend.core import system, packet_monitor, scanner, ai_advisor

router = APIRouter()

class ScanRequest(BaseModel):
    target: str

@router.get("/system/stats")
def get_stats():
    return system.get_system_stats()

@router.post("/system/kill")
def kill_scans():
    return system.kill_python_scans()

@router.post("/recon/start")
async def start_recon(req: ScanRequest):
    """
    Triggers Nmap and Scapy as a single workflow, then analyzes results.
    """
    # 1. Start Scapy capture
    packet_monitor.start_capture()
    
    try:
        # 2. Run Nmap (blocking, but wait to finish)
        scan_results = scanner.run_nmap_scan(target=req.target)
    finally:
        # 3. Stop capture immediately once scan is processed
        packet_monitor.stop_capture()
        
    # 4. Gather packets
    packets = packet_monitor.get_capture_results()
    
    # 5. Send to AI
    ai_advice = await ai_advisor.analyze_scan_results(scan_results, packets)
    
    return {
        "status": "success",
        "scan_data": scan_results,
        "packets_captured": len(packets),
        "ai_analysis": ai_advice
    }

@router.get("/recon/packets")
def get_latest_packets():
    return {"packets": packet_monitor.get_capture_results()}
