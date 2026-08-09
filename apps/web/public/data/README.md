# `public/data/` — build artifact, not a source

The hazard GeoJSON here is a **copy**. The single source of truth is
`dataset/derived/` (architecture.md Section 12.5).

Never hand-edit these files. Stage them with:

```
make hazard-web
```

That needs nothing but Python's stdlib, so it works on any clone. `make hazard-derive`
is the other half — it regenerates `dataset/derived/` from the raw shapefiles and needs
GeoPandas. You almost certainly want `hazard-web`. See `tools/README.md`.

The `.geojson` files are gitignored so the same bytes never live in two places in
version control; this README is committed so the directory exists on a fresh clone.

**A fresh clone has no `.geojson` here until you run the command above.** That is
expected and non-fatal: the map degrades to basemap + areas + facilities and labels the
flood layer unavailable, rather than blanking (`src/lib/hazard-geojson.ts`).
