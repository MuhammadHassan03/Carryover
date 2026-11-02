# Code signing policy

Free code signing provided by [SignPath.io](https://about.signpath.io), certificate by [SignPath Foundation](https://signpath.org).

## What gets signed

Only release builds of Carryover for Windows: the installer (`Carryover_<version>_x64-setup.exe`) and the portable app (`Carryover-<version>-portable.exe`). They are built from this repository by the GitHub Actions workflow [`.github/workflows/release.yml`](../.github/workflows/release.yml) on a GitHub-hosted Windows runner. Nothing built on a personal machine is signed.

Every release is approved by hand before it is signed.

## Team roles

| Role | People |
|---|---|
| Committers and reviewers | [Muhammad Hassan](https://github.com/MuhammadHassan03) |
| Approvers | [Muhammad Hassan](https://github.com/MuhammadHassan03) |

All team members use multi-factor authentication on GitHub and SignPath.

## Privacy

Carryover does not send information to any networked system unless you ask it to.

- The scan reads this PC locally. It lists file names, sizes and dates in your own folders, never their contents.
- To find which apps can be reinstalled, the scan asks Windows' own `winget` tool, which may contact its package sources (the winget community repository and the Microsoft Store).
- "Donate via PCRF" opens the Palestine Children's Relief Fund website in your browser only when you click it.
- The recipe file is saved only where you choose.

## Reporting a problem

Open an issue at https://github.com/MuhammadHassan03/Carryover/issues.
