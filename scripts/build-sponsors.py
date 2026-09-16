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
   ("Delinquente Wine Co",  L+"03_Silver/02_Delinquente Wine Co/6. Logos/DLQ_1.png"),
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
   ("Curated by Tom",       L+"04_Bronze/05_Curated by Tom/Curated By Tom Logo [Black].eps"),
   ("Daniel Emma",          L+"04_Bronze/06_Daniel and Emma/Daniel Emma Horizontal Outlines.jpg"),
   ("Design by WBL",        L+"04_Bronze/07_Design by WBL/PNG/DESIGN-BY-WBL_LOGO_BLACK.png"),
   ("Future Urban",         L+"04_Bronze/08_Future Urban/FutureUrban Logo_Black_White Background.pdf"),
   ("Insight Lighting",     L+"04_Bronze/09_Insight Lighting/insight-RGB-Colour-POS-300dpi.png"),
   ("Honeydripper",         W+"rasterised/honeydripper.png"),
   ("JamFactory",           L+"05_In-Kind/08_Jam Factory/JamFactory_black.eps"),
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
   ("JamFactory",           L+"05_In-Kind/08_Jam Factory/JamFactory_black.eps"),
   ("Etikette Candles",     W+"rasterised/etikette.png"),
   ("Little Bang Brewing Co", L+"05_In-Kind/09_Little Bang Brewing/LBBC Logo Stacked Horizontal Black.eps"),
   ("Pundi",                L+"05_In-Kind/10_Pundi/Pundi Logo - SCREEN - Mono Black.png"),
   ("Table Wines",          W+"rasterised/table-wines.png"),
 ]),
]

import os, re, sys, json, subprocess, tempfile
from PIL import Image
Image.MAX_IMAGE_PIXELS = None

OUT = os.path.join(REPO, "src/assets/images/sponsors")
os.makedirs(OUT, exist_ok=True)
MAX_H, MAX_W = 240, 900

def slug(name):
    return "".join(c.lower() if c.isalnum() else "-" for c in name).strip("-").replace("--","-")

def load(path):
    # EPS is PostScript, which nothing on a stock Mac can read. Ghostscript
    # turns it into PDF and poppler takes it from there, so a sponsor who sends
    # EPS gets their real artwork rather than a crop of the printed program.
    #   brew install ghostscript
    if path.lower().endswith(".eps"):
        d = tempfile.mkdtemp()
        pdf = os.path.join(d, "logo.pdf")
        subprocess.run(["gs","-q","-dNOPAUSE","-dBATCH","-dSAFER","-dEPSCrop",
                        "-sDEVICE=pdfwrite","-sOutputFile=" + pdf, path], check=True)
        path = pdf
    if path.lower().endswith(".pdf"):
        d = tempfile.mkdtemp()
        # Pick the resolution from the page size so a small logo comes out at a
        # usable height and a big one doesn't blow up into hundreds of
        # megapixels — these range from an 80pt mark to a full A4 sheet.
        pts = 0
        info = subprocess.run(["pdfinfo", path], capture_output=True, text=True).stdout
        m = re.search(r"Page size:\s+[\d.]+ x ([\d.]+)", info)
        if m: pts = float(m.group(1))
        dpi = min(1200, max(72, int(43200 / pts))) if pts else 200
        subprocess.run(["pdftoppm","-png","-r",str(dpi),"-f","1","-l","1",path,d+"/p"],check=True)
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

# Homepages, each one checked against the page that actually answers. Verified
# 15 September 2026.
SITES = {
  "2049":                   "https://www.2049.art/",
  "Print Logistics":        "https://printlogistics.com.au/",
  "Rockethouse":            "https://www.rockethouse.com.au/",
  "Gentle Folk Wines":      "https://gentlefolk.com.au/",
  "Stone Ambassador":       "https://stoneambassador.com.au/",
  "Signorino Woodcut":      "https://signorino.com.au/",
  "Bankston":               "https://bankston.com/au/",
  "Company Works":          "https://www.companyworks.au/",
  "Delinquente Wine Co":    "https://delinquentewineco.com/",
  "Estilo":                 "https://estilo.au/",
  "Jardan":                 "https://www.jardan.com.au/",
  "Littlehampton":          "https://littlehamptonbrick.com.au/",
  "New Age Veneers":        "https://www.newageveneers.com.au/",
  "The Queens Theatre":     "https://www.thequeensadelaide.com.au/",
  "Tumbled":                "https://tumbled.com.au/",
  "Remington Matters":      "https://remingtonmatters.com/",
  "Ukiyo House":            "https://www.ukiyo.house/",
  "Union Magazine":         "https://unionmagazine.com/",
  "Baukultur":              "https://baukultur.com.au/",
  "Caroma":                 "https://www.caroma.com.au/",
  "CDK Stone":              "https://cdkstone.com.au/",
  "City of Adelaide":       "https://www.cityofadelaide.com.au/",
  "Curated by Tom":         "https://curatedbytom.com.au/",
  "Daniel Emma":            "https://www.daniel-emma.com/",
  "Design by WBL":          "https://designbywbl.com.au/",
  "Future Urban":           "https://futureurban.com.au/",
  "Insight Lighting":       "https://insightlighting.com.au/",
  "Honeydripper":           "https://www.honeydripper.com.au/",
  "JamFactory":             "https://www.jamfactory.com.au/",
  "Piteo":                  "https://piteoarchitects.com.au/",
  "Place Journal":          "https://www.placejournal.com.au/",
  "RF Lux":                 "https://www.rflux.au/",
  "Stylecraft":             "https://stylecraft.com.au/",
  "Urban Habitats":         "https://urbanhabitats.com.au/",
  "Walter Brooke":          "https://walterbrooke.com.au/",
  "AMPA Wines":             "https://www.ampawines.au/",
  "AGSA":                   "https://www.agsa.sa.gov.au/",
  "Cult":                   "https://cultdesign.com.au/",
  "Guildhouse":             "https://guildhouse.org.au/",
  "Little Bang Brewing Co": "https://www.littlebang.com.au/",
  "Pundi":                  "https://pundi.au/",
  "Table Wines":            "https://tablewines.com.au/",
  "Etikette Candles":       "https://etikette.com.au/",
}

# Logos are set to equal optical area rather than equal height: a roundel and a
# long wordmark both end up carrying the same visual weight, which height alone
# never manages. Clamped so nothing runs away in either direction.
AREA = {"Platinum": 6400, "Gold": 4800, "Silver": 3500, "Bronze": 2700, "Donations": 2300}
CLAMP = {"Platinum": (62, 250), "Gold": (52, 210), "Silver": (44, 180),
         "Bronze": (38, 155), "Donations": (34, 145)}
# Equal area alone punishes a long, thin wordmark: matching the area of a
# compact mark leaves it only a dozen pixels tall, and the letterforms are what
# carry it. So heights have a floor, and a very wide logo is allowed past the
# usual width in order to reach it.
HMIN = {"Platinum": 26, "Gold": 23, "Silver": 20, "Bronze": 18, "Donations": 16}
WIDE = 1.2

def display_size(w, h, tier):
    import math
    a = AREA[tier]; hmax, wmax = CLAMP[tier]; hmin = HMIN[tier]
    dh = math.sqrt(a * h / w); dw = a / dh
    if dh > hmax: dh, dw = hmax, hmax * w / h
    if dw > wmax: dw, dh = wmax, wmax * h / w
    if dh < hmin:
        dh, dw = hmin, hmin * w / h
        if dw > wmax * WIDE: dw, dh = wmax * WIDE, wmax * WIDE * h / w
    return int(round(dw)), int(round(dh))

# Sponsors supply logos cropped hard to the artwork, so at footer size the ink
# sits flush against its box and reads as if it had been shaved. Give every one
# the same transparent safe area, sized from its own height, and grow the
# display box to match so the ink itself stays exactly as large as before.
PAD = 0.12

def pad(im):
    p = max(2, int(round(im.size[1] * PAD)))
    out = Image.new("RGBA", (im.size[0] + 2*p, im.size[1] + 2*p), (0,0,0,0))
    out.paste(im, (p, p), im)
    return out, p

rows = []
for tier, items in TIERS:
    entries = []
    for name, src in items:
        im = monochrome(load(src))
        w,h = im.size
        s = min(MAX_H/h, MAX_W/w, 1)
        if s < 1: im = im.resize((max(1,int(w*s)), max(1,int(h*s))), Image.LANCZOS)
        # Size the display box from the ink alone, then widen it by the padding,
        # so the safe area never costs the logo any size.
        dw, dh = display_size(im.size[0], im.size[1], tier)
        ink_w, ink_h = im.size
        im, p = pad(im)
        dw = int(round(dw * im.size[0] / ink_w))
        dh = int(round(dh * im.size[1] / ink_h))
        f = slug(name) + ".png"
        im.save(os.path.join(OUT, f), optimize=True)
        entries.append({"name": name, "file": f, "w": im.size[0], "h": im.size[1],
                        "dw": dw, "dh": dh, "url": SITES.get(name)})
        print(f"{tier:10} {name:24} {im.size[0]:4}x{im.size[1]:<4} {os.path.basename(src)[:40]}")
    rows.append({"tier": tier, "sponsors": entries})

json.dump(rows, open(os.path.join(REPO, "src/_data/sponsors.json"), "w"), indent=2)
print("\nwrote sponsors.json —", sum(len(r['sponsors']) for r in rows), "logos")
