/**
 * Brand constants.
 *
 * The app name is still an open item (BRD OI-1, design.md D-OI-1). Defining it
 * once here means the rename is a one-line change rather than a search across
 * every page, email, and metadata tag. Never hardcode the name anywhere else.
 */

export const APP_NAME = "SAGIP-SJ";
export const APP_TAGLINE =
  "System for Alert, Guidance, Incident Reporting, and Preparedness for Barangay San Jose";
export const BARANGAY = "Barangay San Jose, Rodriguez, Rizal";

/** Barangay San Jose centroid — the clip extent in dataset/README.md. */
export const BARANGAY_CENTER = { lat: 14.735, lon: 121.135 } as const;

/**
 * Mandatory attribution. ODC-ODbL requires crediting Project NOAH, and any
 * derivative we distribute inherits the licence (NFR-LGL-001). This belongs in
 * the map footer and the About section — it is a licence term, not a courtesy.
 */
export const ATTRIBUTION = {
  hazard: "Flood hazard data © Project NOAH / UP DREAM–Phil-LiDAR (DOST), ODC-ODbL",
  basemap: "© OpenStreetMap contributors",
  weather: "Weather data by Open-Meteo",
  river: "River level from DOST-PAGASA",
} as const;
