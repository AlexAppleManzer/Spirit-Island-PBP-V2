#!/usr/bin/env python3
import cv2
import numpy as np
import json
from pathlib import Path
import sys

def find_lands(image_path, output_json, output_preview):
    """Find land regions using OpenCV connected components."""
    
    img = cv2.imread(image_path)
    if img is None:
        print(f"Error: Could not read image")
        sys.exit(1)
    
    orig_height, orig_width = img.shape[:2]
    print(f"Image: {orig_width}x{orig_height}")
    
    # Scale down less to preserve thin line detail
    scale = 2
    scaled_width = orig_width // scale
    scaled_height = orig_height // scale
    img_scaled = cv2.resize(img, (scaled_width, scaled_height))
    print(f"Analyzing: {scaled_width}x{scaled_height}\n")
    
    # Convert to grayscale for thresholding
    gray = cv2.cvtColor(img_scaled, cv2.COLOR_BGR2GRAY)
        # Detect and lighten green pixels before thresholding
    # Green has high G channel relative to R and B
    b, g, r = cv2.split(img_scaled)
    green_mask = (g > (r + 20)) & (g > (b + 20))  # Pixels that are notably green
    
    # Lighten the green areas
    gray_lightened = gray.copy().astype(float)
    gray_lightened[green_mask] = np.minimum(gray_lightened[green_mask] * 1.3, 255)
    gray = gray_lightened.astype(np.uint8)
        # Threshold for dark pixels (the black separator lines)
    # Dark greens start around 77, so threshold needs to be just below that
    _, mask = cv2.threshold(gray, 105, 255, cv2.THRESH_BINARY)
    
    # Minimal cleanup - just fill gaps in the separator lines
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=1)
    
    # Save post-processed mask preview for debugging
    mask_preview_path = str(Path(output_preview).parent / "mask_preview.png")
    cv2.imwrite(mask_preview_path, mask)
    print(f"[DEBUG] Mask preview: {mask_preview_path}\n")
    
    # Find connected components
    num_labels, labels = cv2.connectedComponents(mask)
    
    print(f"Found {num_labels - 1} potential regions\n")
    
    # Find region sizes and filter
    region_sizes = {}
    for label in range(1, num_labels):
        size = np.sum(labels == label)
        if size > 50:  # Lower minimum to capture smaller regions
            region_sizes[label] = size
    
    sorted_regions = sorted(region_sizes.items(), key=lambda x: x[1], reverse=True)
    print(f"Valid regions: {len(sorted_regions)}")
    print(f"Taking top 9...\n")
    
    top_regions = sorted_regions[:9]
    
    stage_width = 800
    stage_height = int(round(stage_width * orig_height / orig_width))
    scale_x = stage_width / orig_width
    scale_y = stage_height / orig_height
    
    lands = {}
    
    for idx, (label, size) in enumerate(top_regions):
        land_id = idx + 1
        
        region_mask = (labels == label).astype(np.uint8) * 255
        contours, _ = cv2.findContours(region_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if not contours:
            continue
        
        contour = max(contours, key=cv2.contourArea)
        epsilon = 0.005 * cv2.arcLength(contour, True)
        polygon = cv2.approxPolyDP(contour, epsilon, True)
        
        stage_points = []
        for point in polygon:
            x = int(point[0][0] * scale * scale_x)
            y = int(point[0][1] * scale * scale_y)
            stage_points.append({"x": x, "y": y})
        
        if len(stage_points) > 0:
            xs = [p["x"] for p in stage_points]
            ys = [p["y"] for p in stage_points]
            bbox = {
                "x": min(xs),
                "y": min(ys),
                "width": max(xs) - min(xs),
                "height": max(ys) - min(ys),
            }
            
            lands[str(land_id)] = {
                "polygon": stage_points,
                "bounds": bbox,
            }
            
            print(f"Land {land_id}: {size} pixels -> {len(stage_points)} points")
            print(f"  Bounds: x={bbox['x']}, y={bbox['y']}, w={bbox['width']}, h={bbox['height']}")
    
    print()
    
    asset = {
        "version": "1.0",
        "boardImage": "board.png",
        "stageDimensions": {"width": stage_width, "height": stage_height},
        "lands": lands,
    }
    
    Path(output_json).parent.mkdir(parents=True, exist_ok=True)
    with open(output_json, "w") as f:
        json.dump(asset, f, indent=2)
    
    print(f"[OK] Saved: {output_json}\n")
    
    preview_colors = [
        (255, 107, 107), (78, 205, 196), (69, 183, 209),
        (255, 160, 122), (152, 216, 200), (247, 220, 111),
        (187, 143, 206), (133, 193, 226), (248, 177, 149),
    ]
    
    # Draw preview on the original (full resolution) image
    preview_img = img.copy()
    for idx, (label, _) in enumerate(top_regions):
        if idx >= len(preview_colors):
            break
        color = preview_colors[idx]
        # Scale the region mask back to original resolution for drawing
        region_mask = (labels == label).astype(np.uint8) * 255
        region_mask_scaled = cv2.resize(region_mask, (orig_width, orig_height))
        contours, _ = cv2.findContours(region_mask_scaled, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if contours:
            cv2.drawContours(preview_img, contours, -1, color, 20)
    
    # Resize for display
    preview_display = cv2.resize(preview_img, (600, int(600 * orig_height / orig_width)))
    cv2.imwrite(output_preview, preview_display)
    print(f"[OK] Preview: {output_preview}")

if __name__ == "__main__":
    script_dir = Path(__file__).parent
    board_image = script_dir / "../Assets/Boards/Board A.png"
    output_json = script_dir / "../Assets/Boards/landBounds.json"
    output_preview = script_dir / "../Assets/Boards/preview.png"
    
    find_lands(str(board_image), str(output_json), str(output_preview))
