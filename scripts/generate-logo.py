"""
True Self Me — logo generator.

Builds the logo as pure vector SVG (all text converted to outlined paths
from the site's own build fonts, so nothing depends on installed fonts),
in two colour variants (ink for light backgrounds, white for dark) and
three lockups (stacked / horizontal / emblem only).

Emblem concept: an OPEN terracotta ring (the self still becoming) holding
a COMPLETE forest ring (the true self, whole), with a gold four-point
sparkle breaking the gap — echoing the hand-drawn sparkles on the site.

Run:  python scripts/generate-logo.py
Out:  public/images/logo/*.svg
"""

import math
import os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.varLib.instancer import instantiateVariableFont

# ---------------------------------------------------------------- palette
TERRACOTTA = "#bc5b34"   # brand accent (globals.css --color-terracotta)
FOREST = "#3b4634"       # inner ring (--color-forest)
GOLD = "#b38200"         # sparkle (--color-gold)
INK = "#262118"          # wordmark on light bg (--color-ink)
INK_SOFT = "#6b6354"     # tagline on light bg (--color-ink-soft)
CREAM = "#f7f1e6"        # wordmark/tagline on dark bg (--color-cream)

MEDIA = ".next/static/media"
OUT = "public/images/logo"
os.makedirs(OUT, exist_ok=True)


# ---------------------------------------------------------------- fonts
def pick_font(family_prefixes, text, wght):
    """Pick the woff2 subset that covers `text`, instance to wght, return font."""
    cands = []
    for f in sorted(os.listdir(MEDIA)):
        if not f.endswith(".woff2"):
            continue
        path = os.path.join(MEDIA, f)
        try:
            ft = TTFont(path)
            name = ft["name"].getDebugName(1) or ""
            if any(name.startswith(p) for p in family_prefixes):
                cmap = ft.getBestCmap()
                if all(ord(ch) in cmap for ch in text if ch != " "):
                    cands.append(ft)
        except Exception:
            continue
    if not cands:
        raise SystemExit(f"no font subset covers {text!r}")
    font = cands[0]
    if "fvar" in font:
        instantiateVariableFont(font, {"wght": wght}, inplace=True)
    return font


def text_paths(font, text, size, tracking_em=0.0):
    """Return (svg_g_element, width, cap_height) for `text` as outlined paths."""
    upm = font["head"].unitsPerEm
    scale = size / upm
    cmap = font.getBestCmap()
    hmtx = font["hmtx"]
    glyf_set = font.getGlyphSet()
    tracking = tracking_em * size

    x = 0.0
    parts = []
    for ch in text:
        if ch == " ":
            x += 0.36 * size + tracking
            continue
        gname = cmap[ord(ch)]
        pen = SVGPathPen(glyf_set)
        glyf_set[gname].draw(pen)
        d = pen.getCommands()
        if d:
            parts.append(
                f'<path transform="translate({x:.2f} 0) scale({scale:.6f} {-scale:.6f})" d="{d}"/>'
            )
        x += hmtx[gname][0] * scale + tracking
    width = x - tracking if text else 0.0  # drop trailing tracking
    cap = (font["OS/2"].sCapHeight or 700) * scale
    g = f'<g fill="__FILL__">{"".join(parts)}</g>'
    return g, width, cap


# ---------------------------------------------------------------- emblem
def emblem(cx, cy, r):
    """Open ring + complete inner ring + sparkle, centred on (cx, cy)."""
    stroke_o = r * 0.101
    gap_half = math.radians(24.0)  # 48° gap centred at upper-right (-45°)
    ring_r = r - stroke_o / 2

    def pt(angle):
        return (cx + ring_r * math.cos(angle), cy + ring_r * math.sin(angle))

    a_start = math.radians(-45) + gap_half   # -21°
    a_end = math.radians(-45) - gap_half     # -69°
    x1, y1 = pt(a_start)
    x2, y2 = pt(a_end)
    outer = (
        f'M {x1:.2f} {y1:.2f} A {ring_r:.2f} {ring_r:.2f} 0 1 1 {x2:.2f} {y2:.2f}'
    )

    stroke_i = r * 0.062
    inner_r = r * 0.585

    # sparkle: four-point star at the gap, on the ring
    sx, sy = cx + ring_r * math.cos(math.radians(-45)), cy + ring_r * math.sin(
        math.radians(-45)
    )
    tip, waist = r * 0.300, r * 0.052
    sparkle = (
        f"M {sx:.2f} {sy - tip:.2f} "
        f"C {sx + waist:.2f} {sy - waist:.2f} {sx + waist:.2f} {sy - waist:.2f} {sx + tip:.2f} {sy:.2f} "
        f"C {sx + waist:.2f} {sy + waist:.2f} {sx + waist:.2f} {sy + waist:.2f} {sx:.2f} {sy + tip:.2f} "
        f"C {sx - waist:.2f} {sy + waist:.2f} {sx - waist:.2f} {sy + waist:.2f} {sx - tip:.2f} {sy:.2f} "
        f"C {sx - waist:.2f} {sy - waist:.2f} {sx - waist:.2f} {sy - waist:.2f} {sx:.2f} {sy - tip:.2f} Z"
    )

    return (
        f'<path d="{outer}" fill="none" stroke="{TERRACOTTA}" '
        f'stroke-width="{stroke_o:.2f}" stroke-linecap="round"/>'
        f'<circle cx="{cx:.2f}" cy="{cy:.2f}" r="{inner_r:.2f}" fill="none" '
        f'stroke="{FOREST}" stroke-width="{stroke_i:.2f}"/>'
        f'<path d="{sparkle}" fill="{GOLD}"/>'
    )


# ---------------------------------------------------------------- lockups
WORD = "TRUE SELF ME"
TAG = "THERAPY & COUNSELING"


def build_variants():
    fraunces = pick_font(("Fraunces",), WORD, 600)
    dm = pick_font(("DM Sans",), TAG, 500)

    def wordmark(fill_main, fill_me):
        # auto-fit: keep the wordmark within 1360 units at 1600 canvas
        size = 210
        _, w1, _ = text_paths(fraunces, "TRUE SELF", size, 0.055)
        _, w2, _ = text_paths(fraunces, "ME", size, 0.055)
        space = 0.36 * size + 0.055 * size
        total = w1 + space + w2
        if total > 1360:
            size *= 1360 / total
            _, w1, _ = text_paths(fraunces, "TRUE SELF", size, 0.055)
            _, w2, _ = text_paths(fraunces, "ME", size, 0.055)
            space = 0.36 * size + 0.055 * size
            total = w1 + space + w2
        g1, _, _ = text_paths(fraunces, "TRUE SELF", size, 0.055)
        g2, _, _ = text_paths(fraunces, "ME", size, 0.055)
        inner1 = g1[len('<g fill="__FILL__">') : -len("</g>")]
        inner2 = g2[len('<g fill="__FILL__">') : -len("</g>")]
        svg = (
            f'<g fill="{fill_main}">{inner1}</g>'
            f'<g transform="translate({w1 + space:.2f} 0)" fill="{fill_me}">{inner2}</g>'
        )
        return svg, total, size

    def tagline(fill):
        g, w, cap = text_paths(dm, TAG, 60, 0.42)
        inner = g[len('<g fill="__FILL__">') : -len("</g>")]
        return f'<g fill="{fill}">{inner}</g>', w, cap

    variants = {
        "": (INK, TERRACOTTA, INK_SOFT),          # ink variant
        "-white": (CREAM, TERRACOTTA, "rgba(247,241,230,0.72)"),
    }

    for suffix, (c_word, c_me, c_tag) in variants.items():
        wm, wm_w, wm_size = wordmark(c_word, c_me)
        wm_cap = (fraunces["OS/2"].sCapHeight or 700) * (wm_size / fraunces["head"].unitsPerEm)
        tg, tg_w, tg_cap = tagline(c_tag)

        # ---- stacked: emblem on top, centred wordmark, tagline
        W = 1600
        emblem_r = 470
        top = 60
        y_emblem_c = top + emblem_r
        y_word_base = y_emblem_c + emblem_r + 150 + wm_cap
        y_tag_base = y_word_base + 118
        H = int(y_tag_base + 90)
        stacked = (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}">'
            f"{emblem(W / 2, y_emblem_c, emblem_r)}"
            f'<g transform="translate({(W - wm_w) / 2:.2f} {y_word_base:.2f})">{wm}</g>'
            f'<g transform="translate({(W - tg_w) / 2:.2f} {y_tag_base:.2f})">{tg}</g>'
            "</svg>"
        )
        open(f"{OUT}/logo-stacked{suffix}.svg", "w").write(stacked)

        # ---- horizontal: emblem left, wordmark + tagline right,
        #      canvas hugged to actual content width
        Hh = 800
        r_h = 320
        x_emblem_c = 80 + r_h
        y_em_c = Hh / 2
        scale_w, scale_t = min(1.0, 170 / wm_size), 44 / 60
        x_text = 80 + 2 * r_h + 110
        text_w = max(wm_w * scale_w, tg_w * scale_t)
        Wh = int(x_text + text_w + 80)
        y_w_base = Hh / 2 - 26 + wm_cap * scale_w
        y_t_base = y_w_base + 96
        horizontal = (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {Wh} {Hh}">'
            f"{emblem(x_emblem_c, y_em_c, r_h)}"
            f'<g transform="translate({x_text} {y_w_base:.2f}) scale({scale_w:.4f})">{wm}</g>'
            f'<g transform="translate({x_text + 2} {y_t_base:.2f}) scale({scale_t:.4f})">{tg}</g>'
            "</svg>"
        )
        open(f"{OUT}/logo-horizontal{suffix}.svg", "w").write(horizontal)

        # ---- emblem only
        emblem_only = (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">'
            f"{emblem(500, 500, 470)}</svg>"
        )
        open(f"{OUT}/logo-emblem.svg", "w").write(emblem_only)

    print("SVGs written to", OUT)


if __name__ == "__main__":
    build_variants()
