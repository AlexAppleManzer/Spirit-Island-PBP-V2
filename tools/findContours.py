#!/usr/bin/env python3
import cv2
import numpy as np
import json
from pathlib import Path
import sys


def regions_to_lands(top_regions, scale, orig_width, orig_height, epsilon_factor):
    """Convert a list of (mask_u8, size) pairs into the lands dict + stageDimensions."""
    stage_width = 800
    stage_height = int(round(stage_width * orig_height / orig_width))
    sx = stage_width / orig_width
    sy = stage_height / orig_height
    lands = {}

    for idx, (region_mask, size) in enumerate(top_regions):
        land_id = idx + 1
        contours, _ = cv2.findContours(region_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            continue
        contour = max(contours, key=cv2.contourArea)
        eps = epsilon_factor * cv2.arcLength(contour, True)
        poly = cv2.approxPolyDP(contour, eps, True)

        pts = [{"x": int(p[0][0] * scale * sx), "y": int(p[0][1] * scale * sy)} for p in poly]
        if pts:
            xs, ys = [p["x"] for p in pts], [p["y"] for p in pts]
            bbox = {"x": min(xs), "y": min(ys), "width": max(xs)-min(xs), "height": max(ys)-min(ys)}
            lands[str(land_id)] = {"polygon": pts, "bounds": bbox}
            print(f"Land {land_id}: {size} px -> {len(pts)} pts  bounds=({bbox['x']},{bbox['y']},{bbox['width']},{bbox['height']})")

    return lands, {"width": stage_width, "height": stage_height}


def render_preview(top_regions, orig_width, orig_height, img_orig, output_preview):
    colors = [
        (255, 107, 107), (78, 205, 196), (69, 183, 209),
        (255, 160, 122), (152, 216, 200), (247, 220, 111),
        (187, 143, 206), (133, 193, 226), (248, 177, 149),
    ]
    preview = img_orig.copy()
    for idx, (region_mask, _) in enumerate(top_regions):
        if idx >= len(colors):
            break
        upscaled = cv2.resize(region_mask, (orig_width, orig_height))
        cnts, _ = cv2.findContours(upscaled, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if cnts:
            cv2.drawContours(preview, cnts, -1, colors[idx], 20)
    disp = cv2.resize(preview, (600, int(600 * orig_height / orig_width)))
    cv2.imwrite(output_preview, disp)
    print(f"[OK] Preview: {output_preview}")


def save_asset(lands, stage_dims, output_json):
    asset = {"version": "1.0", "boardImage": "board.png", "stageDimensions": stage_dims, "lands": lands}
    Path(output_json).parent.mkdir(parents=True, exist_ok=True)
    with open(output_json, "w") as f:
        json.dump(asset, f, indent=2)
    print(f"[OK] Saved: {output_json}")


# ── Mode 1: threshold ────────────────────────────────────────────────────────

def find_lands(image_path, output_json, output_preview,
               threshold=105, min_size=50, blur=0, scale=2, epsilon_factor=0.005):
    img = cv2.imread(image_path)
    if img is None:
        print("Error: Could not read image"); sys.exit(1)
    oh, ow = img.shape[:2]
    print(f"Image: {ow}x{oh}")

    if scale <= 1:
        scale, img_s = 1, img
    else:
        img_s = cv2.resize(img, (ow // scale, oh // scale))
    print(f"Analyzing: {img_s.shape[1]}x{img_s.shape[0]}\n")

    gray = cv2.cvtColor(img_s, cv2.COLOR_BGR2GRAY)
    b, g, r = cv2.split(img_s)
    gm = (g > (r + 20)) & (g > (b + 20))
    gf = gray.astype(float)
    gf[gm] = np.minimum(gf[gm] * 1.3, 255)
    gray = gf.astype(np.uint8)

    if blur > 0:
        k = blur if blur % 2 == 1 else blur + 1
        gray = cv2.GaussianBlur(gray, (k, k), 0)

    _, mask = cv2.threshold(gray, threshold, 255, cv2.THRESH_BINARY)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE,
                            cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)), iterations=1)

    num_lbl, lbl_map = cv2.connectedComponents(mask)
    print(f"Found {num_lbl - 1} potential regions")

    sized = sorted(
        [(lbl, int(np.sum(lbl_map == lbl))) for lbl in range(1, num_lbl)
         if np.sum(lbl_map == lbl) > min_size],
        key=lambda x: x[1], reverse=True
    )
    print(f"Valid: {len(sized)}  Taking top 9...\n")

    top = [((lbl_map == lbl).astype(np.uint8) * 255, sz) for lbl, sz in sized[:9]]

    lands, dims = regions_to_lands(top, scale, ow, oh, epsilon_factor)
    render_preview(top, ow, oh, img, output_preview)
    save_asset(lands, dims, output_json)


# ── Mode 2: color ────────────────────────────────────────────────────────────

def find_lands_by_color(image_path, output_json, output_preview,
                        min_size=50, scale=2, epsilon_factor=0.005,
                        black_threshold=30, sep_dilation=1):
    img = cv2.imread(image_path)
    if img is None:
        print("Error: Could not read image"); sys.exit(1)
    oh, ow = img.shape[:2]
    print(f"Image: {ow}x{oh}")

    if scale <= 1:
        scale, img_s = 1, img
    else:
        img_s = cv2.resize(img, (ow // scale, oh // scale))
    print(f"Analyzing: {img_s.shape[1]}x{img_s.shape[0]}\n")

    hsv = cv2.cvtColor(img_s, cv2.COLOR_BGR2HSV)
    h, s, v = cv2.split(hsv)

    black = v < black_threshold
    # Brown separator: warm hue, solid saturation, mid-dark value
    brown_raw = (h <= 22) & (s > 80) & (v > 40) & (v < 170)
    # Dilate the brown separator so it forms a solid barrier even between
    # adjacent same-colored lands (e.g. two touching mountain regions).
    # Use sep_dilation > 1 for boards with adjacent same-colored lands whose
    # separator is narrow (e.g. Board F adjacent jungles).
    brown_u8 = brown_raw.astype(np.uint8) * 255
    sep_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    brown_dilated = cv2.dilate(brown_u8, sep_kernel, iterations=sep_dilation) > 0
    excl = black | brown_dilated

    # Hue groups that cover Spirit Island land colors.
    # Gray and blue require v >= 70 to exclude dark separator lines that aren't caught
    # by brown detection (e.g. adjacent mountains on Board E, adjacent wetlands on Board B).
    classes = {
        "green":  (h > 28)  & (h < 90)  & (s >= 40) & ~excl,
        "blue":   (h >= 90) & (h <= 150) & (s >= 40) & (v >= 70) & ~excl,
        "orange": (h >= 5)  & (h <= 28)  & (s >= 60) & ~excl,
        "gray":   (s < 50)  & (v >= 70)  & ~excl,
    }

    # Small close bridges single-pixel texture gaps within a land.
    # Kept at 3x3 — the dilated brown barrier above is already 5px wide,
    # so closing by 1px won't re-merge adjacent same-colored lands.
    # Gray, blue, and green are NOT closed: adjacent same-colored lands may share a
    # thin dark separator that the close operation would bridge, merging two distinct
    # lands into one (e.g. Board F has two adjacent jungle/green lands).
    close_k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    no_close = {"gray", "blue", "green"}

    all_regions = []
    for name, cls_mask in classes.items():
        m = cls_mask.astype(np.uint8) * 255
        if name not in no_close:
            m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, close_k, iterations=1)
        num_lbl, lbl_map = cv2.connectedComponents(m)
        comps = [(lbl, int(np.sum(lbl_map == lbl))) for lbl in range(1, num_lbl)]
        valid = [(lbl, sz) for lbl, sz in comps if sz >= min_size]
        print(f"  {name}: {num_lbl-1} components, {len(valid)} >= {min_size}px")
        for lbl, sz in valid:
            region = (lbl_map == lbl).astype(np.uint8) * 255
            all_regions.append((region, sz))

    all_regions.sort(key=lambda x: x[1], reverse=True)
    print(f"\nTotal valid regions: {len(all_regions)}  Taking top 9...\n")

    top = all_regions[:9]

    lands, dims = regions_to_lands(top, scale, ow, oh, epsilon_factor)
    render_preview(top, ow, oh, img, output_preview)
    save_asset(lands, dims, output_json)


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("nickname", nargs="?", default="A")
    p.add_argument("--mode", choices=["threshold", "color"], default="threshold")
    p.add_argument("--threshold", type=int, default=105)
    p.add_argument("--min-size", type=int, default=50)
    p.add_argument("--blur", type=int, default=0)
    p.add_argument("--scale", type=int, default=2)
    p.add_argument("--epsilon", type=float, default=0.005)
    p.add_argument("--black-threshold", type=int, default=30,
                   help="HSV value below which a pixel is treated as black/separator (color mode)")
    p.add_argument("--sep-dilation", type=int, default=1,
                   help="Brown-separator dilation iterations; raise for narrow separators (color mode)")
    args = p.parse_args()

    script_dir = Path(__file__).parent
    img_path   = script_dir / f"../Assets/Boards/Board {args.nickname}.png"
    out_json   = script_dir / f"../Assets/Boards/Board {args.nickname}/landBounds.json"
    out_prev   = script_dir / f"../Assets/Boards/Board {args.nickname}/preview.png"

    if args.mode == "color":
        find_lands_by_color(str(img_path), str(out_json), str(out_prev),
                            min_size=args.min_size, scale=args.scale, epsilon_factor=args.epsilon,
                            black_threshold=args.black_threshold, sep_dilation=args.sep_dilation)
    else:
        find_lands(str(img_path), str(out_json), str(out_prev),
                   threshold=args.threshold, min_size=args.min_size, blur=args.blur,
                   scale=args.scale, epsilon_factor=args.epsilon)
