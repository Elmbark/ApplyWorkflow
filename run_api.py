#!/usr/bin/env python3
"""
run_api.py  —  Start the apply_workflow web UI.

Usage:
    python run_api.py
    python run_api.py --port 9000 --no-reload
"""
import argparse
import sys
from pathlib import Path

# Ensure src/ is on the path (same as the CLI does)
ROOT_DIR = Path(__file__).resolve().parent
SRC_DIR  = ROOT_DIR / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))


def main():
    parser = argparse.ArgumentParser(description="apply_workflow web UI")
    parser.add_argument("--host",      default="127.0.0.1", help="Bind host (default: 127.0.0.1)")
    parser.add_argument("--port",      default=8000, type=int, help="Port (default: 8000)")
    parser.add_argument("--no-reload", action="store_true",   help="Disable auto-reload")
    args = parser.parse_args()

    import uvicorn
    uvicorn.run(
        "api.app:app",
        host=args.host,
        port=args.port,
        reload=not args.no_reload,
        reload_dirs=[str(ROOT_DIR / "api"), str(ROOT_DIR / "frontend")],
    )


if __name__ == "__main__":
    main()
