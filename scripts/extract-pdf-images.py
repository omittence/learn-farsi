"""
Extract story page images from a picture book PDF.
Rasterizes pages 3-18 (0-indexed: 2-17) at 2x resolution.

Usage:
    python3 scripts/extract-pdf-images.py <pdf_path> <output_dir>

Example:
    python3 scripts/extract-pdf-images.py 16845_1752497736.pdf public/stories/bear-fishing
"""

import fitz  # PyMuPDF
import os
import sys


def extract(pdf_path: str, out_dir: str) -> None:
    os.makedirs(out_dir, exist_ok=True)
    doc = fitz.open(pdf_path)
    # Pages 3-18 of the PDF are story pages (0-indexed: 2-17)
    story_pages = range(2, 18)
    for i, page_idx in enumerate(story_pages):
        page = doc[page_idx]
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
        out_path = os.path.join(out_dir, f"page-{i + 1:02d}.jpg")
        pix.save(out_path)
        print(f"  Saved {out_path}")
    print(f"\nDone. {len(story_pages)} images written to {out_dir}/")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python3 scripts/extract-pdf-images.py <pdf_path> <output_dir>")
        sys.exit(1)
    extract(sys.argv[1], sys.argv[2])
