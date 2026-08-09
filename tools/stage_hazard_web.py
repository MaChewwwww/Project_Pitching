"""Copy the committed hazard GeoJSON into `apps/web/public/data/`.

Split out of `make hazard` so that staging the web asset does not require
geopandas or the gitignored shapefiles in `dataset/raw/`. `prepare_hazard.py`
is a maintenance step that runs when the *source data* changes — roughly never.
This runs on every fresh clone, every CI web build, and every Docker image
build, because `public/data/*.geojson` is gitignored (one artifact, one home:
`dataset/derived/`, per architecture.md Section 12.5).

Stdlib only, deliberately. The moment this imports anything the web build
cannot install, "works on any clone" stops being true.
"""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
SOURCE = REPO_ROOT / "dataset" / "derived"
DEST = REPO_ROOT / "apps" / "web" / "public" / "data"


def main() -> int:
    files = sorted(SOURCE.glob("*.geojson"))
    if not files:
        # Not an error the caller can fix by retrying, and not fatal to the app
        # either — `HazardMap` degrades on a missing layer rather than blanking.
        # So: explain, and exit 0 so a fresh clone's build is not blocked.
        # ASCII only in these strings: Windows consoles default to cp1252 and
        # mangle an em dash into a literal `?`.
        print(f"no *.geojson in {SOURCE} - nothing to stage.", file=sys.stderr)
        print("The hazard layer will render as unavailable. See dataset/README.md.", file=sys.stderr)
        return 0

    DEST.mkdir(parents=True, exist_ok=True)
    for source_file in files:
        shutil.copy2(source_file, DEST / source_file.name)
        print(f"staged {source_file.name} ({source_file.stat().st_size // 1024} KB)")
    print(f"-> {DEST}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
