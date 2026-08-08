"""Print the stack's URLs for the profile `make dev` is about to start.

A python script rather than a shell one-liner so it behaves identically under
cmd.exe, PowerShell, and sh (Makefile header comment explains why that matters
here). Reads PROXY_PORT straight out of the profile's env file rather than
hardcoding it, since staging and demo intentionally use different ports
(architecture.md Section 13.1) so both can run at once.
"""

from __future__ import annotations

import sys
from pathlib import Path


def read_proxy_port(env_file: str) -> str:
    path = Path(env_file)
    if not path.exists():
        return "8080"
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line.startswith("PROXY_PORT="):
            return line.split("=", 1)[1].strip() or "8080"
    return "8080"


def main() -> None:
    env_file = sys.argv[1] if len(sys.argv) > 1 else ".env.staging"
    profile = sys.argv[2] if len(sys.argv) > 2 else "staging"
    port = read_proxy_port(env_file)

    print(f"\n  profile  {profile} (project: sagip-{profile})")
    print(f"  web      http://localhost:{port}")
    print(f"  api      http://localhost:{port}/api/v1/health")
    print(f"  docs     http://localhost:{port}/api/docs\n")


if __name__ == "__main__":
    main()
