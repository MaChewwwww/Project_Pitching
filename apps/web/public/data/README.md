# `public/data/` — build artifact, not a source

The hazard GeoJSON here is a **copy**. The single source of truth is
`dataset/derived/` (architecture.md Section 12.5).

Never hand-edit these files. Regenerate with:

```
make hazard
```

The `.geojson` files are gitignored so the same bytes never live in two places in
version control; this README is committed so the directory exists on a fresh clone.
