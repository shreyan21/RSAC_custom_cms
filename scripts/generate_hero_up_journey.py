from pathlib import Path
import json
import math

import imageio.v2 as imageio
import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "src" / "assets" / "videos"
VIDEO_PATH = OUT_DIR / "hero-up-journey.mp4"
POSTER_PATH = OUT_DIR / "hero-up-journey-poster.png"
BOUNDARIES_PATH = ROOT / "scripts" / "data" / "hero_boundaries.json"

WIDTH = 1280
HEIGHT = 720
FPS = 24
DURATION = 18
FRAMES = FPS * DURATION

UP_LON = 80.95
UP_LAT = 26.85
UP_LABEL_LON = 83.0
UP_LABEL_LAT = 27.2

LAND = (114, 174, 116, 224)
COUNTRY_OUTLINE = (34, 103, 86, 98)
INDIA_FILL = (76, 171, 101, 240)
INDIA_OUTLINE = (255, 255, 255, 218)
STATE_OUTLINE = (255, 255, 255, 116)
UP_FILL = (16, 142, 84, 244)
UP_OUTLINE = (255, 255, 255, 252)


def load_boundaries():
    if not BOUNDARIES_PATH.exists():
        raise FileNotFoundError(
            f"{BOUNDARIES_PATH} is missing. Run scripts/prepare_hero_boundaries.py first."
        )

    data = json.loads(BOUNDARIES_PATH.read_text(encoding="utf-8"))

    def convert(item):
        return {
            "name": item["name"],
            "rings": [
                [(float(lon), float(lat)) for lon, lat in ring]
                for ring in item["rings"]
            ],
        }

    return (
        [convert(country) for country in data["countries"]],
        convert(data["india"]),
        [convert(state) for state in data["states"]],
        convert(data["uttarPradesh"]),
    )


COUNTRIES, INDIA, STATES, UTTAR_PRADESH = load_boundaries()


def smoothstep(value):
    value = max(0.0, min(1.0, value))
    return value * value * (3.0 - 2.0 * value)


def ease_in_out(value):
    value = max(0.0, min(1.0, value))
    return 0.5 - 0.5 * math.cos(math.pi * value)


def lerp(a, b, t):
    return a + (b - a) * t


def color_with_alpha(color, alpha):
    return (color[0], color[1], color[2], int(color[3] * alpha))


def font(size, bold=False):
    candidates = [
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
    ]

    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue

    return ImageFont.load_default()


FONT_LABEL = font(24, bold=True)


def camera_state(p):
    # Three clear story beats: world, India, Uttar Pradesh.
    t_rotate = ease_in_out(min(p / 0.42, 1.0))
    t_zoom = ease_in_out(max(0.0, (p - 0.18) / 0.72))

    return {
        "center_lon": lerp(-42.0, 80.2, t_rotate),
        "center_lat": lerp(12.0, 27.05, t_rotate),
        "radius": lerp(265.0, 1760.0, t_zoom),
        "cx": lerp(WIDTH * 0.70, WIDTH * 0.50, t_zoom),
        "cy": lerp(HEIGHT * 0.48, HEIGHT * 0.27, t_zoom),
    }


def project_point(lon, lat, camera):
    lon_r = math.radians(lon)
    lat_r = math.radians(lat)
    lon0 = math.radians(camera["center_lon"])
    lat0 = math.radians(camera["center_lat"])
    delta = (lon_r - lon0 + math.pi) % (math.tau) - math.pi

    cos_c = (
        math.sin(lat0) * math.sin(lat_r)
        + math.cos(lat0) * math.cos(lat_r) * math.cos(delta)
    )

    if cos_c < -0.015:
        return None

    radius = camera["radius"]
    x = radius * math.cos(lat_r) * math.sin(delta)
    y = -radius * (
        math.cos(lat0) * math.sin(lat_r)
        - math.sin(lat0) * math.cos(lat_r) * math.cos(delta)
    )

    return (camera["cx"] + x, camera["cy"] + y, cos_c)


def projected_ring(points, camera, min_visible_ratio=0.18):
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


def projected_path(points, camera):
    path = []

    for lon, lat in points:
        point = project_point(lon, lat, camera)

        if point is not None:
            path.append((point[0], point[1]))

    return path


def make_gradient():
    gradient = np.zeros((HEIGHT, WIDTH, 4), dtype=np.uint8)
    top = np.array([219, 238, 244, 255], dtype=np.float32)
    bottom = np.array([242, 251, 246, 255], dtype=np.float32)

    for y in range(HEIGHT):
        t = y / (HEIGHT - 1)
        row = top * (1 - t) + bottom * t
        gradient[y, :, :] = row

    return Image.fromarray(gradient, "RGBA")


def draw_map_pin_label(base, xy, text, alpha=1.0):
    draw = ImageDraw.Draw(base, "RGBA")
    anchor_x, anchor_y = xy
    pin_width = 42
    pin_height = 58
    pin_gap = 12
    pad_x = 16
    pad_y = 9
    bbox = draw.textbbox((0, 0), text, font=FONT_LABEL)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    badge_width = text_width + pad_x * 2
    badge_height = text_height + pad_y * 2

    pin_tip_x = max(32, min(WIDTH - badge_width - pin_width - pin_gap - 32, anchor_x))
    pin_tip_y = max(pin_height + 28, min(HEIGHT - 30, anchor_y))
    badge_x = pin_tip_x + pin_width * 0.5 + pin_gap
    badge_y = pin_tip_y - pin_height + (pin_height - badge_height) * 0.44

    if badge_x + badge_width > WIDTH - 24:
        badge_x = pin_tip_x - pin_width * 0.5 - pin_gap - badge_width

    badge_x = max(24, min(WIDTH - badge_width - 24, badge_x))
    badge_y = max(24, min(HEIGHT - badge_height - 24, badge_y))

    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    badge_draw = ImageDraw.Draw(layer, "RGBA")
    badge_draw.rounded_rectangle(
        (badge_x, badge_y, badge_x + badge_width, badge_y + badge_height),
        radius=10,
        fill=(255, 255, 255, int(236 * alpha)),
        outline=(185, 28, 28, int(118 * alpha)),
        width=1,
    )
    badge_draw.text(
        (badge_x + pad_x, badge_y + pad_y - 1),
        text,
        font=FONT_LABEL,
        fill=(127, 29, 29, int(255 * alpha)),
    )

    scale = 4
    marker = Image.new("RGBA", (WIDTH * scale, HEIGHT * scale), (0, 0, 0, 0))
    marker_draw = ImageDraw.Draw(marker, "RGBA")

    sx = int(pin_tip_x * scale)
    sy = int(pin_tip_y * scale)
    sw = pin_width * scale
    sh = pin_height * scale
    radius = int(sw * 0.43)
    center_y = sy - int(sh * 0.62)

    shadow_offset = 3 * scale
    marker_draw.ellipse(
        (
            sx - radius + shadow_offset,
            center_y - radius + shadow_offset,
            sx + radius + shadow_offset,
            center_y + radius + shadow_offset,
        ),
        fill=(62, 22, 22, int(54 * alpha)),
    )
    marker_draw.polygon(
        [
            (sx - int(radius * 0.70) + shadow_offset, center_y + int(radius * 0.44) + shadow_offset),
            (sx + shadow_offset, sy + shadow_offset),
            (sx + int(radius * 0.70) + shadow_offset, center_y + int(radius * 0.44) + shadow_offset),
        ],
        fill=(62, 22, 22, int(54 * alpha)),
    )

    marker_draw.polygon(
        [
            (sx - int(radius * 0.74), center_y + int(radius * 0.40)),
            (sx, sy),
            (sx + int(radius * 0.74), center_y + int(radius * 0.40)),
        ],
        fill=(185, 28, 28, int(255 * alpha)),
        outline=(255, 255, 255, int(230 * alpha)),
    )
    marker_draw.ellipse(
        (sx - radius, center_y - radius, sx + radius, center_y + radius),
        fill=(220, 38, 38, int(255 * alpha)),
        outline=(255, 255, 255, int(238 * alpha)),
        width=2 * scale,
    )
    marker_draw.ellipse(
        (
            sx - int(radius * 0.34),
            center_y - int(radius * 0.34),
            sx + int(radius * 0.34),
            center_y + int(radius * 0.34),
        ),
        fill=(255, 255, 255, int(245 * alpha)),
    )

    marker = marker.resize(base.size, Image.Resampling.LANCZOS)
    layer = Image.alpha_composite(layer, marker)

    return Image.alpha_composite(base, layer)


def draw_globe_grid(draw, camera, alpha):
    for lat in range(-60, 75, 15):
        points = projected_path(
            [(lon, lat) for lon in range(-180, 181, 3)],
            camera,
        )

        if len(points) > 2:
            draw.line(points, fill=(255, 255, 255, int(54 * alpha)), width=1)

    for lon in range(-180, 181, 20):
        points = projected_path(
            [(lon, lat) for lat in range(-80, 81, 3)],
            camera,
        )

        if len(points) > 2:
            draw.line(points, fill=(255, 255, 255, int(48 * alpha)), width=1)


def draw_boundary(draw, boundary, camera, fill, outline=None, width=2, min_visible_ratio=0.18):
    paths = []

    for ring in boundary["rings"]:
        path = projected_ring(ring, camera, min_visible_ratio)

        if path is None:
            continue

        draw.polygon(path, fill=fill)

        if outline:
            draw.line(path + [path[0]], fill=outline, width=width, joint="curve")

        paths.append(path)

    return paths


def draw_boundaries(draw, boundaries, camera, fill, outline=None, width=1, min_visible_ratio=0.18):
    for boundary in boundaries:
        draw_boundary(
            draw,
            boundary,
            camera,
            fill,
            outline,
            width,
            min_visible_ratio,
        )


def draw_globe(base, p):
    camera = camera_state(p)
    radius = camera["radius"]
    cx = camera["cx"]
    cy = camera["cy"]

    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer, "RGBA")

    bbox = (cx - radius, cy - radius, cx + radius, cy + radius)
    draw.ellipse(
        bbox,
        fill=(118, 191, 210, 220),
        outline=(255, 255, 255, 116),
        width=max(2, int(radius * 0.008)),
    )

    shade = Image.new("RGBA", base.size, (0, 0, 0, 0))
    shade_draw = ImageDraw.Draw(shade, "RGBA")
    shade_draw.ellipse(
        (cx - radius * 1.02, cy - radius * 1.02, cx + radius * 1.02, cy + radius * 1.02),
        outline=(255, 255, 255, 90),
        width=max(2, int(radius * 0.018)),
    )
    shade_draw.ellipse(
        (cx - radius * 0.82, cy - radius * 0.96, cx + radius * 1.18, cy + radius * 1.02),
        fill=(255, 255, 255, 20),
    )
    layer = Image.alpha_composite(layer, shade)
    draw = ImageDraw.Draw(layer, "RGBA")

    draw_globe_grid(draw, camera, 1.0)

    draw_boundaries(
        draw,
        COUNTRIES,
        camera,
        LAND,
        COUNTRY_OUTLINE,
        max(1, int(radius * 0.0018)),
        min_visible_ratio=0.08,
    )

    india_alpha = smoothstep((p - 0.25) / 0.23)
    if india_alpha > 0.02:
        draw_boundary(
            draw,
            INDIA,
            camera,
            color_with_alpha(INDIA_FILL, india_alpha),
            color_with_alpha(INDIA_OUTLINE, india_alpha),
            max(2, int(radius * 0.0038)),
            min_visible_ratio=0.08,
        )

    state_alpha = smoothstep((p - 0.43) / 0.24)
    if state_alpha > 0.02:
        for state in STATES:
            if state["name"] == "Uttar Pradesh":
                continue

            draw_boundary(
                draw,
                state,
                camera,
                (76, 171, 101, int(50 * state_alpha)),
                color_with_alpha(STATE_OUTLINE, state_alpha),
                max(1, int(radius * 0.0018)),
                min_visible_ratio=0.04,
            )

    up_alpha = smoothstep((p - 0.52) / 0.22)
    if up_alpha > 0.02:
        draw_boundary(
            draw,
            UTTAR_PRADESH,
            camera,
            color_with_alpha(UP_FILL, up_alpha),
            color_with_alpha(UP_OUTLINE, up_alpha),
            max(2, int(radius * 0.0038)),
            min_visible_ratio=0.04,
        )

        up_point = project_point(UP_LON, UP_LAT, camera)

        if up_point:
            ux, uy, _ = up_point
            pulse = 1.0 + 0.12 * math.sin(p * math.tau * 3)

            for r, alpha in [(54 * pulse, 58), (30, 98), (10, 184)]:
                draw.ellipse(
                    (ux - r, uy - r, ux + r, uy + r),
                    outline=(3, 105, 73, int(alpha * up_alpha)),
                    width=2,
                )

            draw.ellipse(
                (ux - 5, uy - 5, ux + 5, uy + 5),
                fill=(2, 103, 72, int(235 * up_alpha)),
                outline=(255, 255, 255, int(250 * up_alpha)),
                width=2,
            )

    orbit_alpha = 1.0 - smoothstep((p - 0.72) / 0.22) * 0.62
    draw.arc(
        (cx - radius * 1.15, cy - radius * 0.74, cx + radius * 1.28, cy + radius * 0.88),
        start=198,
        end=343,
        fill=(9, 101, 85, int(70 * orbit_alpha)),
        width=2,
    )

    return Image.alpha_composite(base, layer)


def add_up_label(base, p):
    label_alpha = smoothstep((p - 0.60) / 0.18)

    if label_alpha <= 0.08:
        return base

    camera = camera_state(p)
    label_point = project_point(UP_LABEL_LON, UP_LABEL_LAT, camera)

    if not label_point:
        return base

    lx, ly, _ = label_point

    return draw_map_pin_label(
        base,
        (lx, ly),
        "Uttar Pradesh",
        min(1.0, label_alpha),
    )


def add_readability_veil(base):
    yy, xx = np.mgrid[0:HEIGHT, 0:WIDTH].astype(np.float32)
    left_alpha = np.clip(1.0 - xx / (WIDTH * 0.58), 0, 1) ** 1.55 * 144
    top_alpha = np.clip(1.0 - yy / (HEIGHT * 0.18), 0, 1) ** 1.7 * 56
    bottom_alpha = np.clip((yy - HEIGHT * 0.70) / (HEIGHT * 0.30), 0, 1) ** 1.2 * 88
    veil_alpha = np.clip(left_alpha + top_alpha + bottom_alpha, 0, 168).astype(np.uint8)
    veil = np.zeros((HEIGHT, WIDTH, 4), dtype=np.uint8)
    veil[..., 0] = 250
    veil[..., 1] = 254
    veil[..., 2] = 251
    veil[..., 3] = veil_alpha

    return Image.alpha_composite(base, Image.fromarray(veil, "RGBA"))


def make_frame(index):
    p = index / max(1, FRAMES - 1)
    base = make_gradient()
    draw = ImageDraw.Draw(base, "RGBA")

    for i in range(5):
        alpha = 16 - i * 2
        draw.ellipse(
            (
                WIDTH * 0.58 - i * 72,
                HEIGHT * 0.08 + i * 36,
                WIDTH * 1.18 + i * 60,
                HEIGHT * 1.02 + i * 70,
            ),
            outline=(255, 255, 255, alpha),
            width=2,
        )

    base = draw_globe(base, p)
    base = add_readability_veil(base)
    base = add_up_label(base, p)

    return np.asarray(base.convert("RGB"))


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    writer = imageio.get_writer(
        VIDEO_PATH,
        fps=FPS,
        codec="libx264",
        quality=8,
        ffmpeg_params=["-pix_fmt", "yuv420p", "-movflags", "+faststart"],
    )

    poster_frame = int(FRAMES * 0.82)
    poster = None

    for frame_index in range(FRAMES):
        frame = make_frame(frame_index)
        writer.append_data(frame)

        if frame_index == poster_frame:
            poster = Image.fromarray(frame)

        if frame_index % FPS == 0:
            print(f"rendered {frame_index // FPS:02d}s / {DURATION}s")

    writer.close()

    if poster is None:
        poster = Image.fromarray(make_frame(poster_frame))

    poster.save(POSTER_PATH, optimize=True)

    print(f"wrote {VIDEO_PATH.relative_to(ROOT)}")
    print(f"wrote {POSTER_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
