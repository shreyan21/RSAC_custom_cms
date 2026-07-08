from pathlib import Path
import json
import math

import imageio.v2 as imageio
import numpy as np
from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
VIDEO_DIR = ROOT / "src" / "assets" / "videos"
POSTER_DIR = ROOT / "src" / "assets" / "images" / "hero-videos"
BOUNDARIES_PATH = ROOT / "scripts" / "data" / "hero_boundaries.json"

WIDTH = 1280
HEIGHT = 720
FPS = 24
DURATION = 16
FRAMES = FPS * DURATION

VARIANTS = [
    {
        "name": "rsac-earth-studio-up.mp4",
        "poster": "rsac-earth-studio-up-poster.png",
        "start": (80.0, 58.0),
        "mid": (76.0, 39.0),
        "end": (80.45, 26.95),
        "radius": (230.0, 2180.0),
        "anchor": ((0.56, 0.45), (0.49, 0.32)),
        "palette": {
            "ocean": (18, 55, 90, 244),
            "ocean_edge": (157, 198, 250, 128),
        },
    },
]


def load_boundaries():
    data = json.loads(BOUNDARIES_PATH.read_text(encoding="utf-8"))

    return [
        {
            "name": country["name"],
            "rings": [
                [(float(lon), float(lat)) for lon, lat in ring]
                for ring in country["rings"]
            ],
        }
        for country in data["countries"]
    ]


COUNTRIES = load_boundaries()


def clamp(value, low=0.0, high=1.0):
    return max(low, min(high, value))


def smoothstep(value):
    value = clamp(value)
    return value * value * (3.0 - 2.0 * value)


def ease(value):
    value = clamp(value)
    return 0.5 - 0.5 * math.cos(math.pi * value)


def lerp(a, b, t):
    return a + (b - a) * t


def gaussian(value, center, spread):
    return np.exp(-0.5 * ((value - center) / spread) ** 2)


def make_space_background():
    background = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 255))
    draw = ImageDraw.Draw(background, "RGBA")
    rng = np.random.default_rng(42)

    for _ in range(950):
        x = int(rng.integers(0, WIDTH))
        y = int(rng.integers(0, HEIGHT))
        brightness = int(rng.integers(34, 188))
        alpha = int(rng.integers(66, 178))
        radius = 1 if rng.random() < 0.97 else 2
        color = (brightness, brightness, min(255, brightness + 18), alpha)

        if radius == 1:
            draw.point((x, y), fill=color)
        else:
            draw.ellipse((x - 1, y - 1, x + 1, y + 1), fill=color)

    return background.filter(ImageFilter.GaussianBlur(radius=0.12))


SPACE_BACKGROUND = make_space_background()


def camera_state(p, variant):
    travel = ease(min(p / 0.66, 1.0))
    zoom = ease(clamp((p - 0.15) / 0.72))
    settle = smoothstep((p - 0.76) / 0.18)

    start_lon, start_lat = variant["start"]
    mid_lon, mid_lat = variant["mid"]
    end_lon, end_lat = variant["end"]
    low_radius, high_radius = variant["radius"]
    start_anchor, end_anchor = variant["anchor"]

    if travel < 0.58:
        local = ease(travel / 0.58)
        lon = lerp(start_lon, mid_lon, local)
        lat = lerp(start_lat, mid_lat, local)
    else:
        local = ease((travel - 0.58) / 0.42)
        lon = lerp(mid_lon, end_lon, local)
        lat = lerp(mid_lat, end_lat, local)

    return {
        "center_lon": lon,
        "center_lat": lerp(lat, end_lat, settle * 0.22),
        "radius": lerp(low_radius, high_radius, zoom),
        "cx": lerp(WIDTH * start_anchor[0], WIDTH * end_anchor[0], zoom),
        "cy": lerp(HEIGHT * start_anchor[1], HEIGHT * end_anchor[1], zoom),
    }


def project_point(lon, lat, camera):
    lon_r = math.radians(lon)
    lat_r = math.radians(lat)
    lon0 = math.radians(camera["center_lon"])
    lat0 = math.radians(camera["center_lat"])
    delta = (lon_r - lon0 + math.pi) % math.tau - math.pi

    cos_c = (
        math.sin(lat0) * math.sin(lat_r)
        + math.cos(lat0) * math.cos(lat_r) * math.cos(delta)
    )

    if cos_c < -0.012:
        return None

    radius = camera["radius"]
    x = radius * math.cos(lat_r) * math.sin(delta)
    y = -radius * (
        math.cos(lat0) * math.sin(lat_r)
        - math.sin(lat0) * math.cos(lat_r) * math.cos(delta)
    )

    return camera["cx"] + x, camera["cy"] + y, cos_c


def projected_ring(points, camera, min_visible_ratio=0.08):
    projected = []

    for lon, lat in points:
        point = project_point(lon, lat, camera)

        if point is not None:
            projected.append((point[0], point[1]))

    if len(projected) < 3:
        return None

    if len(projected) / max(1, len(points)) < min_visible_ratio:
        return None

    return projected


def inverse_project_grid(camera):
    yy, xx = np.mgrid[0:HEIGHT, 0:WIDTH].astype(np.float32)
    radius = float(camera["radius"])
    x = (xx - float(camera["cx"])) / radius
    y = -(yy - float(camera["cy"])) / radius
    rho = np.sqrt(x * x + y * y)
    visible = rho <= 1.0

    rho_safe = np.where(rho == 0, 1.0, rho)
    c = np.arcsin(np.clip(rho, 0.0, 1.0))
    sinc = np.sin(c)
    cosc = np.cos(c)
    lat0 = math.radians(camera["center_lat"])
    lon0 = math.radians(camera["center_lon"])

    lat = np.arcsin(cosc * math.sin(lat0) + (y * sinc * math.cos(lat0)) / rho_safe)
    lon = lon0 + np.arctan2(
        x * sinc,
        rho_safe * math.cos(lat0) * cosc - y * math.sin(lat0) * sinc,
    )

    lon = ((np.degrees(lon) + 180.0) % 360.0) - 180.0
    lat = np.degrees(lat)

    return lon, lat, visible, xx, yy


def make_satellite_land_texture(grid):
    lon, lat, visible, xx, yy = grid

    desert = np.maximum(
        gaussian(lon, 46.0, 18.0) * gaussian(lat, 27.0, 13.0),
        gaussian(lon, 67.0, 18.0) * gaussian(lat, 42.0, 10.0),
    )
    desert = np.maximum(
        desert,
        gaussian(lon, 28.0, 16.0) * gaussian(lat, 23.0, 11.0),
    )

    vegetation = np.maximum(
        gaussian(lon, 82.0, 13.0) * gaussian(lat, 21.0, 12.0),
        gaussian(lon, 100.0, 15.0) * gaussian(lat, 17.0, 12.0),
    )
    vegetation = np.maximum(
        vegetation,
        gaussian(lon, 72.0, 20.0) * gaussian(lat, 55.0, 12.0),
    )

    himalaya = gaussian(lon, 82.0, 13.5) * gaussian(lat, 32.5, 4.4)
    snow = gaussian(lon, 84.0, 12.0) * gaussian(lat, 35.0, 2.3)

    grain = (
        0.58 * np.sin(xx * 0.016 + yy * 0.011)
        + 0.36 * np.sin(xx * 0.037 - yy * 0.029)
        + 0.24 * np.sin(xx * 0.009 - yy * 0.052)
    )
    grain = (grain + 1.18) / 2.36

    vegetation_color = np.array([42, 96, 54], dtype=np.float32)
    crop_color = np.array([112, 138, 78], dtype=np.float32)
    dry_color = np.array([176, 145, 95], dtype=np.float32)
    desert_color = np.array([214, 184, 127], dtype=np.float32)
    mountain_color = np.array([137, 122, 104], dtype=np.float32)
    snow_color = np.array([226, 228, 218], dtype=np.float32)

    dry_mix = np.clip(desert * 1.22, 0.0, 1.0)[..., None]
    green_mix = np.clip(vegetation * 1.28, 0.0, 1.0)[..., None]
    mountain_mix = np.clip(himalaya * 1.22, 0.0, 1.0)[..., None]
    snow_mix = np.clip(snow * 1.34, 0.0, 1.0)[..., None]

    color = crop_color * (1.0 - green_mix) + vegetation_color * green_mix
    color = color * (1.0 - dry_mix) + (dry_color * 0.42 + desert_color * 0.58) * dry_mix
    color = color * (1.0 - mountain_mix) + mountain_color * mountain_mix
    color = color * (1.0 - snow_mix) + snow_color * snow_mix
    color = np.clip(color * (0.84 + 0.3 * grain[..., None]), 0, 255)

    alpha = np.where(visible, 248, 0).astype(np.uint8)
    return Image.fromarray(np.dstack((color.astype(np.uint8), alpha)), "RGBA")


def make_satellite_ocean_texture(grid, palette):
    _, _, visible, xx, yy = grid
    grain = (
        0.62 * np.sin(xx * 0.012 + yy * 0.017)
        + 0.38 * np.sin(xx * 0.031 - yy * 0.022)
    )
    grain = (grain + 1.0) / 2.0

    base = np.array(palette["ocean"][:3], dtype=np.float32)
    shallow = np.array([41, 107, 150], dtype=np.float32)
    deep = np.array([8, 32, 76], dtype=np.float32)
    color = deep * (1.0 - grain[..., None]) + shallow * grain[..., None]
    color = np.clip(base * 0.36 + color * 0.64, 0, 255)
    alpha = np.where(visible, palette["ocean"][3], 0).astype(np.uint8)

    return Image.fromarray(np.dstack((color.astype(np.uint8), alpha)), "RGBA")


def make_cloud_texture(grid):
    lon, lat, visible, xx, yy = grid
    bands = (
        0.5 * np.sin(xx * 0.015 + yy * 0.034)
        + 0.34 * np.sin(xx * 0.043 - yy * 0.018)
        + 0.24 * np.sin(xx * 0.071 + yy * 0.049)
    )
    tropical = gaussian(lat, 9.0, 18.0)
    mid_latitude = gaussian(lat, 42.0, 13.0)
    south_band = gaussian(lat, -17.0, 14.0)
    cloud = (bands + 1.08) / 2.16
    cloud = cloud * (0.36 + 0.28 * tropical + 0.24 * mid_latitude + 0.14 * south_band)
    cloud = np.clip((cloud - 0.34) * 0.92, 0.0, 0.46)

    alpha = np.where(visible, cloud * 154, 0).astype(np.uint8)
    white = np.full((HEIGHT, WIDTH, 3), 238, dtype=np.uint8)

    return Image.fromarray(np.dstack((white, alpha)), "RGBA").filter(
        ImageFilter.GaussianBlur(radius=0.8)
    )


def make_land_mask(camera):
    land_mask = Image.new("L", (WIDTH, HEIGHT), 0)
    mask_draw = ImageDraw.Draw(land_mask)

    for country in COUNTRIES:
        for ring in country["rings"]:
            path = projected_ring(ring, camera)

            if path is None:
                continue

            mask_draw.polygon(path, fill=255)

    return land_mask


def add_limb_shadow(base, camera, globe_mask):
    radius = camera["radius"]
    cx = camera["cx"]
    cy = camera["cy"]
    yy, xx = np.mgrid[0:HEIGHT, 0:WIDTH].astype(np.float32)
    nx = (xx - cx) / radius
    ny = (yy - cy) / radius
    limb = np.clip(nx * 0.72 + ny * 0.22 + 0.26, 0.0, 1.0) ** 1.65
    edge = np.clip(np.sqrt(nx * nx + ny * ny), 0.0, 1.0) ** 3.0
    alpha = np.clip(
        (limb * 165 + edge * 72) * (np.asarray(globe_mask) / 255.0),
        0,
        210,
    ).astype(np.uint8)
    shadow = np.zeros((HEIGHT, WIDTH, 4), dtype=np.uint8)
    shadow[..., 3] = alpha

    return Image.alpha_composite(base, Image.fromarray(shadow, "RGBA"))


def add_atmosphere(base, camera, palette):
    radius = camera["radius"]
    cx = camera["cx"]
    cy = camera["cy"]

    glow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(glow, "RGBA")
    draw.ellipse(
        (cx - radius * 1.02, cy - radius * 1.02, cx + radius * 1.02, cy + radius * 1.02),
        outline=palette["ocean_edge"],
        width=max(2, int(radius * 0.014)),
    )
    draw.ellipse(
        (cx - radius * 0.72, cy - radius * 1.03, cx + radius * 1.10, cy + radius * 0.82),
        fill=(255, 255, 255, 14),
    )
    glow = glow.filter(ImageFilter.GaussianBlur(radius=0.35))

    return Image.alpha_composite(base, glow)


def draw_frame(index, variant):
    p = index / max(1, FRAMES - 1)
    camera = camera_state(p, variant)
    palette = variant["palette"]
    radius = camera["radius"]
    cx = camera["cx"]
    cy = camera["cy"]

    base = SPACE_BACKGROUND.copy()
    grid = inverse_project_grid(camera)
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    globe_mask = Image.new("L", (WIDTH, HEIGHT), 0)
    mask_draw = ImageDraw.Draw(globe_mask)
    mask_draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=255)

    ocean = make_satellite_ocean_texture(grid, palette)
    ocean.putalpha(
        Image.fromarray(
            np.minimum(np.asarray(ocean.getchannel("A")), np.asarray(globe_mask)).astype(np.uint8),
            "L",
        )
    )
    layer.alpha_composite(ocean)

    land = make_satellite_land_texture(grid)
    land_mask = make_land_mask(camera)
    land.putalpha(
        Image.fromarray(
            np.minimum(np.asarray(land.getchannel("A")), np.asarray(land_mask)).astype(np.uint8),
            "L",
        )
    )
    layer.alpha_composite(land)

    clouds = make_cloud_texture(grid)
    clouds.putalpha(
        Image.fromarray(
            np.minimum(np.asarray(clouds.getchannel("A")), np.asarray(globe_mask)).astype(np.uint8),
            "L",
        )
    )
    layer.alpha_composite(clouds)

    draw = ImageDraw.Draw(layer, "RGBA")
    draw.ellipse(
        (cx - radius, cy - radius, cx + radius, cy + radius),
        outline=palette["ocean_edge"],
        width=max(2, int(radius * 0.006)),
    )

    base = Image.alpha_composite(base, layer)
    base = add_limb_shadow(base, camera, globe_mask)
    base = add_atmosphere(base, camera, palette)

    return np.asarray(base.convert("RGB"))


def write_video(variant):
    VIDEO_DIR.mkdir(parents=True, exist_ok=True)
    POSTER_DIR.mkdir(parents=True, exist_ok=True)
    video_path = VIDEO_DIR / variant["name"]
    poster_path = POSTER_DIR / variant.get("poster", variant["name"].replace(".mp4", "-poster.png"))
    writer = imageio.get_writer(
        video_path,
        fps=FPS,
        codec="libx264",
        quality=9,
        ffmpeg_params=["-pix_fmt", "yuv420p", "-movflags", "+faststart"],
    )
    poster_frame = int(FRAMES * 0.84)
    poster = None

    print(f"rendering {video_path.relative_to(ROOT)}")
    for index in range(FRAMES):
        frame = draw_frame(index, variant)
        writer.append_data(frame)

        if index == poster_frame:
            poster = Image.fromarray(frame)

        if index % FPS == 0:
            print(f"  {index // FPS:02d}s / {DURATION}s")

    writer.close()

    if poster is None:
        poster = Image.fromarray(draw_frame(poster_frame, variant))

    poster.save(poster_path, optimize=True)

    print(f"wrote {video_path.relative_to(ROOT)}")
    print(f"wrote {poster_path.relative_to(ROOT)}")


def main():
    for variant in VARIANTS:
        write_video(variant)


if __name__ == "__main__":
    main()
