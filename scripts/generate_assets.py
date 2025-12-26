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

ICON_SOURCE_PATH = "/Users/wleitner/Downloads/Gemini_Generated_Image_u6lsy9u6lsy9u6ls.png"
WORDMARK_SOURCE_PATH = "/Users/wleitner/Downloads/Gemini_Generated_Image_s25ymws25ymws25y.png"
OUTPUT_DIR = "/Users/wleitner/Code/moti-do/frontend/public"


def remove_background(img, use_rembg=True):
    global HAS_REMBG
    # 2. Remove Background
    if HAS_REMBG and use_rembg:
        print("Removing background using rembg...")
        try:
            return remove(img)
        except Exception as e:
            print(f"rembg failed: {e}. Falling back to color keying.")
            HAS_REMBG = False
    
    if not HAS_REMBG or not use_rembg:
        print("Removing background using simple color keying (fallback)...")
        # Sample the top-left pixel to determine background color
        bg_color = img.getpixel((0, 0))
        print(f"Detected background color: {bg_color}")
        
        datas = img.getdata()
        newData = []
        tolerance = 180 # Increased to 130 to remove anti-aliasing halos
        
        for item in datas:
            # Check if pixel matches background within tolerance
            if (abs(item[0] - bg_color[0]) < tolerance and
                abs(item[1] - bg_color[1]) < tolerance and
                abs(item[2] - bg_color[2]) < tolerance):
                newData.append((255, 255, 255, 0))
            else:
                newData.append(item)
        img.putdata(newData)
        return img

def process_single_image(source_path, outputs):
    """
    source_path: path to input image
    outputs: list of tuples (filename, resize_dimensions) OR 'favicon'
    """
    if not os.path.exists(source_path):
        print(f"Error: Source image not found at {source_path}")
        return

    print(f"Processing {source_path}...")
    img = Image.open(source_path).convert("RGBA")
    img = remove_background(img)

    for output_def in outputs:
        if output_def == 'favicon':
            print("Generating favicon.ico...")
            icon_sizes = [(48, 48), (32, 32), (16, 16)]
            img.save(os.path.join(OUTPUT_DIR, "favicon.ico"), format='ICO', sizes=icon_sizes)
        else:
            filename, size = output_def
            print(f"Generating {filename}...")
            # Resize
            resized_img = img.resize(size, Image.Resampling.LANCZOS)
            resize_path = os.path.join(OUTPUT_DIR, filename)
            resized_img.save(resize_path)

def main():
    global HAS_REMBG
    
    # Process Icons
    icon_outputs = [
        ("pwa-192x192.png", (192, 192)),
        ("pwa-512x512.png", (512, 512)),
        ("apple-touch-icon.png", (180, 180)),
        ("logo-large.png", (512, 512)), # Square logo for login (standard size)
        'favicon'
    ]
    process_single_image(ICON_SOURCE_PATH, icon_outputs)

    # Process Wordmark
    # We want a landscape logo for headers. 
    # Let's say max height 128px, width proportional? 
    # Or just save a high-res version and let CSS handle scaling.
    # We'll save a high-res version. original is usually adequate.
    # But let's verify dimensions. The generation is rarely square for wordmarks.
    # We will just remove bg and save as logo-wordmark.png (original size)
    
    if os.path.exists(WORDMARK_SOURCE_PATH):
        print(f"Processing Wordmark {WORDMARK_SOURCE_PATH}...")
        wm_img = Image.open(WORDMARK_SOURCE_PATH).convert("RGBA")
        # FORCE fallback for wordmark to be aggressive
        wm_img = remove_background(wm_img, use_rembg=False)
        print("Generating logo-wordmark.png...")
        wm_img.save(os.path.join(OUTPUT_DIR, "logo-wordmark.png"))

if __name__ == "__main__":
    main()
