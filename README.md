# apply_workflow

Automated job application pipeline. Reads applicant and company data from an Excel sheet, tailors a CV and cover email for each entry using an LLM, compiles the CV to PDF with Typst, and sends everything through the Gmail API — from the CLI or a web UI.

Badges: MIT • Python 3.11+ • FastAPI • React • Typst

## Quick start

- Docker (no Typst install required):
  - docker compose up --build
  - Open http://localhost:8000 (FastAPI also exposes docs at /docs)
- Local (requires Typst installed):
  - python -m venv .venv && source .venv/bin/activate
  - pip install -r requirements.txt
  - cp .env.example .env && cp profile.json.example profile.json
  - python run_api.py

## Requirements to run

Choose either Docker or local setup.

- Docker
  - Docker Desktop (macOS/Windows) or Docker Engine with docker compose plugin (Linux)
  - Files in project root (create from examples):
    - .env (copy from .env.example and add your API key: GROQ_API_KEY or OPENAI_API_KEY)
    - profile.json (copy from profile.json.example and fill your details)
    - applications.xlsx (copy from applications.example.xlsx and replace with your data)
    - credentials.json (Google OAuth client for Gmail API)
    - token.json is created automatically on first Gmail auth when you enable sending

- Local (no Docker)
  - Python 3.11+
  - Typst installed and available on PATH, or set TYPST_BINARY_PATH in .env
  - Node.js 20+ only if you plan to build the frontend outside Docker
  - Same files as above: .env, profile.json, applications.xlsx, credentials.json

Security note: .env, credentials.json, token.json, profile.json, and applications.xlsx are git-ignored and should not be committed.

## Why

Applying to dozens of jobs by hand means rewriting the same CV keywords and email over and over. Keep one spreadsheet of applications, one base CV template, and one profile file; the pipeline generates and (optionally) sends tailored applications in bulk.

## Features

- Reads applications from an Excel tracker (company, role, contact, etc.)
- Uses an LLM (Groq or OpenAI) to tailor CV keywords and draft a personalized email per entry
- Compiles a Typst CV template into a PDF for each application
- Sends the email with the tailored CV attached via the Gmail API
- Dry-run by default — nothing is sent until you explicitly opt in
- Optional filtering by company name or row limit
- FastAPI backend + React web UI as an alternative to the CLI
- Dockerized for a one-command setup (Typst included in the image)

## Project structure

```
apply_workflow/
├── api/                     # FastAPI backend (web UI server)
├── frontend/                # React + Vite web UI
├── src/apply_workflow/      # Core pipeline package (core, services, utils, schemas)
├── templates/
│   ├── cv_template.typ      # Base Typst CV template
│   ├── email_body.html      # Email layout
│   └── prompts/             # LLM prompt templates
├── main.py                  # CLI entrypoint
├── run_api.py               # Web UI entrypoint
├── Dockerfile
└── docker-compose.yml
```

## Prerequisites

- Python 3.11+
- Node.js 20+ (only needed if you build the frontend outside Docker)
- Typst binary for PDF compilation (already installed in Docker image)
- A Google Cloud OAuth client (for Gmail sending)
- An API key from Groq or OpenAI

## Configuration (env)

Copy and edit .env:

- LLM_PROVIDER: groq | openai (default: groq)
- GROQ_API_KEY / OPENAI_API_KEY: provider API keys
- GROQ_MODEL: default openai/gpt-oss-120b
- OPENAI_MODEL: default gpt-4o-mini
- LLM_TEMPERATURE: float, default 0.3
- EXCEL_FILE: path to your .xlsx (default: applications.xlsx)
- CV_TEMPLATE_FILE: Typst template path (default: templates/cv_template.typ)
- OUTPUT_DIR: pipeline output dir (default: output)
- TYPST_BINARY_PATH: typst or absolute path (Docker image includes typst)
- GMAIL_CREDENTIALS_FILE: credentials.json
- GMAIL_TOKEN_FILE: token.json

Typst path (non-Docker):
- Install Typst locally and either:
  - ensure the typst binary is on your PATH, or
  - set TYPST_BINARY_PATH to its absolute path.

Examples:
- Linux/macOS: TYPST_BINARY_PATH=/usr/local/bin/typst
- Custom: TYPST_BINARY_PATH=/home/you/bin/typst

Example .env:

```env
LLM_PROVIDER=groq
GROQ_API_KEY=your-groq-key

EXCEL_FILE=applications.xlsx
CV_TEMPLATE_FILE=templates/cv_template.typ
# If typst is in PATH, this can just be "typst"; otherwise use the full path
TYPST_BINARY_PATH=typst
```

### 3. Set up your profile or from front-end

Copy the example and fill in your details (used in templates as {{ name }}, {{ email }}, etc.):

```bash
cp profile.json.example profile.json
```

```json
{
  "name": "Your Name",
  "phone": "+000 00 000 000",
  "email": "you@example.com",
  "github": "yourusername",
  "linkedin": "yourusername",
  "personal_site": "yoursite.io",
  "location": "City, Country"
}
```

## Gmail setup

1. Create an OAuth client in the Google Cloud Console (Desktop app) and download the credentials JSON.
2. Save it as credentials.json in the project root.
3. The first time you run with --send, a browser window opens for authentication and token.json is created.

To revoke: delete token.json and revoke the app in your Google Account Security settings.

## Excel schema

- Required columns:
  - company
  - post
- Optional columns:
  - description
  - keywords
  - email (maps to to_email)
- Notes:
  - Headers are case/space-insensitive; unrecognized headers are ignored.
  - Empty company rows are skipped.

You can start from applications.example.xlsx in the repo.

## Usage

### CLI

```bash
# Dry run — tailor CVs and draft emails, save previews to output/, send nothing
python main.py

# Process only the first 3 rows
python main.py --limit 3

# Process rows for a specific company
python main.py --company "Google"

# Compile the tailored CV to PDF
python main.py --compile-pdf

# Compile PDFs and actually send the emails
python main.py --send --compile-pdf
```

Flags:
- --send: Authenticate with Gmail and send drafted emails
- --compile-pdf: Compile the tailored .typ CV into a PDF
- --limit N: Process only the first N rows
- --company NAME: Filter rows by company name

### Web UI

```bash
python run_api.py
# or with custom host/port
python run_api.py --host 0.0.0.0 --port 9000
```

Open http://localhost:8000 → manage applications, trigger runs, and review generated CVs/emails in the browser. FastAPI docs are at http://localhost:8000/docs.

### Docker

```bash
docker compose build
docker compose up
```

The compose file mounts output/, applications.xlsx, profile.json, credentials.json, token.json, and .env from the host so you can edit them without rebuilding. The web UI is available at http://localhost:8000.

## Templates

- Default template: templates/cv_template.typ
- Alternate template: templates/clickworthy_resume.typ (starter)
  - To use the official Clickworthy package, ensure Typst can fetch preview packages and uncomment the import line in that file:
    - #import "@preview/clickworthy-resume:1.0.1": resume
  - Then select it from the UI (gear → CV Template → dropdown) or set in .env:
    - CV_TEMPLATE_FILE=templates/clickworthy_resume.typ

## Troubleshooting

- Typst not found: install Typst or use Docker (Docker image includes Typst).
- OAuth issues: ensure credentials.json is for a Desktop OAuth client; delete token.json to re-auth.
- Missing files: set EXCEL_FILE and CV_TEMPLATE_FILE correctly or place them in the project root.
- Rate limits/costs: providers may throttle; reduce --limit or use a smaller model.
- PDF preview blank: open the PDF directly from output/; ensure the browser serves it inline.

## Tech stack

- Backend: Python, FastAPI, Typst
- Frontend: React, Vite
- LLM providers: Groq, OpenAI
- Email: Gmail API

## Contributing

Issues and pull requests are welcome. Please read CONTRIBUTING.md and CODE_OF_CONDUCT.md.

## Testing

- pip install -r requirements-dev.txt
- pytest -q

## Security & privacy

- Do not commit .env, credentials.json, token.json, profile.json (already in .gitignore).
- All data and tokens stay on your machine. No telemetry.

## License

See [LICENSE](LICENSE) for details.
