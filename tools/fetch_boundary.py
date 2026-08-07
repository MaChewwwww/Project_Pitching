import urllib.request
import urllib.parse
import json

def get_rodriguez_subdivisions():
    # Search Nominatim for Montalban / Rodriguez barangays
    query = "Barangay San Jose, Rodriguez, Rizal"
    url = f"https://nominatim.openstreetmap.org/search?q={urllib.parse.quote(query)}&polygon_geojson=1&format=json"
    req = urllib.request.Request(url, headers={'User-Agent': 'BarangaySanJosePlatform/1.0'})
    
    with urllib.request.urlopen(req) as res:
        data = json.loads(res.read().decode('utf-8'))
        print(f"Nominatim items: {len(data)}")
        for d in data:
            print("Display name:", d.get('display_name'))
            print("Type:", d.get('type'), "Class:", d.get('class'))
            print("GeoJSON type:", d.get('geojson', {}).get('type'))
            print("Bounding box:", d.get('boundingbox'))

if __name__ == "__main__":
    get_rodriguez_subdivisions()
