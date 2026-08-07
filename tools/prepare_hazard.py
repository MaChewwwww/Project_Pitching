import geopandas as gpd
import json
import os
from shapely.geometry import shape, mapping, Polygon

def round_coords(geom, precision=5):
    """Recursively round geometry coordinates to specified decimal places."""
    geojson = mapping(geom)
    
    def _round(coords):
        if isinstance(coords[0], (int, float)):
            return [round(c, precision) for c in coords]
        return [_round(c) for c in coords]
    
    geojson['coordinates'] = _round(geojson['coordinates'])
    return shape(geojson)

def process_noah_data():
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    shp_path = os.path.join(repo_root, "dataset", "raw", "Rizal_Flood_5year.shp")
    out_dir = os.path.join(repo_root, "dataset", "derived")
    out_geojson = os.path.join(out_dir, "san_jose_flood_5yr.geojson")
    os.makedirs(out_dir, exist_ok=True)
    if os.path.exists(out_geojson):
        try:
            os.remove(out_geojson)  # GeoJSON driver refuses to overwrite in place
        except PermissionError:
            # File is open elsewhere (editor, synced folder, etc). Close whatever has it
            # open — GeoPandas/Fiona cannot write over a locked file.
            raise SystemExit(
                f"Cannot overwrite {out_geojson} — it appears to be open in another "
                "program (editor, preview, synced folder). Close it and re-run."
            )

    print(f"Loading NOAH shapefile from {shp_path}...")
    noah_gdf = gpd.read_file(shp_path)
    
    if noah_gdf.crs != "EPSG:4326":
        noah_gdf = noah_gdf.to_crs("EPSG:4326")
        
    # Exact Geographic Extent for Barangay San Jose, Rodriguez (Montalban), Rizal
    # Bounding coordinates: Lat 14.708° N to 14.762° N | Lon 121.108° E to 121.162° E
    san_jose_polygon = Polygon([
        (121.108, 14.708),
        (121.162, 14.708),
        (121.162, 14.762),
        (121.108, 14.762),
        (121.108, 14.708)
    ])
    boundary_gdf = gpd.GeoDataFrame(geometry=[san_jose_polygon], crs="EPSG:4326")
    
    print("Clipping NOAH flood polygons strictly to Barangay San Jose extent...")
    clipped_gdf = gpd.clip(noah_gdf, boundary_gdf)
    
    print("Dissolving polygons by hazard level (Var)...")
    clipped_gdf = clipped_gdf.dissolve(by='Var', as_index=False)
    
    # Simplify polygon geometry (~20m tolerance for web map performance)
    print("Simplifying dissolved polygon geometries...")
    clipped_gdf['geometry'] = clipped_gdf['geometry'].simplify(0.0002, preserve_topology=True)
    
    # Round coordinates to 5 decimal places (~1m precision)
    print("Rounding coordinate precision to 5 decimal places...")
    clipped_gdf['geometry'] = clipped_gdf['geometry'].apply(lambda g: round_coords(g, precision=5))
    
    # Clean up empty geometries
    clipped_gdf = clipped_gdf[~clipped_gdf.is_empty & clipped_gdf.geometry.notnull()].copy()
    
    # Format attributes
    clipped_gdf['Var'] = clipped_gdf['Var'].astype(int)
    hazard_map = {1: "Low", 2: "Medium", 3: "High"}
    depth_map = {1: "0 - 0.5 m", 2: "0.5 - 1.5 m", 3: "> 1.5 m"}
    color_map = {1: "#FFED4A", 2: "#F59E0B", 3: "#EF4444"}
    
    clipped_gdf['hazard_level'] = clipped_gdf['Var'].map(hazard_map)
    clipped_gdf['depth'] = clipped_gdf['Var'].map(depth_map)
    clipped_gdf['fill_color'] = clipped_gdf['Var'].map(color_map)
    
    clipped_gdf = clipped_gdf.sort_values(by='Var').reset_index(drop=True)
    
    print(f"Exporting optimized GeoJSON to {out_geojson}...")
    clipped_gdf.to_file(out_geojson, driver="GeoJSON")
    
    file_size_kb = os.path.getsize(out_geojson) / 1024
    print(f"\nSUCCESS! Generated {out_geojson} ({file_size_kb:.2f} KB / {file_size_kb/1024:.2f} MB)")

if __name__ == "__main__":
    process_noah_data()
