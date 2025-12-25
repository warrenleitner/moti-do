import os
import subprocess
import sys

from PIL import Image

# Ensure Pillow is installed
try:
    from PIL import Image, ImageOps
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow"])
    from PIL import Image, ImageOps

# Try importing rembg for high quality background removal
try:
    from rembg import remove

    HAS_REMBG = True
except ImportError:
    HAS_REMBG = False
    print("rembg not found. For best results: pip install rembg[cli]")

SOURCE_IMAGE_PATH = (
    "/Users/wleitner/Downloads/Gemini_Generated_Image_33qmt533qmt533qm.png"
)
OUTPUT_DIR = "/Users/wleitner/Code/moti-do/frontend/public"


def process_image():
    global HAS_REMBG
    if not os.path.exists(SOURCE_IMAGE_PATH):
        print(f"Error: Source image not found at {SOURCE_IMAGE_PATH}")
        return

    print(f"Processing {SOURCE_IMAGE_PATH}...")

    # 1. Load Image
    img = Image.open(SOURCE_IMAGE_PATH).convert("RGBA")

    # 2. Remove Background
    if HAS_REMBG:
        print("Removing background using rembg...")
        try:
            img = remove(img)
        except Exception as e:
            print(f"rembg failed: {e}. Falling back to color keying.")
            HAS_REMBG = False

    if not HAS_REMBG:
        print("Removing background using simple color keying (fallback)...")
        # Sample the top-left pixel to determine background color
        bg_color = img.getpixel((0, 0))
        print(f"Detected background color: {bg_color}")

        datas = img.getdata()
        newData = []
        tolerance = 30  # Adjustable tolerance

        for item in datas:
            # Check if pixel matches background within tolerance
            if (
                abs(item[0] - bg_color[0]) < tolerance
                and abs(item[1] - bg_color[1]) < tolerance
                and abs(item[2] - bg_color[2]) < tolerance
            ):
                newData.append((255, 255, 255, 0))
            else:
                newData.append(item)
        img.putdata(newData)

    # 3. Save PWA Icons
    sizes = [
        ("pwa-192x192.png", (192, 192)),
        ("pwa-512x512.png", (512, 512)),
        ("apple-touch-icon.png", (180, 180)),
        ("logo-large.png", (1024, 1024)),  # For login page
    ]

    for filename, size in sizes:
        print(f"Generating {filename}...")
        # High quality resize
        resized = img.resize(size, Image.Resampling.LANCZOS)
        resized.save(os.path.join(OUTPUT_DIR, filename))

    # 4. Save Favicon.ico
    print("Generating favicon.ico...")
    # Create the multiple sizes for ico
    # 48, 32, 16
    icon_sizes = [(48, 48), (32, 32), (16, 16)]
    img.save(os.path.join(OUTPUT_DIR, "favicon.ico"), format="ICO", sizes=icon_sizes)

    print("Done!")


if __name__ == "__main__":
    process_image()
