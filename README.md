<p align="center">
  <img src="frontend/public/logo.svg" alt="ApplyWorkflow Logo" width="180" />
</p>

<p align="center">
  <a href="https://lbesson.mit-license.org/">
    <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="MIT License" />
  </a>
  <a href="https://www.python.org/">
    <img src="https://img.shields.io/badge/Made%20with-Python-1f425f.svg" alt="Made with Python" />
  </a>
  <a href="https://npmjs.com/package/express">
    <img src="https://badgen.net/npm/v/express" alt="NPM Version" />
  </a>
  <a href="https://github.com/ellerbrock/open-source-badges/">
    <img src="https://badges.frapsoft.com/os/v1/open-source.svg?v=103" alt="Open Source Love" />
  </a>
</p>

# ApplyWorkflow

Open-source pipeline to automate job applications: tailor CVs and emails with an LLM, compile PDFs with Typst, and optionally send via Gmail  from CLI or web UI.

## Features

- LLM-tailored CV keywords and emails (Groq or OpenAI)
- Typst CV → PDF per application
- Optional Gmail sending (safe dry-run by default)
- FastAPI backend + React web UI
- Docker image includes Typst for zero local setup

## Quick start

```bash
docker-compose up --build
```

Then open http://localhost:8000 and use **Settings** to add your API key, profile,
and optional Google OAuth credentials. API documentation is available at
http://localhost:8000/docs.

Docker persists all user files under `./data/`.

## Usage

CLI:
- Dry run: python main.py
- Compile PDFs: python main.py --compile-pdf
- Send emails: python main.py --send --compile-pdf

Web UI:
- Open http://localhost:8000 and run from the browser.

## Config & required files

Docker configuration is managed from the web UI and stored in `data/settings.json`.
The app creates `data/applications.xlsx` automatically. Profile, OAuth credentials,
tokens, and generated output also stay in `data/`; this directory is git-ignored.

For local CLI use, copy `.env.example` to `.env` and `profile.json.example` to
`profile.json`. Gmail credentials remain optional.

## Contributing

Contributions welcome! See CONTRIBUTING.md. Please open issues and PRs.

## License

MIT — see LICENSE.
