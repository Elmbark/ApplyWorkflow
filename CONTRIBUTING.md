# Contributing to apply_workflow

Thanks for your interest in contributing! We welcome issues and pull requests.

## How to contribute

- Discuss major changes first by opening an issue.
- Fork the repo and create a feature branch.
- Keep PRs focused and small where possible.
- Add or update tests where it makes sense.

## Development setup

- Python 3.11+
- Optional: Node 20+ if you work on the frontend outside Docker

Steps:

1. python -m venv .venv && source .venv/bin/activate
2. pip install -r requirements.txt
3. pip install -r requirements-dev.txt  # for testing/linting
4. pre-commit install  # if you use pre-commit

Run:

- API/UI: python run_api.py (then open http://localhost:8000)
- CLI: python main.py --help
- Tests: pytest -q

## Coding standards

- Python: ruff for linting; aim for clear, typed code.
- Keep public APIs stable; document breaking changes in the changelog if applicable.
- Write logs that are helpful for users (pipeline shows logs in the UI).

## Commit messages

- Use descriptive messages. Conventional Commits are welcome but not required.

## Reporting security issues

Please do not open a public issue.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
