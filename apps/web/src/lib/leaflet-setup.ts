/**
 * Leaflet's default-icon fixup. **Import this once from any module that renders
 * a Leaflet marker**, before the marker mounts.
 *
 * Extracted from `location-picker.tsx`, which carried it as a module-scope side
 * effect and was the only Leaflet consumer until the hazard map arrived. Two
 * components each running their own copy of the same `mergeOptions` call is how
 * the two quietly disagree later.
 *
 * Why CDN URLs rather than importing the PNGs: bundler asset URLs break
 * Leaflet's own icon-path lookup, and the failure differs between webpack and
 * Turbopack — importing from `leaflet/dist/images` built fine but produced icons
 * with no resolvable `iconUrl` at runtime under Turbopack (confirmed live:
 * "iconUrl not set in Icon options"). Pointing at the same version's CDN copy
 * sidesteps the bundler entirely, and the OSM tiles are already an external
 * fetch, so this adds no new category of dependency.
 *
 * Note for anyone editing `public/` or a module-scope side effect like this one:
 * restart the `web` container. Turbopack on Windows bind mounts misses both.
 */

import L from "leaflet";

const LEAFLET_VERSION = "1.9.4";
const CDN = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/images`;

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: `${CDN}/marker-icon-2x.png`,
  iconUrl: `${CDN}/marker-icon.png`,
  shadowUrl: `${CDN}/marker-shadow.png`,
});

export { L };
