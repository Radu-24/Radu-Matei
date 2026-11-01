#!/usr/bin/env python3
"""Renders the link preview picture (site/assets/img/og.jpg, 1200 x 630) from og.html next to this file.

Social networks and chat apps show it when someone shares radumatei.ro (the og:image tag in index.html). It uses the
site's own fonts and the card still of the rover (site/assets/stills/card-1400.webp), so re-run it after bake_stills.py
if the rover changes. Needs the same packages as bake_stills.py (tools/requirements-stills.txt).

  python3 tools/og/render.py
"""
import pathlib
from PIL import Image
from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE.parent.parent / 'site' / 'assets' / 'img' / 'og.jpg'

with sync_playwright() as pw:
    br = pw.chromium.launch()
    page = br.new_page(viewport={'width': 1200, 'height': 630}, device_scale_factor=1)
    page.goto((HERE / 'og.html').as_uri())
    page.evaluate('document.fonts.ready')
    page.wait_for_timeout(500)
    png = HERE / 'og.png'
    page.screenshot(path=str(png))
    br.close()
Image.open(png).convert('RGB').save(OUT, quality=88, optimize=True, progressive=True)
png.unlink()
print(f'{OUT.relative_to(HERE.parent.parent)}: {OUT.stat().st_size // 1024} KB')
