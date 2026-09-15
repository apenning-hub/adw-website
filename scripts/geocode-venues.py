#!/usr/bin/env python3
"""Turn the program's venue strings into coordinates, once.

The venue column in program-2026.csv is written by people, for people:
"Coldstore, 66 Wyatt St, Adelaide" sits next to "Jam Factory, ADL CBD" and
plain "Thebarton". None of it carries coordinates, and a geocoder handed
"ADL CBD" returns nonsense, so the shorthand is expanded here first.

The output, src/_data/venues.json, is committed. Production builds never
call Mapbox — they read the file. That means a venue that geocodes badly is
fixed once, by hand, and stays fixed.

    export MAPBOX_TOKEN=pk....
    python3 scripts/geocode-venues.py           # fill in what is missing
    python3 scripts/geocode-venues.py --refresh # re-query non-manual entries

THE RULE THAT MATTERS: an entry marked "source": "manual" is never queried
and never overwritten. Hand-correct a venue, set its source to "manual", and
every future run leaves it alone. Nothing else in this script is as important.
"""

import argparse
import csv
import io
import json
import os
import pathlib
import sys
import re
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
CSV_PATH = ROOT / "src/_data/program-2026.csv"
OUT_PATH = ROOT / "src/_data/venues.json"

# Adelaide, so a bare "Hyde Park" lands here and not in London or Sydney.
PROXIMITY = (138.5999, -34.9285)
BBOX = (138.30, -35.40, 139.00, -34.60)   # greater Adelaide, W S E N

# Anything at or below this is put on the review list. Mapbox is confident
# about street addresses and vague about business names, which is exactly
# the split we care about.
CONFIDENCE_FLOOR = 0.7

# ADW's own shorthand, expanded before the geocoder ever sees it. Order
# matters: the two-word forms must be replaced before the bare "ADL" rule
# gets to them, or "ADL CBD" becomes "Adelaide CBD" without the state and
# "CBD, ADL" becomes "CBD, Adelaide", which geocodes to a different place.
SHORTHAND = [
    ("adl uni", "University of Adelaide"),
    ("adelaide university", "University of Adelaide"),
    ("cbd, adl", "Adelaide CBD, SA"),
    ("adl cbd", "Adelaide CBD, SA"),
    ("adl", "Adelaide"),
]

# Local knowledge no geocoder has. Expanded before lookup, because "AGSA"
# finds nothing and "Art Gallery of South Australia" finds the building.
# Add to this table whenever a venue comes back wrong for a nameable reason —
# it fixes that venue for every future year, where a hand-corrected
# coordinate only fixes it once.
ALIASES = [
    ("agsa", "Art Gallery of South Australia"),
    ("jam factory", "JamFactory"),
    ("plant 3", "Plant 3 Bowden"),
    ("adl uni", "University of Adelaide"),
    ("adelaide university", "University of Adelaide"),
    ("the forum, jeffrey smart", "Jeffrey Smart Building"),
    ("kaurna building", "Kaurna Building, University of South Australia"),
    ("dental school", "Adelaide Dental Hospital"),
]

# A street number followed by a street name. Mapbox scored 0.9 on these and
# centroid-guessed everything else, so they are the ones worth sending there.
# The number and the street must be adjacent: "H2-16, Fenn Place" is a room
# in a building, not an address, and belongs with the named venues.
STREET = re.compile(
    r"\b\d+[A-Za-z]?\s+[A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*)?\s+"
    r"(?:St|Street|Rd|Road|Ave|Avenue|Tce|Terrace|Pl|Place|Sq|Square|"
    r"Ln|Lane|Pde|Parade|Dr|Drive|Hwy|Highway)\b")

# The ADW shorthand for "in town", in the forms it actually appears in.
CBD_FORMS = ["adl cbd", "cbd, adl", "cbd adl", "adl"]


def has_street_address(venue):
    """True when Mapbox is the better geocoder for this one."""
    return bool(STREET.search(venue))


def _replace_token(text, needle, replacement):
    """Case-insensitive whole-token replace, without regex.

    Venue names contain brackets, plus signs and slashes that a regex would
    read as syntax.
    """
    lower = text.lower()
    start = 0
    while True:
        i = lower.find(needle, start)
        if i == -1:
            return text
        end = i + len(needle)
        if (i == 0 or not text[i - 1].isalnum()) and \
           (end == len(text) or not text[end].isalnum()):
            text = text[:i] + replacement + text[end:]
            lower = text.lower()
            start = i + len(replacement)
        else:
            start = i + 1


def osm_query(venue):
    """The query OpenStreetMap sees: a real name and a real locality."""
    text = venue.strip()

    # "MEET:" marks a gathering point. It is an instruction, not a place.
    if text.lower().startswith("meet:"):
        text = text[5:].strip()

    for short, full in ALIASES:
        text = _replace_token(text, short, full)

    for form in CBD_FORMS:
        text = _replace_token(text, form, "Adelaide")

    # Collapse the duplicate that "ADL Uni, ADL CBD" leaves behind.
    while ", Adelaide, Adelaide" in text:
        text = text.replace(", Adelaide, Adelaide", ", Adelaide")

    # Only the tail counts. "Art Gallery of South Australia" contains the
    # state in its own name and still needs it appended as a locality.
    if not text.lower().rstrip(" ,").endswith(("south australia", ", sa")):
        text += ", South Australia"
    return text


# Venue cells that are not places. Listing them explicitly is better than a
# confidence threshold: "Travelling between events!" would geocode to
# something, and that something would be a pin on the map that lies.
NOT_A_PLACE = ["travelling between", "various locations", "online", "tba"]


def parse_dotenv(text):
    """Parse a .env file into a dict.

    Keys with no value are left out entirely, not stored as "". .env.example
    ships with empty values, and an empty string would reach Mapbox looking
    like a token and come back as a baffling 401.
    """
    env = {}
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        value = value.strip().strip("\"'")
        if value:
            env[key.strip()] = value
    return env


def load_dotenv():
    """Read .env into os.environ, without overriding what is already set."""
    path = ROOT / ".env"
    if not path.exists():
        return
    for key, value in parse_dotenv(path.read_text(encoding="utf-8")).items():
        os.environ.setdefault(key, value)


def normalise(venue):
    """Expand ADW shorthand and pin the result to South Australia."""
    text = venue.strip()
    # Already fully qualified — leave it exactly as written.
    if text.lower().endswith("australia"):
        return text

    for short, full in SHORTHAND:
        # Case-insensitive whole-token replace. Walking the string rather
        # than using re keeps the replacement literal: venue names contain
        # brackets and plus signs that would otherwise be read as regex.
        lower = text.lower()
        start = 0
        while True:
            i = lower.find(short, start)
            if i == -1:
                break
            before_ok = i == 0 or not text[i - 1].isalnum()
            end = i + len(short)
            after_ok = end == len(text) or not text[end].isalnum()
            if before_ok and after_ok:
                text = text[:i] + full + text[end:]
                lower = text.lower()
                start = i + len(full)
            else:
                start = i + 1

    # The shorthand rules already append ", SA" where they apply; don't say
    # it twice.
    if text.lower().endswith(", sa"):
        return text + ", Australia"
    return text + ", SA, Australia"


def is_skip(venue):
    """True when this venue cell does not name a findable place."""
    lower = venue.strip().lower()
    return any(phrase in lower for phrase in NOT_A_PLACE)


def needs_review(venue, entry):
    """True when a human should look at this result before it is trusted."""
    if entry is None:
        return True
    if entry.get("skip"):
        return False            # deliberately excluded, nothing to check
    if entry.get("source") == "manual":
        return False            # already checked by a human
    if entry.get("confidence", 0) < CONFIDENCE_FLOOR:
        return True
    # A bare locality — no street, no comma — can score 1.0 and still put the
    # pin in the middle of a suburb rather than at the venue.
    raw = venue.strip()
    if "," not in raw and not any(c.isdigit() for c in raw):
        return True
    return False


def merge(existing, fresh):
    """Combine a previous venues.json with a new run.

    Two guarantees, both about not losing human work:
      - a "manual" entry is kept verbatim, whatever the new run found;
      - a venue missing from this run is kept, not deleted, because a venue
        can disappear from the CSV for a day mid-edit and its hand-corrected
        coordinates would be gone for good.
    """
    merged = dict(existing)
    for venue, entry in fresh.items():
        if existing.get(venue, {}).get("source") == "manual":
            continue
        merged[venue] = entry
    return merged


def read_program():
    """The program text, from the same place the site gets it.

    The Google Sheet is the source of truth; the committed CSV is the safety
    net. Reading only the CSV here would mean geocoding last week's venues
    while the site showed this week's.
    """
    site = json.loads((ROOT / "src/_data/site.json").read_text(encoding="utf-8"))
    url = (site.get("programSheetCsv") or "").strip()
    local = CSV_PATH.read_text(encoding="utf-8")
    if not url:
        print("  program: no sheet configured — using the committed CSV")
        return local
    try:
        with urllib.request.urlopen(url, timeout=25) as resp:
            text = resp.read().decode("utf-8")
        if text.lstrip().startswith("<") or not text.lower().startswith("category"):
            raise ValueError("that URL did not return the program as CSV")
        print(f"  program: loaded from the Google Sheet ({len(text)} bytes)")
        return text
    except Exception as err:                      # noqa: BLE001 - reported below
        print(f"  program: could not read the sheet ({err}) — using the "
              f"committed CSV")
        return local


def venue_addresses(csv_text):
    """venue string -> address, over the whole program.

    Columns are found by name, so the address column can sit anywhere. One
    filled-in row is enough for a venue: an editor should not have to repeat
    the same address on every event held there.
    """
    rows = list(csv.DictReader(io.StringIO(csv_text)))
    found = {}
    for row in rows:
        venue = (row.get("venue") or "").strip()
        if not venue:
            continue
        address = (row.get("address") or "").strip()
        if venue not in found or (address and not found[venue]):
            found[venue] = address
    return found


def lookup_text(venue, address):
    """What actually gets geocoded: the address when there is one."""
    return address.strip() if address and address.strip() else venue


def unique_venues(csv_path):
    """Every distinct venue string in the program, in first-seen order."""
    seen = []
    with open(csv_path, newline="", encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            venue = (row.get("venue") or "").strip()
            if venue and venue not in seen:
                seen.append(venue)
    return seen


# Mapbox v6 reports confidence as a word. Numbers are easier to threshold on
# and easier to eyeball in the committed JSON.
CONFIDENCE_WORDS = {"exact": 1.0, "high": 0.9, "medium": 0.6, "low": 0.3}


def geocode_mapbox(query, token):
    """Ask Mapbox where this is. Returns an entry dict, or None."""
    params = urllib.parse.urlencode({
        "q": query,
        "country": "AU",
        "limit": 1,
        "proximity": f"{PROXIMITY[0]},{PROXIMITY[1]}",
        "bbox": ",".join(str(v) for v in BBOX),
        "access_token": token,
    })
    url = f"https://api.mapbox.com/search/geocode/v6/forward?{params}"
    with urllib.request.urlopen(url, timeout=20) as resp:
        data = json.load(resp)

    features = data.get("features") or []
    if not features:
        return None
    feat = features[0]
    props = feat.get("properties", {})
    coords = props.get("coordinates") or {}
    if "longitude" not in coords or "latitude" not in coords:
        return None

    word = (props.get("match_code") or {}).get("confidence")
    confidence = CONFIDENCE_WORDS.get(word, props.get("relevance", 0.5))

    return {
        "lat": round(coords["latitude"], 6),
        "lng": round(coords["longitude"], 6),
        "matched_address": props.get("full_address") or props.get("name", ""),
        "confidence": confidence,
        "source": "mapbox",
        "query": query,
    }


# Nominatim asks for a real User-Agent naming the application and a contact,
# and for no more than one request a second. Both are honoured below. This
# runs once per program, over 69 venues — well inside what it is for.
OSM_UA = ("AdelaideDesignWeek-map/1.0 "
          "(one-off venue geocoding; contact@adelaidedesignweek.com.au)")

# A result that is a suburb or a town is a centroid, not a venue. It can be
# a perfectly good match and still put the pin in the middle of a suburb, so
# it goes on the review list whatever its score.
OSM_CENTROID_TYPES = {"suburb", "city", "town", "village", "state",
                      "county", "region", "postcode", "neighbourhood"}


def geocode_osm(query):
    """Ask OpenStreetMap. Returns an entry dict, or None.

    OSM knows the venues because people in Adelaide mapped them; Mapbox
    scored 0/8 on the same names. Only the coordinates are kept, and they
    are committed to venues.json, so nothing here runs at build time.
    """
    params = urllib.parse.urlencode({
        "q": query,
        "format": "jsonv2",
        "limit": 1,
        "countrycodes": "au",
        "viewbox": ",".join(str(v) for v in BBOX),
        # Hard limit, not a hint. Without it "Aesop" matches a shop in a
        # Sydney shopping centre and lands on the map looking plausible.
        "bounded": 1,
        "accept-language": "en",
    })
    url = f"https://nominatim.openstreetmap.org/search?{params}"
    request = urllib.request.Request(url, headers={"User-Agent": OSM_UA})
    with urllib.request.urlopen(request, timeout=25) as resp:
        results = json.load(resp)

    if not results:
        return None
    hit = results[0]
    kind = (hit.get("addresstype") or hit.get("type") or "").lower()

    return {
        "lat": round(float(hit["lat"]), 6),
        "lng": round(float(hit["lon"]), 6),
        "matched_address": hit.get("display_name", ""),
        # Not OSM's own score — a judgement about whether this is a venue
        # or a suburb centroid, which is what actually decides if it needs
        # a human eye.
        "confidence": 0.4 if kind in OSM_CENTROID_TYPES else 0.85,
        "source": "osm",
        "query": query,
    }


def pick(osm_result, mapbox_result):
    """Choose between the two geocoders' answers.

    OSM is precise or silent. Mapbox always answers, usually with a suburb
    centroid. So OSM wins outright, and Mapbox catches what OSM never heard
    of — marked as a fallback and held below the review floor, because a
    centroid is a starting point for a human, not an answer.
    """
    if osm_result:
        return osm_result
    if mapbox_result:
        entry = dict(mapbox_result)
        entry["fallback"] = True
        entry["confidence"] = min(entry.get("confidence", 0),
                                  CONFIDENCE_FLOOR - 0.2)
        return entry
    return None


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--refresh", action="store_true",
                    help="re-query venues already in venues.json "
                         "(manual entries are still never touched)")
    args = ap.parse_args()

    load_dotenv()
    # The build token, not the browser one. This script sends no Referer,
    # so a URL-restricted token is refused however valid it is.
    token = (os.environ.get("MAPBOX_BUILD_TOKEN")
             or os.environ.get("MAPBOX_PUBLIC_TOKEN")
             or os.environ.get("MAPBOX_TOKEN"))
    if not token:
        sys.exit("\n  No Mapbox token.\n\n"
                 "  Put an UNRESTRICTED public token (pk....) in\n"
                 "  MAPBOX_BUILD_TOKEN in .env, then run this again.\n\n"
                 "  It must have no URL restriction: this script runs from a\n"
                 "  terminal and sends no Referer header, so a restricted\n"
                 "  token is refused with 403 however valid it is.\n")

    existing = {}
    if OUT_PATH.exists():
        existing = json.loads(OUT_PATH.read_text(encoding="utf-8"))

    program = read_program()
    addresses = venue_addresses(program)
    venues = list(addresses.keys())

    # The Shopfront Design Circuit's stops are not venues in the program —
    # the event has one "Various Locations" cell — so they are listed
    # separately and geocoded alongside. They land in the same file, keyed by
    # shop name, and get the same hand-correction protection.
    circuit_path = ROOT / "src/_data/circuit.json"
    if circuit_path.exists():
        circuit = json.loads(circuit_path.read_text(encoding="utf-8"))
        for stop in circuit.get("stops", []):
            name = stop.get("name", "").strip()
            if name and name not in addresses:
                addresses[name] = stop.get("address", "").strip()
                venues.append(name)
    fresh = {}
    queried = 0
    with_address = sum(1 for a in addresses.values() if a)
    print(f"  {len(venues)} venues, {with_address} with an address\n")

    for venue in venues:
        if is_skip(venue):
            fresh[venue] = {"skip": True, "reason": "not a location",
                            "source": "rule"}
            continue
        if existing.get(venue, {}).get("source") == "manual":
            continue                       # protected, never re-queried
        if venue in existing and not args.refresh:
            continue                       # already have it

        # An address beats everything. Otherwise, each venue goes to
        # whichever geocoder is good at what it has: Mapbox for street
        # addresses, OpenStreetMap for venue names.
        text = lookup_text(venue, addresses.get(venue, ""))
        street = has_street_address(text)
        try:
            if street:
                query = normalise(text)
                result = geocode_mapbox(query, token)
                time.sleep(0.12)
            else:
                query = osm_query(text)
                result = geocode_osm(query)
                time.sleep(1.1)            # Nominatim: one request a second
                if not result:
                    # OSM has never heard of this one. A Mapbox centroid at
                    # least puts it in the right suburb for someone to drag.
                    result = pick(None, geocode_mapbox(normalise(venue), token))
                    time.sleep(0.12)
        except urllib.error.HTTPError as err:
            who = "Mapbox" if street else "OpenStreetMap"
            sys.exit(f"\n  {who} refused the request ({err.code}) for:\n"
                     f"    {venue}\n    as: {query}\n")
        queried += 1

        fresh[venue] = result or {"query": query,
                                  "source": "mapbox" if street else "osm",
                                  "confidence": 0, "error": "no match"}

    merged = merge(existing, fresh)
    ordered = {v: merged[v] for v in venues if v in merged}
    ordered.update({k: v for k, v in merged.items() if k not in ordered})
    OUT_PATH.write_text(json.dumps(ordered, indent=2, ensure_ascii=False) + "\n",
                        encoding="utf-8")

    review = [v for v in venues if needs_review(v, merged.get(v))]
    located = sum(1 for v in venues
                  if merged.get(v, {}).get("lat") is not None)
    skipped = sum(1 for v in venues if merged.get(v, {}).get("skip"))

    from collections import Counter
    who = Counter(merged.get(v, {}).get("source") for v in venues
                  if merged.get(v, {}).get("lat") is not None)

    print(f"\n  {len(venues)} venues — {located} located, {skipped} skipped, "
          f"{queried} queried this run")
    print("  found by: " + ", ".join(f"{n} {name}" for name, n in who.most_common()))
    print(f"  written to {OUT_PATH.relative_to(ROOT)}\n")

    if review:
        print(f"  {len(review)} need a human eye:\n")
        for venue in review:
            entry = merged.get(venue) or {}
            got = entry.get("matched_address") or entry.get("error", "no result")
            conf = entry.get("confidence", 0)
            print(f"    {venue}\n      -> {got}  (confidence {conf})")
        print('\n  To fix one: edit its lat/lng in venues.json and set\n'
              '  "source": "manual". It will never be overwritten again.\n')


if __name__ == "__main__":
    main()
