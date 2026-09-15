#!/usr/bin/env python3
"""Rebuild the sponsor logos in the footer.

Sources are the files ADW was sent by each sponsor, plus — for the handful who
never sent one, or sent only EPS we can't open — a crop of that logo from the
printed A2 program, which is the tier list's authority anyway.

Every logo is flattened to one monochrome PNG: black ink on transparency, no
colour, no white box. The footer then reads as a single set rather than 42
brands competing. Sizes in sponsors.json are computed for equal optical area,
so a roundel and a long wordmark carry the same weight.

Run from the repo root:   python3 scripts/build-sponsors.py
Needs: Pillow, pdftoppm (poppler), and Chrome for the SVG sources.
"""
import os
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)

# The logo pack as supplied, outside the repo.
L = os.path.expanduser("~/Dropbox/01_active/every*where/2026/03_LOGOS/")
# Sources we had to derive once — EPS-only sponsors cropped from the printed
# program, SVG sources rasterised through Chrome, one logo pulled out of an
# email. Kept in the repo so this script can be re-run without redoing that.
W = HERE + "/sponsor-sources/"

# Tier membership follows the printed A2 program, which is the published record.
TIERS = [
 ("Platinum", [
   ("2049",                 L+"01_Platinum/01_2049/2049_logo.png"),
   ("Print Logistics",      W+"rasterised/print-logistics.png"),
 ]),
 ("Gold", [
   ("Rockethouse",          L+"02_Gold/02_Rockethouse/Artboard 1@2x.png"),
   ("Gentle Folk Wines",    L+"02_Gold/01_Gentle Folk Wine/Gentle Folk Logo 2.png"),
   ("Stone Ambassador",     L+"02_Gold/04_Stone Ambassador/Stone Ambassador logo 2024 BLACK - PNG.png"),
   ("Signorino Woodcut",    W+"poster/signorino-woodcut.png"),
 ]),
 ("Silver", [
   ("Bankston",             L+"03_Silver/01_Bankston Architectural/Bankston_Logo_Black.png"),
   ("Company Works",        L+"04_Bronze/04_Company Works/CompanyWorks_Logo.png"),
   ("Delinquente Wine Co",  W+"poster/delinquente-wine-co.png"),
   ("Estilo",               W+"rasterised/estilo.png"),
   ("Jardan",               L+"03_Silver/03_Jardan/Jardan_Logo.pdf"),
   ("Littlehampton",        W+"rasterised/littlehampton.png"),
   ("New Age Veneers",      L+"03_Silver/05_New Age Veneers/Image.png"),
   ("The Queens Theatre",   W+"rasterised/the-queens.png"),
   ("Tumbled",              L+"03_Silver/07_Tumbled/Tumbled_Primary Logo Black.jpg"),
   ("Remington Matters",    L+"05_In-Kind/11_Remington Matters/rem00-logo-2.pdf"),
   ("Ukiyo House",          L+"05_In-Kind/01_Ukiyo House/Ukiyo-Logo-RGB-Transparent.png"),
   ("Union Magazine",       L+"03_Silver/09_Union Magazine/UNION magazine.png"),
 ]),
 ("Bronze", [
   ("Baukultur",            L+"04_Bronze/01_Baukultur/Baukultur.png"),
   ("Caroma",               L+"04_Bronze/02_Caroma/CAROMA_LOGO_POSITIVE_RGB.png"),
   ("CDK Stone",            W+"poster/cdk-stone.png"),
   ("City of Adelaide",     W+"rasterised/city-of-adelaide.png"),
   ("Curated by Tom",       W+"poster/curated-by-tom.png"),
   ("Daniel Emma",          W+"poster/daniel-emma.png"),
   ("Design by WBL",        L+"04_Bronze/07_Design by WBL/PNG/DESIGN-BY-WBL_LOGO_BLACK.png"),
   ("Future Urban",         L+"04_Bronze/08_Future Urban/FutureUrban Logo_Black_White Background.pdf"),
   ("Insight Lighting",     L+"04_Bronze/09_Insight Lighting/insight-RGB-Colour-POS-300dpi.png"),
   ("Honeydripper",         W+"rasterised/honeydripper.png"),
   ("JamFactory",           W+"poster/jamfactory.png"),
   ("Place Journal",        L+"04_Bronze/10_Place Journal/PlaceLogo_Black.png"),
   ("Piteo",                L+"04_Bronze/11_Piteo/PITEO_LockupA.png"),
   ("RF Lux",               W+"rasterised/rf-lux.png"),
   ("Stylecraft",           L+"04_Bronze/12_Stylecraft/Stylecraft Logo - Magenta.png"),
   ("Urban Habitats",       L+"04_Bronze/13_Urban Habitats/UHurbanhabitats_Hor_Black.png"),
   ("Walter Brooke",        L+"04_Bronze/14_Walter Brooke/WBA LOGO stacked + services.pdf"),
 ]),
 ("Donations", [
   ("AMPA Wines",           L+"05_In-Kind/13_Ampa Wines/Ampa Wines.png"),
   ("AGSA",                 L+"05_In-Kind/02_AGSA/AGSA_Primary_Black.png"),
   ("Cult",                 L+"05_In-Kind/04_Cult/CULT LOGO.png"),
   ("Guildhouse",           W+"poster/guildhouse.png"),
   ("JamFactory",           W+"poster/jamfactory.png"),
   ("Etikette Candles",     W+"rasterised/etikette.png"),
   ("Little Bang Brewing Co", W+"poster/little-bang-brewing-co.png"),
   ("Pundi",                L+"05_In-Kind/10_Pundi/Pundi Logo - SCREEN - Mono Black.png"),
   ("Table Wines",          W+"rasterised/table-wines.png"),
 ]),
]

import os, sys, json, subprocess, tempfile
from PIL import Image
Image.MAX_IMAGE_PIXELS = None

OUT = os.path.join(REPO, "src/assets/images/sponsors")
os.makedirs(OUT, exist_ok=True)
MAX_H, MAX_W = 240, 900

def slug(name):
    return "".join(c.lower() if c.isalnum() else "-" for c in name).strip("-").replace("--","-")

def load(path):
    if path.lower().endswith(".pdf"):
        d = tempfile.mkdtemp()
        subprocess.run(["pdftoppm","-png","-r","150","-f","1","-l","1",path,d+"/p"],check=True)
        f = sorted(os.listdir(d))[0]
        return Image.open(os.path.join(d,f)).convert("RGBA")
    return Image.open(path).convert("RGBA")

def monochrome(im):
    # A logo supplied as white-on-transparent (for use on dark) carries its
    # shape in the alpha channel, and flattening it onto white would erase it.
    # Take the alpha as the ink instead, which turns it black.
    if im.mode == "RGBA":
        a = im.getchannel("A")
        vis = [v for v in a.getdata() if v > 8]
        if vis and len(vis) < a.size[0] * a.size[1] * 0.98:
            rgb = im.convert("RGB")
            lum = [sum(px) / 3 for px, av in zip(rgb.getdata(), a.getdata()) if av > 128]
            if lum and sum(lum) / len(lum) > 190:
                out = Image.new("RGBA", im.size, (0,0,0,255))
                out.putalpha(a)
                return out.crop(out.getbbox() or (0,0,*im.size))

    white = Image.new("RGBA", im.size, (255,255,255,255))
    flat = Image.alpha_composite(white, im).convert("L")
    px = list(flat.getdata())
    paper = max(sorted(px)[int(len(px)*0.97)], 200)   # what counts as background here
    # Anything meaningfully darker than the paper is ink, at full strength: a
    # brand's pale gold rule has to survive the trip to monochrome as well as
    # its black wordmark does. Only the last stretch before paper is ramped,
    # which is where the antialiasing lives.
    knee = paper - max(28, int((paper - 30) * 0.28))
    def a(v):
        if v <= knee: return 255
        if v >= paper: return 0
        return int(255 * (paper - v) / max(paper - knee, 1))
    alpha = flat.point(a)
    out = Image.new("RGBA", im.size, (0,0,0,255))
    out.putalpha(alpha)
    return out.crop(out.getbbox() or (0,0,*im.size))

# Logos are set to equal optical area rather than equal height: a roundel and a
# long wordmark both end up carrying the same visual weight, which height alone
# never manages. Clamped so nothing runs away in either direction.
AREA = {"Platinum": 6400, "Gold": 4800, "Silver": 3500, "Bronze": 2700, "Donations": 2300}
CLAMP = {"Platinum": (62, 250), "Gold": (52, 210), "Silver": (44, 180),
         "Bronze": (38, 155), "Donations": (34, 145)}

def display_size(w, h, tier):
    import math
    a = AREA[tier]; hmax, wmax = CLAMP[tier]
    dh = math.sqrt(a * h / w); dw = a / dh
    if dh > hmax: dh, dw = hmax, hmax * w / h
    if dw > wmax: dw, dh = wmax, wmax * h / w
    return int(round(dw)), int(round(dh))

rows = []
for tier, items in TIERS:
    entries = []
    for name, src in items:
        im = monochrome(load(src))
        w,h = im.size
        s = min(MAX_H/h, MAX_W/w, 1)
        if s < 1: im = im.resize((max(1,int(w*s)), max(1,int(h*s))), Image.LANCZOS)
        f = slug(name) + ".png"
        im.save(os.path.join(OUT, f), optimize=True)
        dw, dh = display_size(im.size[0], im.size[1], tier)
        entries.append({"name": name, "file": f, "w": im.size[0], "h": im.size[1],
                        "dw": dw, "dh": dh})
        print(f"{tier:10} {name:24} {im.size[0]:4}x{im.size[1]:<4} {os.path.basename(src)[:40]}")
    rows.append({"tier": tier, "sponsors": entries})

json.dump(rows, open(os.path.join(REPO, "src/_data/sponsors.json"), "w"), indent=2)
print("\nwrote sponsors.json —", sum(len(r['sponsors']) for r in rows), "logos")
