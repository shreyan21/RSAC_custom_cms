from pathlib import Path

import imageio.v2 as imageio
import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont


SOURCE_DIR = Path("D:/earth_background/footage")
VIDEO_PATH = Path("src/assets/videos/rsac-earth-studio-up.mp4")
POSTER_PATH = Path("src/assets/images/hero-videos/rsac-earth-studio-up-poster.png")

FPS = 25
MARKER_START_FRAME = 410
MARKER_FULL_FRAME = 450
MARKER_HOLD_FRAME = 500
MARKER_SIZE = 72
LABEL_TEXT = "Uttar Pradesh"
EYEBROW_TEXT = "STATE"


def ease_out_cubic(value):
    value = max(0.0, min(1.0, value))
    return 1 - pow(1 - value, 3)


def load_font(name, size):
    candidates = [
        Path("C:/Windows/Fonts") / name,
        Path("C:/Windows/Fonts/segoeui.ttf"),
        Path("C:/Windows/Fonts/arial.ttf"),
    ]

    for path in candidates:
        if path.exists():
            return ImageFont.truetype(str(path), size)

    return ImageFont.load_default()


TITLE_FONT = load_font("segoeuib.ttf", 34)
EYEBROW_FONT = load_font("segoeuisb.ttf", 13)


def interpolate_position(index):
    keyframes = [
        (410, (1518, 628)),
        (450, (1266, 625)),
        (470, (1118, 630)),
        (500, (958, 642)),
    ]

    if index <= keyframes[0][0]:
        return keyframes[0][1]

    for (left_frame, left_pos), (right_frame, right_pos) in zip(keyframes, keyframes[1:]):
        if index <= right_frame:
            progress = (index - left_frame) / (right_frame - left_frame)
            eased = ease_out_cubic(progress)
            x = left_pos[0] + (right_pos[0] - left_pos[0]) * eased
            y = left_pos[1] + (right_pos[1] - left_pos[1]) * eased
            return int(x), int(y)

    return keyframes[-1][1]


def color_grade(frame):
    frame = ImageEnhance.Color(frame).enhance(1.06)
    frame = ImageEnhance.Contrast(frame).enhance(1.035)
    frame = ImageEnhance.Sharpness(frame).enhance(1.05)
    return frame


def make_marker(size, alpha):
    scale = 4
    canvas = Image.new("RGBA", (size * scale, size * scale + 18 * scale), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    cx = canvas.width // 2
    radius = int(size * scale * 0.34)
    cy = int(size * scale * 0.34)
    tip_y = int(size * scale * 0.91)

    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.ellipse(
        (cx - radius + 6 * scale, cy - radius + 9 * scale, cx + radius + 6 * scale, cy + radius + 9 * scale),
        fill=(0, 0, 0, int(95 * alpha)),
    )
    shadow_draw.polygon(
        [
            (cx - int(radius * 0.66) + 6 * scale, cy + int(radius * 0.52) + 9 * scale),
            (cx + int(radius * 0.66) + 6 * scale, cy + int(radius * 0.52) + 9 * scale),
            (cx + 6 * scale, tip_y + 9 * scale),
        ],
        fill=(0, 0, 0, int(95 * alpha)),
    )
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(7 * scale)))

    fill = (196, 18, 37, int(255 * alpha))
    edge = (255, 188, 188, int(170 * alpha))
    draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=fill, outline=edge, width=2 * scale)
    draw.polygon(
        [
            (cx - int(radius * 0.66), cy + int(radius * 0.52)),
            (cx + int(radius * 0.66), cy + int(radius * 0.52)),
            (cx, tip_y),
        ],
        fill=fill,
    )
    draw.ellipse(
        (
            cx - int(radius * 0.34),
            cy - int(radius * 0.34),
            cx + int(radius * 0.34),
            cy + int(radius * 0.34),
        ),
        fill=(255, 255, 255, int(245 * alpha)),
    )
    draw.ellipse(
        (
            cx - int(radius * 0.16),
            cy - int(radius * 0.16),
            cx + int(radius * 0.16),
            cy + int(radius * 0.16),
        ),
        fill=(157, 10, 30, int(255 * alpha)),
    )

    return canvas.resize((size, size + 18), Image.Resampling.LANCZOS)


def make_label(alpha):
    padding_x = 22
    padding_y = 14
    title_box = ImageDraw.Draw(Image.new("RGBA", (1, 1))).textbbox((0, 0), LABEL_TEXT, font=TITLE_FONT)
    width = max(286, title_box[2] + padding_x * 2)
    height = 82
    panel = Image.new("RGBA", (width + 40, height + 34), (0, 0, 0, 0))
    shadow = Image.new("RGBA", panel.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    box = (20, 14, 20 + width, 14 + height)
    shadow_draw.rounded_rectangle(box, radius=14, fill=(0, 0, 0, int(80 * alpha)))
    panel.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(10)))

    draw = ImageDraw.Draw(panel)
    draw.rounded_rectangle(
        box,
        radius=14,
        fill=(255, 255, 255, int(214 * alpha)),
        outline=(255, 255, 255, int(160 * alpha)),
        width=1,
    )
    draw.rounded_rectangle(
        (20, 14, 26, 14 + height),
        radius=4,
        fill=(197, 18, 37, int(235 * alpha)),
    )
    draw.text((42, 28), EYEBROW_TEXT, font=EYEBROW_FONT, fill=(114, 18, 30, int(205 * alpha)))
    draw.text((42, 45), LABEL_TEXT, font=TITLE_FONT, fill=(18, 50, 74, int(248 * alpha)))

    return panel


def add_vignette(frame):
    width, height = frame.size
    mask = Image.new("L", (width, height), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((-220, -160, width + 220, height + 260), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(120))

    shade = Image.new("RGBA", (width, height), (9, 20, 34, 44))
    clear = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    vignette = Image.composite(clear, shade, mask)
    frame = frame.convert("RGBA")
    frame.alpha_composite(vignette)
    return frame.convert("RGB")


def compose_marker(frame, index):
    if index < MARKER_START_FRAME:
        return frame

    reveal = ease_out_cubic((index - MARKER_START_FRAME) / (MARKER_FULL_FRAME - MARKER_START_FRAME))
    marker_x, marker_y = interpolate_position(min(index, MARKER_HOLD_FRAME))

    marker = make_marker(MARKER_SIZE, reveal)
    label = make_label(reveal)

    overlay = Image.new("RGBA", frame.size, (0, 0, 0, 0))
    tip_x = marker_x
    tip_y = marker_y
    marker_left = tip_x - marker.width // 2
    marker_top = tip_y - int(marker.height * 0.88)
    overlay.alpha_composite(marker, (marker_left, marker_top))

    label_left = min(tip_x + 34, frame.width - label.width - 24)
    label_top = max(24, min(tip_y - 80, frame.height - label.height - 24))
    line_draw = ImageDraw.Draw(overlay)
    line_draw.line(
        [(tip_x + 15, tip_y - 42), (label_left + 20, label_top + 55)],
        fill=(255, 255, 255, int(170 * reveal)),
        width=2,
    )
    overlay.alpha_composite(label, (label_left, label_top))

    frame = frame.convert("RGBA")
    frame.alpha_composite(overlay)
    return frame.convert("RGB")


def render_frame(path, index):
    frame = Image.open(path).convert("RGB")
    frame = color_grade(frame)
    frame = compose_marker(frame, index)
    return add_vignette(frame)


def main():
    frames = sorted(SOURCE_DIR.glob("*.jpeg")) + sorted(SOURCE_DIR.glob("*.jpg")) + sorted(SOURCE_DIR.glob("*.png"))
    if not frames:
        raise FileNotFoundError(f"No image frames found in {SOURCE_DIR}")

    VIDEO_PATH.parent.mkdir(parents=True, exist_ok=True)
    POSTER_PATH.parent.mkdir(parents=True, exist_ok=True)

    writer = imageio.get_writer(
        VIDEO_PATH,
        fps=FPS,
        codec="libx264",
        quality=None,
        ffmpeg_params=[
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            "-preset",
            "medium",
            "-crf",
            "27",
        ],
        macro_block_size=1,
    )

    poster = None

    try:
        for index, path in enumerate(frames):
            frame = render_frame(path, index)
            if index == len(frames) - 1:
                poster = frame.copy()
            writer.append_data(np.asarray(frame))
            if index % 50 == 0:
                print(f"Rendered {index + 1}/{len(frames)} frames")
    finally:
        writer.close()

    if poster is None:
        poster = render_frame(frames[-1], len(frames) - 1)
    poster.save(POSTER_PATH, optimize=True)

    duration = len(frames) / FPS
    print(f"Wrote {VIDEO_PATH} ({len(frames)} frames, {duration:.2f}s)")
    print(f"Wrote {POSTER_PATH}")


if __name__ == "__main__":
    main()
