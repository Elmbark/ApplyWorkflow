"""
main.py — Job Application Automation Entry Point
"""

import sys
import asyncio
from pathlib import Path

from apply_workflow.main import cli_entrypoint

# Add src/ to the Python search path to resolve the apply_workflow package
SRC_DIR = Path(__file__).resolve().parent / "src"
if SRC_DIR.exists() and str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))


if __name__ == "__main__":
    asyncio.run(cli_entrypoint())
