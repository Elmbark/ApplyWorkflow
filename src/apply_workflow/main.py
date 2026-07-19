import argparse
import logging
import sys
from apply_workflow.core.pipeline import run_pipeline

logger = logging.getLogger(__name__)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Job Application Automation")
    p.add_argument("--send",        action="store_true", help="Send emails via Gmail")
    p.add_argument("--compile-pdf", action="store_true", help="Compile Typst → PDF")
    p.add_argument("--limit",       type=int, default=0,  help="Process only first N rows")
    p.add_argument("--company",     type=str, default="", help="Filter by company name")
    return p.parse_args()


async def cli_entrypoint() -> None:
    # Set up logging dynamically at CLI entrypoint
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
        handlers=[
            logging.FileHandler("job_applier.log"),
            logging.StreamHandler(sys.stdout),
        ],
    )
    args = parse_args()
    await run_pipeline(
        send=args.send,
        compile_pdf=args.compile_pdf,
        limit=args.limit,
        company_filter=args.company,
    )
