from pathlib import Path
import json
import math
import urllib.request


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "scripts" / "data"
WORLD_PATH = DATA_DIR / "world_countries.geojson"
INDIA_ADM1_PATH = DATA_DIR / "india_adm1_geoboundaries.geojson"
OUT_PATH = DATA_DIR / "hero_boundaries.json"

WORLD_URL = "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson"
INDIA_ADM1_URL = "https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/IND/ADM1/geoBoundaries-IND-ADM1.geojson"


def download_if_missing(path, url):
    if path.exists():
        return

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    print(f"downloading {url}")
    urllib.request.urlretrieve(url, path)


def perpendicular_distance(point, start, end):
    px, py = point
    sx, sy = start
    ex, ey = end
    dx = ex - sx
    dy = ey - sy

    if dx == 0 and dy == 0:
        return math.hypot(px - sx, py - sy)

    return abs(dy * px - dx * py + ex * sy - ey * sx) / math.hypot(dx, dy)


def simplify_open(points, tolerance):
    if len(points) <= 2:
        return points

    max_distance = 0.0
    index = 0

    for idx in range(1, len(points) - 1):
        distance = perpendicular_distance(points[idx], points[0], points[-1])

        if distance > max_distance:
            max_distance = distance
            index = idx

    if max_distance <= tolerance:
        return [points[0], points[-1]]

    left = simplify_open(points[: index + 1], tolerance)
    right = simplify_open(points[index:], tolerance)

    return left[:-1] + right


def simplify_ring(ring, tolerance, min_points=4):
    points = [
        (round(float(point[0]), 5), round(float(point[1]), 5))
        for point in ring
    ]

    if len(points) < min_points:
        return []

    if points[0] == points[-1]:
        points = points[:-1]

    simplified = simplify_open(points + [points[0]], tolerance)

    if simplified[0] == simplified[-1]:
        simplified = simplified[:-1]

    if len(simplified) < min_points:
        simplified = points

    return [[lon, lat] for lon, lat in simplified]


def iter_outer_rings(geometry):
    if not geometry:
        return

    if geometry["type"] == "Polygon":
        for polygon in [geometry["coordinates"]]:
            if polygon:
                yield polygon[0]

    if geometry["type"] == "MultiPolygon":
        for polygon in geometry["coordinates"]:
            if polygon:
                yield polygon[0]


def ring_bounds(ring):
    lons = [point[0] for point in ring]
    lats = [point[1] for point in ring]
    return min(lons), min(lats), max(lons), max(lats)


def keep_world_ring(ring):
    min_lon, min_lat, max_lon, max_lat = ring_bounds(ring)
    width = max_lon - min_lon
    height = max_lat - min_lat

    return width >= 0.25 and height >= 0.25


def normalize_feature(feature, name_key, tolerance, keep_ring):
    rings = []

    for ring in iter_outer_rings(feature.get("geometry")):
        simplified = simplify_ring(ring, tolerance)

        if simplified and keep_ring(simplified):
            rings.append(simplified)

    return {
        "name": feature["properties"].get(name_key, ""),
        "rings": rings,
    }


def main():
    download_if_missing(WORLD_PATH, WORLD_URL)
    download_if_missing(INDIA_ADM1_PATH, INDIA_ADM1_URL)

    world = json.loads(WORLD_PATH.read_text(encoding="utf-8"))
    india_adm1 = json.loads(INDIA_ADM1_PATH.read_text(encoding="utf-8"))

    countries = []
    india_country = None

    for feature in world["features"]:
        country = normalize_feature(
            feature,
            "name",
            tolerance=0.08,
            keep_ring=keep_world_ring,
        )

        if not country["rings"]:
            continue

        countries.append(country)

        if country["name"] == "India":
            india_country = country

    states = []
    uttar_pradesh = None

    for feature in india_adm1["features"]:
        name = feature["properties"].get("shapeName", "")
        tolerance = 0.004 if name == "Uttar Pradesh" else 0.012
        state = normalize_feature(
            feature,
            "shapeName",
            tolerance=tolerance,
            keep_ring=lambda ring: True,
        )

        if not state["rings"]:
            continue

        states.append(state)

        if name == "Uttar Pradesh":
            uttar_pradesh = state

    if india_country is None:
        raise RuntimeError("India country boundary was not found")

    if uttar_pradesh is None:
        raise RuntimeError("Uttar Pradesh ADM1 boundary was not found")

    payload = {
        "sources": {
            "world": {
                "name": "Geo Countries",
                "url": WORLD_URL,
                "derivedFrom": "Natural Earth Admin 0 country boundaries",
            },
            "indiaAdm1": {
                "name": "geoBoundaries India ADM1",
                "url": INDIA_ADM1_URL,
                "source": "DataMeet India community, Election Commission of India",
                "license": "CC BY 2.5 IN",
                "yearRepresented": "2011",
            },
        },
        "countries": countries,
        "india": india_country,
        "states": states,
        "uttarPradesh": uttar_pradesh,
    }

    OUT_PATH.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")

    for raw_path in (WORLD_PATH, INDIA_ADM1_PATH):
        raw_path.unlink(missing_ok=True)

    print(f"wrote {OUT_PATH.relative_to(ROOT)}")
    print(f"countries: {len(countries)}")
    print(f"states: {len(states)}")


if __name__ == "__main__":
    main()
