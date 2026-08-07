# `tools`

One-off developer scripts. **Not part of the running system** — nothing here is imported by
`apps/` or `services/`, and nothing here runs in a container.

| Script | Purpose |
|---|---|
| `prepare_hazard.py` | Clip the NOAH province shapefile down to Barangay San Jose. `make hazard` |
| `fetch_boundary.py` | Fetch the San Jose boundary from OpenStreetMap via Overpass |
| `generate_preview_html.py` | Standalone Leaflet preview of the derived GeoJSON, for eyeballing a clip |
| `install_shadcn.py` | Install every shadcn/ui primitive. `make shadcn` |
| `make_help.py` | Renders `make help` — a script so it behaves the same in cmd, PowerShell, and sh |

## Running the geospatial ones

They need GeoPandas, which is heavy and not in any app's dependencies. Use a throwaway
environment:

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r tools/requirements.txt
make hazard
```

## `make hazard` is maintenance, not a build step

`dataset/derived/*.geojson` is **committed** and is the canonical hazard data
(`architecture.md` Section 12.5). Both the PostGIS seed migration and Leaflet read from it, so a
fresh clone gets a working hazard map with no downloads and no GIS tooling.

Re-run `make hazard` only when the *source* data genuinely changes. It writes
`dataset/derived/` and copies the result into `apps/web/public/data/`, which is gitignored so
the same bytes never live in two places in version control.

**Never hand-edit `apps/web/public/data/`.** It is a copy.

## Known gap

`architecture.md` Section 12.3 shows `make hazard` invoking `prepare_hazard.py --period 5
--period 25 --period 100`. The script takes no arguments and handles the 5-year period only,
because 25- and 100-year data has not been sourced yet (`tech_stack.md` T-OI-7). Add the flag
when the other return periods arrive.
