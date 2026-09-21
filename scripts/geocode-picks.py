#!/usr/bin/env python3
"""Place the ADW picks on the map — writes src/_data/picks.json.

Reads the picks spreadsheet (the Google Sheet if one is configured in
site.json as picksSheetCsv, otherwise the committed picks-2026.csv) and
geocodes any row that does not already have coordinates.

Three rules, the same ones the program geocoder follows:

  * a row already placed is left alone, so this is cheap to re-run and
    re-running it can never move a pin that was already right;
  * "source": "manual" is never touched, ever — that is how a hand-placed
    pin survives every future run;
  * a row it cannot place confidently gets no coordinates at all. An absent
    pin is honest; a pin in the middle of the CBD is a lie.

    npm run geocode-picks              # place the new rows
    npm run geocode-picks -- --force   # re-place everything except manual
"""
import csv, importlib.util, io, json, pathlib, re, sys, time, urllib.error

HERE = pathlib.Path(__file__).parent
spec = importlib.util.spec_from_file_location("gv", HERE / "geocode-venues.py")
gv = importlib.util.module_from_spec(spec); spec.loader.exec_module(gv)

CSV_PATH = HERE.parent / "src/_data/picks-2026.csv"
OUT      = HERE.parent / "src/_data/picks.json"
SITE     = HERE.parent / "src/_data/site.json"


# Mapbox returns confidence 0.6 for ANY interpolated street address, including
# ones it got exactly right: "79 Rundle St, Adelaide" comes back as
# "79 Rundle Street, Adelaide South Australia 5000" wearing a 0.6. Judging on
# that number alone throws away correct matches and keeps no bad ones.
#
# So judge the answer instead of the score. If the result echoes back the
# street and the suburb that were asked for, it found the place. If it moved
# the suburb -- "Station Rd, Adelaide" coming back as "Station Road,
# BLACKWOOD" -- it did not, whatever its confidence says.
STOPWORDS = {"st","street","rd","road","ave","avenue","pl","place","tce","terrace",
             "ln","lane","dr","drive","sq","square","way","hwy","highway","sa",
             "australia","south"}

def words(text):
    return [w for w in re.findall(r"[a-z]+", (text or "").lower())
            if w not in STOPWORDS and len(w) > 2]

def agrees(asked, got):
    """Did the geocoder come back with the street and suburb it was given?"""
    a, g = words(asked), set(words(got))
    if not a:
        return False
    # Every meaningful word of the query has to appear in the answer. That is
    # strict on purpose: it is the only thing standing between a pick and a
    # pin in the wrong suburb.
    missing = [w for w in a if w not in g]
    if missing:
        return False
    # And the street number, if one was asked for, has to survive. "1097" ->
    # "1097a" is the same building; "21" -> "185" is not.
    want = re.match(r"\s*(\d+)", asked or "")
    if want:
        nums = re.findall(r"\b(\d+)[a-z]?\b", got or "")
        if want.group(1) not in nums:
            return False
    return True


def good(asked, hit):
    if not hit or hit.get("lat") is None:
        return False
    if hit.get("confidence", 0) >= gv.CONFIDENCE_FLOOR:
        return True
    return agrees(asked, hit.get("matched_address", ""))


def read_picks():
    """The sheet is the source of truth; the committed CSV is the safety net."""
    site = json.loads(SITE.read_text(encoding="utf-8"))
    url = (site.get("picksSheetCsv") or "").strip()
    text = None
    if url:
        try:
            text = gv.fetch_text(url) if hasattr(gv, "fetch_text") else None
            if text is None:
                import urllib.request
                with urllib.request.urlopen(url, timeout=30) as r:
                    text = r.read().decode("utf-8")
            print(f"  picks: loaded from the Google Sheet ({len(text)} bytes)")
        except Exception as err:
            print(f"  picks: could not read the sheet ({err}) — using the "
                  f"committed CSV")
            text = None
    else:
        print("  picks: no sheet configured — using the committed CSV")
    if text is None:
        text = CSV_PATH.read_text(encoding="utf-8")
    return list(csv.DictReader(io.StringIO(text)))


def main():
    force = "--force" in sys.argv
    gv.load_dotenv()
    token = (gv.os.environ.get("MAPBOX_BUILD_TOKEN")
             or gv.os.environ.get("MAPBOX_PUBLIC_TOKEN"))
    if not token:
        sys.exit("\n  No Mapbox token. Put an unrestricted public token in\n"
                 "  MAPBOX_BUILD_TOKEN in .env.\n")

    rows = read_picks()
    known = {}
    if OUT.exists():
        known = {v["name"]: v for v in json.loads(OUT.read_text(encoding="utf-8"))["venues"]}

    out, review, placed_now = [], [], 0
    for row in rows:
        name = (row.get("name") or "").strip()
        if not name:
            continue
        prev = known.get(name)

        # A hand-placed pin outranks anything a geocoder has to say.
        if prev and prev.get("source") == "manual":
            out.append(prev)
            continue
        if prev and prev.get("lat") is not None and not force:
            out.append({**prev, "address": (row.get("address") or "").strip() or prev.get("address")})
            continue

        address = (row.get("address") or "").strip()
        text = address or name
        try:
            if gv.has_street_address(text):
                hit = gv.geocode_mapbox(gv.normalise(text), token); time.sleep(0.12)
            else:
                hit = gv.geocode_osm(gv.osm_query(text)); time.sleep(1.1)
                if not hit:
                    hit = gv.geocode_mapbox(gv.normalise(text), token); time.sleep(0.12)
        except urllib.error.HTTPError as err:
            sys.exit(f"\n  Geocoder refused ({err.code}) on {name}. Stopping so\n"
                     f"  the half-finished result is not written.\n")

        rec = {"name": name, "address": address or None}
        if good(text, hit):
            rec.update({k: hit.get(k) for k in
                        ("lat", "lng", "matched_address", "confidence", "source")})
            placed_now += 1
            if not gv.has_street_address(text):
                review.append((name, f"no street number — matched {hit.get('matched_address','')}"))
        else:
            rec.update({"lat": None, "lng": None})
            review.append((name, "could not place — left off the map"))
        out.append(rec)

    OUT.write_text(json.dumps({"venues": out}, indent=1, ensure_ascii=False) + "\n",
                   encoding="utf-8")
    total = sum(1 for r in out if r.get("lat") is not None)
    print(f"\n  {len(out)} picks — {total} on the map ({placed_now} placed this run)")
    if review:
        print(f"\n  {len(review)} worth an eye before print:")
        for n, note in review:
            print(f"    {n[:28]:29} {note[:62]}")
    print()

if __name__ == "__main__":
    main()
