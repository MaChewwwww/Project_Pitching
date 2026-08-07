# Dataset

Flood hazard data for Barangay San Jose, Rodriguez (Montalban), Rizal.

Split into two directories with different commit rules — see [`architecture.md`](../docs/architecture.md#12-repository-layout--monorepo) Section 12.5 for the full rationale.

| Directory | Committed? | Contents |
|---|---|---|
| `raw/` | **No** — gitignored | Source shapefile as downloaded, unmodified |
| `derived/` | **Yes** | Clipped, dissolved, simplified GeoJSON — what the app actually reads |

## `raw/Rizal_Flood_5year.{shp,shx,dbf,prj,xml}`

- **Source:** BetterGov / UP Project NOAH — Rizal province flood hazard shapefile, 5-year return period (20% annual chance)
- **Original provider:** DOST-DREAM / UP LiDAR-based flood inundation models
- **CRS:** EPSG:4326 (WGS84), confirmed via `.prj`
- **License:** ODC-ODbL
- **Note:** LiPAD's municipality-level download for Rodriguez corrupted repeatedly; this province-level file from BetterGov was used instead (`tech_stack.md` Section 6). Keep all five sidecar files together — a missing one is the most common cause of "corrupted shapefile" errors, not the `.shp` itself.
- Not committed. If this directory is empty on a fresh clone, re-download from BetterGov/NOAH and place the five files here before running `make hazard`.

## `derived/san_jose_flood_5yr.geojson`

Produced by [`tools/prepare_hazard.py`](../tools/prepare_hazard.py):

```
python tools/prepare_hazard.py
```

Pipeline: load `raw/Rizal_Flood_5year.shp` → reproject to EPSG:4326 if needed → clip to the San Jose bounding extent (Lat 14.708°–14.762° N, Lon 121.108°–121.162° E) → dissolve by hazard level (`Var`: 1 Low, 2 Medium, 3 High) → simplify geometry (~20 m tolerance) → round coordinates to 5 decimals (~1 m precision) → write GeoJSON.

This is the canonical hazard layer — both the PostGIS seed migration and the Leaflet map read from this file (copied into `apps/web/public/data/` by `make hazard`, not edited there). Regenerate only when the source data changes; this is a maintenance step, not a build step.

## 25-year / 100-year return periods

Not yet sourced. Tracked as an open item — see `tech_stack.md` T-OI-7 and `architecture.md` A-OI list.
