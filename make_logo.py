from PIL import Image, ImageDraw

def generate_watermark(filename="logo.png"):
    width, height = 320, 90
    image = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    
    # Draw a semi-transparent dark rounded badge background
    draw.rounded_rectangle([0, 0, width, height], radius=12, fill=(11, 12, 16, 200))
    draw.rounded_rectangle([0, 0, width, height], radius=12, outline=(102, 252, 241, 255), width=2)
    
    # Add brand text
    draw.text((20, 22), "R3DPR1NT STUDIO", fill=(255, 255, 255, 255))
    draw.text((20, 48), "// CHANNEL 420 LIVE", fill=(102, 252, 241, 255))
    
    image.save(filename, "PNG")
    print(f"[SUCCESS] Generated transparent watermark: {filename}")

if __name__ == "__main__":
    generate_watermark()
