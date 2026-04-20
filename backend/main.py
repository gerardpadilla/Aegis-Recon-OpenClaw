from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from backend.api.routes import router
import os

app = FastAPI(title="Aegis-Recon Platform v4.0")

# Mount Static Files
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), '..', 'frontend')
STATIC_DIR = os.path.join(FRONTEND_DIR, 'static')

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Mount API Router
app.include_router(router, prefix="/api/v1")

@app.get("/")
def read_index():
    return FileResponse(os.path.join(FRONTEND_DIR, 'index.html'))

if __name__ == "__main__":
    import uvicorn
    # Typically running on 0.0.0.0 for external access if needed, but 127.0.0.1 locally is fine.
    # Defaulting to 8000
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
