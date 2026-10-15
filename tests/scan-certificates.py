"""Optically verify QA PNGs: python scan-certificates.py /path/to/qa.
Requires Pillow and zxing-cpp. test-reference-preview.mjs produces the PNGs.
"""
from pathlib import Path
import sys
from PIL import Image
import zxingcpp
for design in ['academic','swiss','royal']:
    file=Path(sys.argv[1])/f'certificate-{design}.png'
    decoded=zxingcpp.read_barcodes(Image.open(file))
    assert len(decoded)==1 and '/cert-preview.20261015a/index.html?d=' in decoded[0].text, file
    print(f'PASS {design}: QR decodes from the actual certificate PNG')
