"""Print the self-documenting `make help` listing.

A python script rather than a shell one-liner so `make help` behaves identically
under cmd.exe, PowerShell, and sh. Reads the `## comment` on each target line.
"""

from __future__ import annotations

import re
from pathlib import Path

MAKEFILE = Path(__file__).resolve().parent.parent / "Makefile"
TARGET = re.compile(r"^([a-zA-Z0-9_-]+):.*?##\s*(.+)$")


def main() -> None:
    rows = []
    for line in MAKEFILE.read_text(encoding="utf-8").splitlines():
        match = TARGET.match(line)
        if match:
            rows.append((match.group(1), match.group(2).strip()))

    if not rows:
        print("No documented targets found in Makefile.")
        return

    width = max(len(name) for name, _ in rows)
    print("\nUsage: make <target>\n")
    for name, description in rows:
        print(f"  {name.ljust(width)}  {description}")
    print()


if __name__ == "__main__":
    main()
