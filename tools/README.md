# `tools`

One-off developer scripts. **Not part of the running system** — nothing here is imported by
`apps/` or `services/`, and nothing here runs in a container.

| Script                     | Purpose                                                                          |
| -------------------------- | -------------------------------------------------------------------------------- |
| `prepare_hazard.py`        | Clip the NOAH province shapefile down to Barangay San Jose. `make hazard-derive` |
| `stage_hazard_web.py`      | Copy `dataset/derived/*.geojson` into `apps/web/public/data/`. `make hazard-web` |
| `fetch_boundary.py`        | Fetch the San Jose boundary from OpenStreetMap via Overpass                      |
| `generate_preview_html.py` | Standalone Leaflet preview of the derived GeoJSON, for eyeballing a clip         |
| `install_shadcn.py`        | Install every shadcn/ui primitive. `make shadcn`                                 |
| `make_help.py`             | Renders `make help` — a script so it behaves the same in cmd, PowerShell, and sh |

## The two halves of `make hazard`, and why they are separate

`make hazard` still runs both. But they have opposite audiences and opposite frequencies, and
conflating them made the cheap half impossible to run:

| Target          | Needs                                                | Run it                                                   |
| --------------- | ---------------------------------------------------- | -------------------------------------------------------- |
| `hazard-derive` | GeoPandas + the gitignored `dataset/raw/` shapefiles | Only when the _source data_ changes — roughly never      |
| `hazard-web`    | Python stdlib. Nothing else                          | Every fresh clone, every CI web build, every image build |

`hazard-web` is on the second row because `apps/web/public/data/*.geojson` is gitignored (one
artifact, one home — `architecture.md` Section 12.5), so a fresh checkout genuinely has no
hazard layer until it runs. Before the split, staging that copy required GeoPandas _and_ a
shapefile download nobody had, which meant CI could not do it at all.

Keep `stage_hazard_web.py` on the stdlib. The moment it imports something the web build cannot
install, "works on any clone" stops being true.

### Running the geospatial half

GeoPandas is heavy and not in any app's dependencies. Use a throwaway environment:

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r tools/requirements.txt
make hazard-derive
```

`dataset/derived/*.geojson` is **committed** and is the canonical hazard data
(`architecture.md` Section 12.5). Both the PostGIS seed migration and Leaflet read from it, so a
fresh clone gets a working hazard map with no downloads and no GIS tooling.

**Never hand-edit `apps/web/public/data/`.** It is a copy.

A missing hazard layer is a _degraded_ layer, not a crash — `useHazardGeoJson` in
`apps/web/src/lib/hazard-geojson.ts` renders the map without it and says so. `stage_hazard_web.py`
exits 0 with an explanation when `dataset/derived/` is empty, for the same reason.

## Known gap

`architecture.md` Section 12.3 shows `make hazard-derive` invoking `prepare_hazard.py --period 5
--period 25 --period 100`. The script takes no arguments and handles the 5-year period only,
because 25- and 100-year data has not been sourced yet (`tech_stack.md` T-OI-7). Add the flag
when the other return periods arrive.
