"""Install every shadcn/ui primitive listed in docs/design.md Section 7.1.

The list lives here so `make shadcn` is reproducible and a new primitive is added
in exactly one place. Re-running is safe — existing files are overwritten with the
upstream version, which is what we want: NFR-MNT-006 says primitives are not edited
except for token wiring, and token wiring lives in globals.css, not in the
components.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

WEB = Path(__file__).resolve().parent.parent / "apps" / "web"

# docs/design.md Section 7.1 — keep in sync with that list.
COMPONENTS = [
    "accordion",
    "alert",
    "alert-dialog",
    "avatar",
    "badge",
    "breadcrumb",
    "button",
    "calendar",
    "card",
    "chart",
    "checkbox",
    "collapsible",
    "command",
    "dialog",
    "dropdown-menu",
    # design.md Section 7.1 lists `form`. In the current shadcn registry `form` is an
    # empty stub — it was superseded by `field`, which composes with React Hook Form
    # and Zod directly (FieldError takes RHF's error objects). Installing `form`
    # silently does nothing, so `field` is what we actually want.
    "field",
    "hover-card",
    "input",
    "label",
    "navigation-menu",
    "pagination",
    "popover",
    "progress",
    "radio-group",
    "scroll-area",
    "select",
    "separator",
    "sheet",
    "sidebar",
    "skeleton",
    "slider",
    "sonner",
    "switch",
    "table",
    "tabs",
    "textarea",
    "toggle",
    "tooltip",
]


def main() -> None:
    if not WEB.exists():
        sys.exit(f"apps/web not found at {WEB} — scaffold the web app first.")

    npx = shutil.which("npx") or shutil.which("npx.cmd")
    if npx is None:
        sys.exit("npx not found on PATH. Install Node.js 20+ and retry.")

    cmd = [npx, "shadcn@latest", "add", *COMPONENTS, "--yes", "--overwrite"]
    print(f"Installing {len(COMPONENTS)} shadcn primitives into apps/web ...")
    result = subprocess.run(cmd, cwd=WEB)
    sys.exit(result.returncode)


if __name__ == "__main__":
    main()
