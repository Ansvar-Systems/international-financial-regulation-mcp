# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Email:** security@ansvar.eu
2. **Subject:** `[VULN] international-financial-regulation-mcp: <brief description>`
3. **Include:** Steps to reproduce, impact assessment, suggested fix (if any)

**Do NOT open a public GitHub issue for security vulnerabilities.**

We will acknowledge receipt within 48 hours and provide a detailed response within 5 business days.

## Security Scanning

This repository uses automated security scanning:

- **CodeQL** — Static analysis (weekly + PR)
- **Semgrep** — Pattern-based vulnerability detection (PR)
- **Trivy** — Dependency vulnerability scanning (weekly)
- **Gitleaks** — Secret detection (PR)
- **OSSF Scorecard** — Supply chain security metrics (weekly)
- **Dependabot** — Automated dependency updates (weekly)
