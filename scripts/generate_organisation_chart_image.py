from pathlib import Path
from textwrap import wrap

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "organisation-chart.jpg"

COLORS = {
    "bg": "#f4f9fc",
    "card": "#ffffff",
    "ink": "#102f46",
    "muted": "#64748b",
    "green": "#0f6f42",
    "green_dark": "#0a4a2f",
    "blue": "#0b6fa4",
    "amber": "#ff9933",
    "border": "#d8e5ed",
    "line": "#b8c8d4",
    "soft_green": "#eaf7ef",
    "soft_blue": "#e9f5fb",
    "soft_amber": "#fff4e6",
}


def font(size, bold=False):
    candidates = [
        Path("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"),
        Path("C:/Windows/Fonts/calibrib.ttf" if bold else "C:/Windows/Fonts/calibri.ttf"),
        Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
    ]

    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size=size)

    return ImageFont.load_default()


FONTS = {
    "title": font(58, True),
    "h1": font(42, True),
    "h2": font(30, True),
    "h3": font(24, True),
    "body": font(22),
    "body_bold": font(22, True),
    "small": font(18),
    "small_bold": font(18, True),
    "tiny_bold": font(15, True),
}


def text_size(draw, text, font_obj):
    box = draw.textbbox((0, 0), text, font=font_obj)
    return box[2] - box[0], box[3] - box[1]


def wrap_text(draw, text, font_obj, max_width):
    words = text.split()
    lines = []
    current = ""

    for word in words:
        proposed = f"{current} {word}".strip()
        if text_size(draw, proposed, font_obj)[0] <= max_width:
            current = proposed
        else:
            if current:
                lines.append(current)
            current = word

    if current:
        lines.append(current)

    return lines


def draw_wrapped(draw, xy, text, font_obj, fill, max_width, line_gap=7, align="left"):
    x, y = xy
    lines = wrap_text(draw, text, font_obj, max_width)

    for line in lines:
        line_width, line_height = text_size(draw, line, font_obj)
        line_x = x
        if align == "center":
            line_x = x + (max_width - line_width) / 2
        draw.text((line_x, y), line, fill=fill, font=font_obj)
        y += line_height + line_gap

    return y


def rounded(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def image_path(relative):
    return ROOT / relative


def load_avatar(path, size):
    if not path:
        return None

    source = Path(path)
    if not source.is_absolute():
        source = ROOT / path

    if not source.exists():
        return None

    image = Image.open(source).convert("RGB")
    image = ImageOps.fit(image, (size, size), method=Image.Resampling.LANCZOS, centering=(0.5, 0.28))

    mask = Image.new("L", (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle((0, 0, size, size), radius=18, fill=255)

    framed = Image.new("RGB", (size, size), "white")
    framed.paste(image, (0, 0), mask)
    return framed


def initials(name):
    for prefix in ["Dr.", "Mr.", "Shri", "Sri", "Smt.", "Shree"]:
        name = name.replace(prefix, "")
    parts = [part for part in name.replace("/", " ").split() if part]
    return "".join(part[0] for part in parts[:2]).upper()


def paste_avatar(canvas, draw, x, y, name, path, size=96, fallback_fill=COLORS["soft_green"], fallback_text=COLORS["green"]):
    rounded(draw, (x - 4, y - 4, x + size + 4, y + size + 4), 22, "#ffffff", "#ffffff", 1)
    avatar = load_avatar(path, size)

    if avatar:
        canvas.paste(avatar, (x, y))
        return

    rounded(draw, (x, y, x + size, y + size), 18, fallback_fill, None)
    label = initials(name)
    label_width, label_height = text_size(draw, label, FONTS["h3"])
    draw.text((x + (size - label_width) / 2, y + (size - label_height) / 2), label, fill=fallback_text, font=FONTS["h3"])


leadership = [
    {
        "role": "President, General Body",
        "name": "Shri Yogi Adityanath",
        "detail": "Hon'ble Chief Minister, Uttar Pradesh",
        "tag": "Ex-officio",
        "color": COLORS["green"],
        "image": "src/assets/images/cm.png",
    },
    {
        "role": "Vice President, General Body",
        "name": "Shri Anil Kumar",
        "detail": "Hon'ble Minister, Department of Science & Technology, U.P.",
        "tag": "Ex-officio",
        "color": COLORS["blue"],
        "image": "public/officials/anil-kumar.jpg",
    },
    {
        "role": "Vice President, General Body",
        "name": "Shri Ajit Singh Pal",
        "detail": "Minister of State, Department of Science & Technology, U.P.",
        "tag": "Ex-officio",
        "color": COLORS["blue"],
        "image": "public/officials/ajit-singh-pal.jpg",
    },
    {
        "role": "Chairman, Governing Body / Principal Secretary",
        "name": "Shri Pandhari Yadav",
        "detail": "Governing Body, RSAC-UP; Department of Science & Technology, Government of U.P.",
        "tag": "Leadership & Administration",
        "color": COLORS["amber"],
        "image": "public/officials/pandhari-yadav.jpeg",
    },
]

director = {
    "role": "Director",
    "name": "Shree Ramesh Chandra",
    "detail": "IAS, Special Secretary, S&T; Member Secretary, General Body & Governing Body, RSAC-UP",
    "tag": "Executive leadership",
    "image": "public/officials/ramesh-chandra.jpeg",
}

divisions = [
    ("Agriculture Resource Division", "Shri Narendra Kumar", "Scientist-SE", "public/scientists/narendra-kumar.jpg"),
    ("Computer Image Processing Division", "Shri Sushil Chandra", "Scientist-SF", "public/scientists/sushil-chandra.jpg"),
    ("Earth Resource Division", "Dr. A. Uniyal", "Scientist-SE", "public/scientists/aniruddha-uniyal.jpg"),
    ("Forest Resources & Ecology Division", "Dr. Anil Kumar", "Scientist-SE", "public/scientists/anil-kumar.jpg"),
    ("Geo-Spatial Data Division", "Dr. P.P.S. Yadav", "Scientist-SD", "public/scientists/pushpendra-yadav.jpg"),
    ("Ground Water Resource Division", "Shri Arjun Singh", "Scientist-SD", "public/scientists/arjun-singh.jpg"),
    ("Landuse and Urban Survey Division", "Mr. Alok Saini", "Scientist-SC", "public/scientists/alok-saini.jpg"),
    ("School of Geo-Informatics", "Dr. Sudhakar Shukla", "Scientist-SE", "public/scientists/sudhakar-shukla.jpg"),
    ("Soil Resource Division", "Dr. M. S. Yadav", "Scientist-SE", "public/scientists/ms-yadav.jpg"),
    ("Surface Water Resource Division", "Shri S.K.S. Yadav", "Scientist-SE", "public/scientists/sks-yadav.jpg"),
    ("Training Division", "Shri Amit Sinha", "Scientist-SE", "public/scientists/amit-sinha.jpg"),
]

support = [
    ("Administration", "Smt. Sweta Pal / Shri Daya Shankar", "Administrative Officer", ""),
    ("Technical Secretary to Director", "Dr. A. Uniyal", "Additional Charge", "public/scientists/aniruddha-uniyal.jpg"),
    ("Accounts", "Shri Ravi Prakash Singh", "Account Officer, Additional Charge", ""),
]


def leadership_card(canvas, draw, node, box):
    x1, y1, x2, y2 = box
    rounded(draw, box, 22, COLORS["card"], COLORS["border"], 2)
    draw.rounded_rectangle((x1, y1, x2, y1 + 10), radius=5, fill=node["color"])
    paste_avatar(canvas, draw, x1 + 26, y1 + 34, node["name"], node["image"], 104)
    tx = x1 + 150
    draw_wrapped(draw, (tx, y1 + 32), node["role"].upper(), FONTS["tiny_bold"], node["color"], x2 - tx - 24, 5)
    y = draw_wrapped(draw, (tx, y1 + 88), node["name"], FONTS["h3"], COLORS["ink"], x2 - tx - 24, 6)
    y = draw_wrapped(draw, (tx, y + 8), node["detail"], FONTS["small"], COLORS["muted"], x2 - tx - 24, 5)
    rounded(draw, (tx, y + 14, tx + 255, y + 48), 8, "#eef2f6")
    draw.text((tx + 13, y + 22), node["tag"].upper(), fill=COLORS["muted"], font=FONTS["tiny_bold"])


def unit_card(canvas, draw, unit, box, support_card=False):
    title, name, designation, image = unit
    x1, y1, x2, y2 = box
    color = COLORS["blue"] if support_card else COLORS["green"]
    rounded(draw, box, 20, COLORS["card"], COLORS["border"], 2)
    paste_avatar(
        canvas,
        draw,
        x1 + 22,
        y1 + 28,
        name,
        image,
        86,
        fallback_fill=COLORS["soft_blue"] if support_card else COLORS["soft_green"],
        fallback_text=color,
    )
    tx = x1 + 126
    draw.rounded_rectangle((tx, y1 + 30, tx + 58, y1 + 38), radius=4, fill=color)
    y = draw_wrapped(draw, (tx, y1 + 54), title, FONTS["small_bold"], COLORS["ink"], x2 - tx - 24, 5)
    y = draw_wrapped(draw, (tx, y + 15), name, FONTS["small_bold"], "#334155", x2 - tx - 24, 5)
    suffix = "" if support_card else " (Head)"
    draw_wrapped(draw, (tx, y + 8), f"{designation}{suffix}", FONTS["small"], COLORS["muted"], x2 - tx - 24, 5)


def level_heading(draw, x, y, level, title, description=None, max_width=1280):
    draw.text((x, y), level.upper(), fill=COLORS["blue"], font=FONTS["tiny_bold"])
    draw.text((x, y + 38), title, fill=COLORS["ink"], font=FONTS["h2"])
    if description:
        return draw_wrapped(draw, (x, y + 86), description, FONTS["small"], COLORS["muted"], max_width, 5)
    return y + 78


def main():
    width, height = 2200, 2720
    image = Image.new("RGB", (width, height), COLORS["bg"])
    draw = ImageDraw.Draw(image)

    for x in range(0, width, 84):
        draw.line((x, 0, x, height), fill="#edf4f7", width=1)
    for y in range(0, height, 84):
        draw.line((0, y, width, y), fill="#edf4f7", width=1)

    draw.rectangle((0, 0, width * 0.33, 14), fill=COLORS["amber"])
    draw.rectangle((width * 0.33, 0, width * 0.66, 14), fill="#ffffff")
    draw.rectangle((width * 0.66, 0, width, 14), fill="#138808")

    draw.text((120, 92), "RSAC-UP", fill=COLORS["blue"], font=FONTS["tiny_bold"])
    draw.text((120, 128), "Organisational Chart", fill=COLORS["ink"], font=FONTS["title"])
    draw_wrapped(
        draw,
        (120, 210),
        "Remote Sensing Applications Centre, Uttar Pradesh - governance, executive leadership, scientific divisions, and support functions.",
        FONTS["body"],
        COLORS["muted"],
        1460,
        8,
    )

    rounded(draw, (720, 340, 1480, 520), 28, "#f8fbfd", COLORS["border"], 2)
    draw.text((815, 385), "Remote Sensing Applications Centre", fill=COLORS["ink"], font=FONTS["h2"])
    draw.text((955, 435), "Uttar Pradesh", fill=COLORS["green"], font=FONTS["h2"])

    card_w, card_h = 560, 260
    left_x, center_x, right_x = 120, 820, 1600
    top_y = 340

    leadership_card(image, draw, leadership[0], (left_x, top_y, left_x + card_w, top_y + card_h))
    leadership_card(image, draw, leadership[1], (right_x, top_y, right_x + card_w, top_y + card_h))

    draw.line((left_x + card_w, 430, 650, 430), fill=COLORS["line"], width=4)
    draw.line((1480, 430, right_x, 430), fill=COLORS["line"], width=4)
    draw.line((1100, 520, 1100, 900), fill=COLORS["line"], width=4)
    draw.line((left_x + card_w / 2, top_y + card_h, left_x + card_w / 2, 690), fill=COLORS["line"], width=4)
    draw.line((right_x + card_w / 2, top_y + card_h, right_x + card_w / 2, 690), fill=COLORS["line"], width=4)

    second_y = 690
    leadership_card(image, draw, leadership[3], (left_x, second_y, left_x + card_w, second_y + card_h))
    leadership_card(image, draw, leadership[2], (right_x, second_y, right_x + card_w, second_y + card_h))

    draw.line((left_x + card_w / 2, second_y + card_h, left_x + card_w / 2, 1040), fill=COLORS["line"], width=4)
    draw.line((right_x + card_w / 2, second_y + card_h, right_x + card_w / 2, 1040), fill=COLORS["line"], width=4)
    draw.line((left_x + card_w / 2, 1040, 1100, 1040), fill=COLORS["line"], width=4)
    draw.line((1100, 1040, right_x + card_w / 2, 1040), fill=COLORS["line"], width=4)

    draw.text((120, 1018), "EXECUTIVE", fill=COLORS["blue"], font=FONTS["tiny_bold"])
    draw.text((120, 1056), "Director and Member Secretary", fill=COLORS["ink"], font=FONTS["h2"])

    director_y = 1115
    rounded(draw, (520, director_y, 1680, director_y + 215), 26, COLORS["green"], COLORS["green"], 2)
    paste_avatar(image, draw, 570, director_y + 50, director["name"], director["image"], 116, fallback_fill="#2d8a5b", fallback_text="#ffffff")
    draw.text((730, director_y + 40), director["tag"].upper(), fill="#bde7cd", font=FONTS["tiny_bold"])
    draw.text((730, director_y + 80), director["name"], fill="#ffffff", font=FONTS["h1"])
    draw.text((730, director_y + 133), director["role"], fill="#e8fff1", font=FONTS["body_bold"])
    draw_wrapped(draw, (730, director_y + 170), director["detail"], FONTS["small"], "#d9f5e4", 850, 5)

    draw.line((1100, director_y + 215, 1100, 1430), fill=COLORS["line"], width=4)

    draw.text((120, 1410), "SCIENTIFIC WING", fill=COLORS["blue"], font=FONTS["tiny_bold"])
    draw.text((120, 1450), "Divisions and Heads", fill=COLORS["ink"], font=FONTS["h2"])
    draw.text((1780, 1462), "11 divisions", fill=COLORS["muted"], font=FONTS["small_bold"])

    unit_w, unit_h = 470, 185
    unit_gap_x, unit_gap_y = 34, 34
    x0, y0 = 152, 1525
    for index, unit in enumerate(divisions):
        row, col = divmod(index, 4)
        x = x0 + col * (unit_w + unit_gap_x)
        yy = y0 + row * (unit_h + unit_gap_y)
        unit_card(image, draw, unit, (x, yy, x + unit_w, yy + unit_h))

    support_y = y0 + 3 * (unit_h + unit_gap_y) + 55
    draw.text((120, support_y), "SUPPORT FUNCTIONS", fill=COLORS["blue"], font=FONTS["tiny_bold"])
    draw.text((120, support_y + 40), "Administration, Technical and Accounts", fill=COLORS["ink"], font=FONTS["h2"])

    support_card_w = 620
    for index, unit in enumerate(support):
        x = 120 + index * (support_card_w + 50)
        unit_card(image, draw, unit, (x, support_y + 115, x + support_card_w, support_y + 300), support_card=True)

    footer = "Designed frontend chart based on RSAC-UP organisational structure. Official source remains linked from the website page."
    draw_wrapped(draw, (120, height - 120), footer, FONTS["small"], COLORS["muted"], 1700, 6)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    image.save(OUTPUT, "JPEG", quality=94, optimize=True, progressive=True)
    print(f"Generated {OUTPUT}")


if __name__ == "__main__":
    main()
