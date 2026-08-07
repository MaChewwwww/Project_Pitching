import json
import os

def generate_html_preview():
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    geojson_path = os.path.join(repo_root, "dataset", "derived", "san_jose_flood_5yr.geojson")
    html_out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "preview_map.html")  # gitignored — regenerate anytime

    with open(geojson_path, "r", encoding="utf-8") as f:
        geojson_data = json.load(f)
        
    geojson_str = json.dumps(geojson_data)
    
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Barangay San Jose - UP NOAH Flood Hazard Map Preview</title>
    <!-- Leaflet CSS -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    
    <style>
        :root {{
            --bg-dark: #0f172a;
            --panel-bg: rgba(30, 41, 59, 0.88);
            --border-color: rgba(255, 255, 255, 0.12);
            --text-main: #f8fafc;
            --text-muted: #94a3b8;
            --color-low: #FFED4A;
            --color-med: #F59E0B;
            --color-high: #EF4444;
            --color-safe: #10B981;
            --accent-blue: #38bdf8;
        }}

        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
        }}

        body {{
            background-color: var(--bg-dark);
            color: var(--text-main);
            height: 100vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }}

        header {{
            background: rgba(15, 23, 42, 0.95);
            backdrop-filter: blur(12px);
            border-bottom: 1px solid var(--border-color);
            padding: 12px 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            z-index: 1000;
        }}

        .brand {{
            display: flex;
            align-items: center;
            gap: 12px;
        }}

        .brand-icon {{
            width: 38px;
            height: 38px;
            background: linear-gradient(135deg, #0284c7, #0369a1);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 18px;
            box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);
        }}

        .brand-text h1 {{
            font-size: 17px;
            font-weight: 700;
            letter-spacing: -0.02em;
        }}

        .brand-text p {{
            font-size: 12px;
            color: var(--text-muted);
        }}

        .stats-strip {{
            display: flex;
            gap: 16px;
        }}

        .stat-badge {{
            background: var(--panel-bg);
            border: 1px solid var(--border-color);
            padding: 6px 14px;
            border-radius: 8px;
            font-size: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        }}

        .stat-dot {{
            width: 8px;
            height: 8px;
            border-radius: 50%;
        }}

        #map {{
            flex: 1;
            width: 100%;
            height: 100%;
            background: #0f172a;
        }}

        .leaflet-container {{
            background: #0f172a !important;
        }}

        .leaflet-control-zoom {{
            border: 1px solid var(--border-color) !important;
            border-radius: 8px !important;
            overflow: hidden;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4) !important;
        }}

        .leaflet-control-zoom a {{
            background: var(--panel-bg) !important;
            color: var(--text-main) !important;
            border-bottom: 1px solid var(--border-color) !important;
            backdrop-filter: blur(8px);
        }}

        .map-legend {{
            background: var(--panel-bg);
            backdrop-filter: blur(16px);
            border: 1px solid var(--border-color);
            padding: 16px;
            border-radius: 14px;
            color: var(--text-main);
            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
            min-width: 270px;
        }}

        .legend-title {{
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: var(--text-muted);
            margin-bottom: 10px;
        }}

        .legend-section {{
            margin-bottom: 12px;
        }}

        .legend-section:last-child {{
            margin-bottom: 0;
        }}

        .legend-item {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 7px;
            font-size: 12.5px;
        }}

        .legend-color {{
            width: 15px;
            height: 15px;
            border-radius: 4px;
            display: inline-block;
            margin-right: 9px;
        }}

        .legend-dot {{
            width: 11px;
            height: 11px;
            border-radius: 50%;
            display: inline-block;
            margin-right: 9px;
            box-shadow: 0 0 0 1.5px rgba(255, 255, 255, 0.4);
        }}

        .legend-left {{
            display: flex;
            align-items: center;
        }}

        .legend-subtext {{
            font-size: 10.5px;
            color: var(--text-muted);
            font-weight: 600;
        }}

        .leaflet-popup-content-wrapper {{
            background: rgba(15, 23, 42, 0.95) !important;
            backdrop-filter: blur(12px) !important;
            color: var(--text-main) !important;
            border: 1px solid var(--border-color) !important;
            border-radius: 12px !important;
            box-shadow: 0 12px 36px rgba(0, 0, 0, 0.6) !important;
            padding: 4px !important;
        }}

        .leaflet-popup-tip {{
            background: rgba(15, 23, 42, 0.95) !important;
        }}

        .popup-card {{
            padding: 10px 12px;
        }}

        .popup-card h4 {{
            font-size: 14px;
            font-weight: 700;
            margin-bottom: 4px;
            display: flex;
            align-items: center;
            gap: 6px;
        }}

        .popup-card p {{
            font-size: 12px;
            color: var(--text-muted);
            margin-top: 4px;
        }}

        .pill-badge {{
            display: inline-block;
            padding: 3px 8px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 700;
            margin-top: 6px;
        }}

        footer {{
            background: rgba(15, 23, 42, 0.95);
            border-top: 1px solid var(--border-color);
            padding: 8px 24px;
            font-size: 11px;
            color: var(--text-muted);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}

        footer a {{
            color: var(--accent-blue);
            text-decoration: none;
        }}
    </style>
</head>
<body>

    <header>
        <div class="brand">
            <div class="brand-icon">🌊</div>
            <div class="brand-text">
                <h1>Barangay San Jose Hazard Map</h1>
                <p>UP Project NOAH 5-Year Flood Inundation (Rodriguez, Rizal)</p>
            </div>
        </div>

        <div class="stats-strip">
            <div class="stat-badge">
                <span class="stat-dot" style="background: var(--color-high);"></span>
                <span>High Hazard (&gt;1.5m)</span>
            </div>
            <div class="stat-badge">
                <span class="stat-dot" style="background: var(--color-med);"></span>
                <span>Medium Hazard (0.5–1.5m)</span>
            </div>
            <div class="stat-badge">
                <span class="stat-dot" style="background: var(--color-low);"></span>
                <span>Low Hazard (0–0.5m)</span>
            </div>
        </div>
    </header>

    <div id="map"></div>

    <footer>
        <div>Locality: <strong>Barangay San Jose, Rodriguez (Montalban), Rizal</strong> · Data: UP NOAH / LiPAD (ODC-ODbL)</div>
        <div>Coordinates: EPSG:4326 (WGS84)</div>
    </footer>

    <!-- Leaflet JS -->
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
        const geojsonData = {geojson_str};

        const map = L.map('map', {{
            zoomControl: true,
            attributionControl: false
        }}).setView([14.7350, 121.1390], 14);

        L.tileLayer('https://{{s}}.basemaps.cartocdn.com/dark_all/{{z}}/{{x}}/{{y}}{{r}}.png', {{
            maxZoom: 19,
            subdomains: 'abcd'
        }}).addTo(map);

        const sanJoseBounds = [
            [14.7080, 121.1160],
            [14.7620, 121.1620]
        ];
        L.rectangle(sanJoseBounds, {{
            color: "#38bdf8",
            weight: 2,
            dashArray: '6, 6',
            fill: false
        }}).addTo(map).bindTooltip("Barangay San Jose Administrative Boundary", {{ permanent: true, direction: "top" }});

        function stylePolygon(feature) {{
            const varVal = feature.properties.Var;
            let fillColor = '#FFED4A';
            let fillOpacity = 0.55;

            if (varVal === 3) {{
                fillColor = '#EF4444';
                fillOpacity = 0.60;
            }} else if (varVal === 2) {{
                fillColor = '#F59E0B';
                fillOpacity = 0.60;
            }} else if (varVal === 1) {{
                fillColor = '#FFED4A';
                fillOpacity = 0.55;
            }}

            return {{
                fillColor: fillColor,
                weight: 1,
                opacity: 0.8,
                color: fillColor,
                fillOpacity: fillOpacity
            }};
        }}

        function onEachFeature(feature, layer) {{
            const props = feature.properties;
            const popupContent = `
                <div class="popup-card">
                    <h4>🌊 NOAH Flood Hazard Zone</h4>
                    <p><strong>Locality:</strong> Barangay San Jose, Rodriguez</p>
                    <p><strong>Hazard Level:</strong> ${{props.hazard_level || 'Level ' + props.Var}}</p>
                    <p><strong>Simulated Water Depth:</strong> ${{props.depth}}</p>
                    <p><strong>Return Period:</strong> 5-Year Event (20% annual chance)</p>
                    <div class="pill-badge" style="background: ${{props.fill_color}}; color: #000;">
                        Var ${{props.Var}} - ${{props.hazard_level}} Risk Zone
                    </div>
                </div>
            `;
            layer.bindPopup(popupContent);

            layer.on({{
                mouseover: (e) => {{
                    const l = e.target;
                    l.setStyle({{
                        weight: 3,
                        color: '#ffffff',
                        fillOpacity: 0.75
                    }});
                }},
                mouseout: (e) => {{
                    geojsonLayer.resetStyle(e.target);
                }}
            }});
        }}

        const geojsonLayer = L.geoJSON(geojsonData, {{
            style: stylePolygon,
            onEachFeature: onEachFeature
        }}).addTo(map);

        if (geojsonLayer.getBounds().isValid()) {{
            map.fitBounds(geojsonLayer.getBounds(), {{ padding: [30, 30] }});
        }}

        const sampleHouseholds = [
            {{ lat: 14.7320, lng: 121.1280, name: "Santos Household (Area 1)", risk: "Priority Evacuation", color: "#EF4444", info: "2 Seniors, 1 Infant (Inside High Flood Zone >1.5m)" }},
            {{ lat: 14.7410, lng: 121.1380, name: "Reyes Household (Area 3)", risk: "Moderate Risk", color: "#F59E0B", info: "4 Members (Inside Medium Flood Zone 0.5–1.5m)" }},
            {{ lat: 14.7500, lng: 121.1520, name: "Dela Cruz Household (Area 7)", risk: "Low Risk / Safe Zone", color: "#10B981", info: "3 Members (Elevated Ground / Outside Flood Inundation)" }}
        ];

        sampleHouseholds.forEach(hh => {{
            const marker = L.circleMarker([hh.lat, hh.lng], {{
                radius: 8,
                fillColor: hh.color,
                color: '#ffffff',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.95
            }}).addTo(map);

            marker.bindPopup(`
                <div class="popup-card">
                    <h4>🏠 ${{hh.name}}</h4>
                    <p>${{hh.info}}</p>
                    <div class="pill-badge" style="background: ${{hh.color}}; color: #fff;">
                        ${{hh.risk}}
                    </div>
                </div>
            `);
        }});

        const legend = L.control({{ position: 'topright' }});
        legend.onAdd = function (map) {{
            const div = L.DomUtil.create('div', 'map-legend');
            div.innerHTML = `
                <div class="legend-section">
                    <div class="legend-title">Flood Hazard Layer (NOAH)</div>
                    <div class="legend-item">
                        <div class="legend-left">
                            <span class="legend-color" style="background: #EF4444;"></span>
                            <span>High Hazard</span>
                        </div>
                        <span class="legend-subtext">&gt; 1.5 m</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-left">
                            <span class="legend-color" style="background: #F59E0B;"></span>
                            <span>Medium Hazard</span>
                        </div>
                        <span class="legend-subtext">0.5 – 1.5 m</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-left">
                            <span class="legend-color" style="background: #FFED4A;"></span>
                            <span>Low Hazard</span>
                        </div>
                        <span class="legend-subtext">0 – 0.5 m</span>
                    </div>
                </div>

                <div class="legend-section" style="border-top: 1px solid var(--border-color); padding-top: 10px;">
                    <div class="legend-title">Household Risk Status (M1f)</div>
                    <div class="legend-item">
                        <div class="legend-left">
                            <span class="legend-dot" style="background: #EF4444;"></span>
                            <span>Priority Evacuation</span>
                        </div>
                        <span class="legend-subtext">High Risk</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-left">
                            <span class="legend-dot" style="background: #F59E0B;"></span>
                            <span>Moderate Risk</span>
                        </div>
                        <span class="legend-subtext">Med Risk</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-left">
                            <span class="legend-dot" style="background: #10B981;"></span>
                            <span>Safe / Low Risk</span>
                        </div>
                        <span class="legend-subtext">Low Risk</span>
                    </div>
                </div>

                <div class="legend-section" style="border-top: 1px solid var(--border-color); padding-top: 10px;">
                    <div class="legend-title">Map Boundaries</div>
                    <div class="legend-item">
                        <div class="legend-left">
                            <span style="width: 14px; height: 0; border-top: 2px dashed #38bdf8; display: inline-block; margin-right: 9px;"></span>
                            <span>San Jose Boundary</span>
                        </div>
                    </div>
                </div>
            `;
            return div;
        }};
        legend.addTo(map);
    </script>
</body>
</html>
"""
    
    with open(html_out_path, "w", encoding="utf-8") as f:
        f.write(html_content)
        
    print(f"Successfully generated updated map preview with detailed legend: {html_out_path}")

if __name__ == "__main__":
    generate_html_preview()
