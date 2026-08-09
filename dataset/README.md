# Dataset

Flood hazard data for Barangay San Jose, Rodriguez (Montalban), Rizal.

Split into two directories with different commit rules — see [`architecture.md`](../docs/architecture.md#12-repository-layout--monorepo) Section 12.5 for the full rationale.

| Directory  | Committed?          | Contents                                                             |
| ---------- | ------------------- | -------------------------------------------------------------------- |
| `raw/`     | **No** — gitignored | Source shapefile as downloaded, unmodified                           |
| `derived/` | **Yes**             | Clipped, dissolved, simplified GeoJSON — what the app actually reads |

## `raw/Rizal_Flood_5year.{shp,shx,dbf,prj,xml}`

- **Source:** BetterGov / UP Project NOAH — Rizal province flood hazard shapefile, 5-year return period (20% annual chance)
- **Original provider:** DOST-DREAM / UP LiDAR-based flood inundation models
- **CRS:** EPSG:4326 (WGS84), confirmed via `.prj`
- **License:** ODC-ODbL
- **Note:** LiPAD's municipality-level download for Rodriguez corrupted repeatedly; this province-level file from BetterGov was used instead (`tech_stack.md` Section 6). Keep all five sidecar files together — a missing one is the most common cause of "corrupted shapefile" errors, not the `.shp` itself.
- Not committed. If this directory is empty on a fresh clone, re-download from BetterGov/NOAH and place the five files here before running `make hazard-derive`. You only need these to _regenerate_ the derived data — `make hazard-web`, the one a fresh clone actually needs, stages the committed output and needs none of it.

## `derived/san_jose_flood_5yr.geojson`

Produced by [`tools/prepare_hazard.py`](../tools/prepare_hazard.py):

```
make hazard-derive
```

Pipeline: load `raw/Rizal_Flood_5year.shp` → reproject to EPSG:4326 if needed → clip to the San Jose bounding extent (Lat 14.708°–14.762° N, Lon 121.108°–121.162° E) → dissolve by hazard level (`Var`: 1 Low, 2 Medium, 3 High) → simplify geometry (~20 m tolerance) → round coordinates to 5 decimals (~1 m precision) → write GeoJSON.

This is the canonical hazard layer — both the PostGIS seed migration and the Leaflet map read from this file (staged into `apps/web/public/data/` by [`make hazard-web`](../tools/stage_hazard_web.py), not edited there). Regenerate only when the source data changes; that half is a maintenance step, not a build step. Staging _is_ effectively a build step, which is why the two are separate targets — see [`tools/README.md`](../tools/README.md).

## 25-year / 100-year return periods

Not yet sourced. Tracked as an open item — see `tech_stack.md` T-OI-7 and `architecture.md` A-OI list.
