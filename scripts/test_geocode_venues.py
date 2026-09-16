"""Tests for geocode-venues.py.

Only the pure logic is tested here: the shorthand normalisation table, the
skip rule, the review rule, and the merge that protects hand-corrections.
The network call itself is not tested — it is a thin wrapper around requests.

Run: python3 scripts/test_geocode_venues.py
"""
import importlib.util
import pathlib
import unittest

spec = importlib.util.spec_from_file_location(
    "geocode_venues", pathlib.Path(__file__).parent / "geocode-venues.py")
gv = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gv)


class TestNormalise(unittest.TestCase):
    """ADW shorthand is expanded before it ever reaches the geocoder."""

    def test_adl_cbd_becomes_adelaide_cbd(self):
        self.assertEqual(
            gv.normalise("Jam Factory, ADL CBD"),
            "Jam Factory, Adelaide CBD, SA, Australia")

    def test_cbd_adl_reversed_is_also_handled(self):
        self.assertEqual(
            gv.normalise("Immersive Art and Installation, 63 Light Sq, CBD, ADL"),
            "Immersive Art and Installation, 63 Light Sq, Adelaide CBD, SA, Australia")

    def test_adl_uni_becomes_the_university(self):
        self.assertEqual(
            gv.normalise("Kaurna Building L3, ADL Uni, ADL CBD"),
            "Kaurna Building L3, University of Adelaide, Adelaide CBD, SA, Australia")

    def test_bare_suburb_gets_state_and_country(self):
        self.assertEqual(gv.normalise("Thebarton"), "Thebarton, SA, Australia")

    def test_a_real_street_address_is_left_alone(self):
        self.assertEqual(
            gv.normalise("Coldstore, 66 Wyatt St, Adelaide"),
            "Coldstore, 66 Wyatt St, Adelaide, SA, Australia")

    def test_trailing_adl_becomes_adelaide(self):
        self.assertEqual(gv.normalise("Hygge Studios, Hyde Park, ADL"),
                         "Hygge Studios, Hyde Park, Adelaide, SA, Australia")

    def test_australia_is_not_appended_twice(self):
        self.assertEqual(gv.normalise("Somewhere, SA, Australia"),
                         "Somewhere, SA, Australia")


class TestRouting(unittest.TestCase):
    """Which geocoder a venue goes to.

    Mapbox is strong on street addresses and scored 0/8 on venue names;
    OpenStreetMap knows the venues because locals mapped them. So each
    venue goes to whichever is good at it.
    """

    def test_a_street_address_goes_to_mapbox(self):
        for venue in ["Coldstore, 66 Wyatt St, Adelaide",
                      "215 Magill Rd, Maylands",
                      "1/149 Flinders St, ADL CBD",
                      "Being Studio, 27 Halifax St, CBD, ADL",
                      "WIP Shed, 28A Dew St, Thebarton",
                      "Min Jewellery, g14 33 Pirie St, CBD, ADL",
                      "MEET: Faraway House, 21 Franklin Street, CBD, ADL"]:
            self.assertTrue(gv.has_street_address(venue), venue)

    def test_a_named_venue_goes_to_openstreetmap(self):
        for venue in ["Jam Factory, ADL CBD",
                      "Queens Theatre, ADL CBD",
                      "Plant 3, Bowden",
                      "Hebart Hall, North Adelaide",
                      "Kaurna Building L3, ADL Uni, ADL CBD",
                      "Allan Scott Auditorium H2-16, Fenn Place, Adelaide University, ADL CBD"]:
            self.assertFalse(gv.has_street_address(venue), venue)


class TestOsmQuery(unittest.TestCase):
    """The query OpenStreetMap actually sees."""

    def test_adw_shorthand_becomes_adelaide(self):
        self.assertEqual(gv.osm_query("Queens Theatre, ADL CBD"),
                         "Queens Theatre, Adelaide, South Australia")

    def test_a_real_suburb_is_kept(self):
        self.assertEqual(gv.osm_query("Mixed Goods Studio, Kilkenny"),
                         "Mixed Goods Studio, Kilkenny, South Australia")

    def test_known_venues_are_expanded_before_lookup(self):
        # Local knowledge the geocoder does not have. "AGSA" is unfindable;
        # its full name is not.
        self.assertEqual(gv.osm_query("AGSA, ADL CBD"),
                         "Art Gallery of South Australia, Adelaide, South Australia")
        self.assertEqual(gv.osm_query("Jam Factory, ADL CBD"),
                         "JamFactory, Adelaide, South Australia")

    def test_a_meeting_point_prefix_is_dropped(self):
        # "MEET:" tells a visitor to gather there; it is not part of the name.
        self.assertEqual(gv.osm_query("MEET: A PLACE coffee, Bowden"),
                         "A PLACE coffee, Bowden, South Australia")


class TestPick(unittest.TestCase):
    """OSM when it knows the place, Mapbox's centroid when it does not.

    OSM answers precisely or not at all; Mapbox always answers, usually with
    a suburb centroid. A centroid is a pin in roughly the right place that a
    human can drag. No result at all is an event missing from the map.
    """

    def test_osm_wins_when_it_found_something(self):
        osm = {"lat": 1.0, "lng": 1.0, "source": "osm", "confidence": 0.85}
        mapbox = {"lat": 2.0, "lng": 2.0, "source": "mapbox", "confidence": 0.5}
        self.assertEqual(gv.pick(osm, mapbox)["source"], "osm")

    def test_mapbox_is_used_when_osm_knows_nothing(self):
        mapbox = {"lat": 2.0, "lng": 2.0, "source": "mapbox", "confidence": 0.5}
        got = gv.pick(None, mapbox)
        self.assertEqual(got["source"], "mapbox")
        self.assertTrue(got["fallback"])

    def test_a_fallback_is_never_trusted_enough_to_skip_review(self):
        mapbox = {"lat": 2.0, "lng": 2.0, "source": "mapbox", "confidence": 0.95}
        self.assertLess(gv.pick(None, mapbox)["confidence"], gv.CONFIDENCE_FLOOR)

    def test_neither_found_anything(self):
        self.assertIsNone(gv.pick(None, None))


class TestAddresses(unittest.TestCase):
    """The address column, once the sheet has it.

    An address is the whole point: "Stylecraft, ADL CBD" can only ever be
    geocoded to the middle of the city, while "17 Gilbert St, Adelaide" is
    exact. So when a row has one, it wins outright.
    """

    CSV = ("category,title,ticketed,venue,address,blurb,link,socials,note,"
           "contributors,adw_presented,wed 14 oct\n"
           "EXH,A,,\"Stylecraft, ADL CBD\",\"17 Gilbert St, Adelaide\",,,,,,,10am\n"
           "EXH,B,,\"Stylecraft, ADL CBD\",,,,,,,,10am\n"
           "EXH,C,,\"Jam Factory, ADL CBD\",,,,,,,,10am\n")

    def test_reads_the_address_column(self):
        got = gv.venue_addresses(self.CSV)
        self.assertEqual(got["Stylecraft, ADL CBD"], "17 Gilbert St, Adelaide")

    def test_a_venue_with_no_address_maps_to_empty(self):
        self.assertEqual(gv.venue_addresses(self.CSV)["Jam Factory, ADL CBD"], "")

    def test_one_row_with_an_address_is_enough_for_that_venue(self):
        # The same venue appears twice, filled in on only one row. An editor
        # should not have to repeat it on every event at that venue.
        self.assertEqual(gv.venue_addresses(self.CSV)["Stylecraft, ADL CBD"],
                         "17 Gilbert St, Adelaide")

    def test_works_on_a_sheet_with_no_address_column_at_all(self):
        plain = ("category,title,ticketed,venue,blurb,link,socials,note,"
                 "contributors,adw_presented,wed 14 oct\n"
                 "EXH,A,,\"Jam Factory, ADL CBD\",,,,,,,10am\n")
        self.assertEqual(gv.venue_addresses(plain), {"Jam Factory, ADL CBD": ""})

    def test_an_address_is_geocoded_as_an_address(self):
        # Addresses go to Mapbox, which is strong at them; names go to OSM.
        self.assertTrue(gv.has_street_address("17 Gilbert St, Adelaide"))

    def test_the_address_is_what_gets_looked_up(self):
        self.assertEqual(
            gv.lookup_text("Stylecraft, ADL CBD", "17 Gilbert St, Adelaide"),
            "17 Gilbert St, Adelaide")

    def test_without_an_address_the_venue_is_what_gets_looked_up(self):
        self.assertEqual(gv.lookup_text("Jam Factory, ADL CBD", ""),
                         "Jam Factory, ADL CBD")


class TestAddressMerge(unittest.TestCase):
    """Addresses come from wherever they exist.

    The program is read from the Google Sheet, but the sheet has no address
    column yet. The committed CSV does. Until the two agree, an address in
    either one counts — otherwise the researched addresses are silently
    ignored on every build, which is exactly what happened once.
    """

    SHEET = ("category,title,ticketed,venue,blurb,link,socials,note,"
             "contributors,adw_presented,wed 14 oct\n"
             "EXH,A,,\"Jam Factory, ADL CBD\",,,,,,,10am\n"
             "EXH,B,,\"AGSA, ADL CBD\",,,,,,,10am\n")

    LOCAL = ("category,title,ticketed,venue,address,blurb,link,socials,note,"
             "contributors,adw_presented,wed 14 oct\n"
             "EXH,A,,\"Jam Factory, ADL CBD\",\"19 Morphett St, Adelaide\",,,,,,,10am\n"
             "EXH,B,,\"AGSA, ADL CBD\",,,,,,,,10am\n")

    def test_the_local_csv_fills_what_the_sheet_lacks(self):
        got = gv.merge_addresses(self.SHEET, self.LOCAL)
        self.assertEqual(got["Jam Factory, ADL CBD"], "19 Morphett St, Adelaide")

    def test_a_venue_with_no_address_anywhere_stays_empty(self):
        got = gv.merge_addresses(self.SHEET, self.LOCAL)
        self.assertEqual(got["AGSA, ADL CBD"], "")

    def test_the_sheet_wins_when_it_has_one(self):
        # Once the address column reaches the sheet, the sheet is the source
        # of truth and the committed copy stops mattering.
        sheet = self.LOCAL.replace("19 Morphett St, Adelaide", "SHEET VALUE")
        got = gv.merge_addresses(sheet, self.LOCAL)
        self.assertEqual(got["Jam Factory, ADL CBD"], "SHEET VALUE")

    def test_case_and_spacing_differences_still_match(self):
        # The sheet contains both "UNBUILT, North Adelaide" and "Unbuilt,
        # North Adelaide" for the same place. Exact-string matching gave one
        # of them its address and left the other on a suburb centroid.
        sheet = ('category,title,ticketed,venue,blurb,link,socials,note,'
                 'contributors,adw_presented,wed 14 oct\n'
                 'EXH,A,,"Unbuilt,  North Adelaide",,,,,,,10am\n')
        local = ('category,title,ticketed,venue,address,blurb,link,socials,note,'
                 'contributors,adw_presented,wed 14 oct\n'
                 'EXH,A,,"UNBUILT, North Adelaide","104 Jeffcott St",,,,,,,10am\n')
        got = gv.merge_addresses(sheet, local)
        self.assertEqual(got["Unbuilt,  North Adelaide"], "104 Jeffcott St")

    def test_venues_only_in_the_sheet_are_still_listed(self):
        sheet = self.SHEET + 'EXH,C,,"New Venue",,,,,,,10am\n'
        got = gv.merge_addresses(sheet, self.LOCAL)
        self.assertIn("New Venue", got)


class TestSkip(unittest.TestCase):
    """Some venue cells are not places at all."""

    def test_travelling_between_events_is_not_a_place(self):
        self.assertTrue(gv.is_skip("Travelling between events!"))

    def test_various_locations_is_not_a_single_place(self):
        self.assertTrue(gv.is_skip("Various Locations, East End, ADL CBD"))

    def test_a_real_venue_is_not_skipped(self):
        self.assertFalse(gv.is_skip("Jam Factory, ADL CBD"))


class TestNeedsReview(unittest.TestCase):
    """The review list is what turns 69 guesses into a short correction pass."""

    def test_low_confidence_is_flagged(self):
        entry = {"lat": -34.9, "lng": 138.6, "confidence": 0.4}
        self.assertTrue(gv.needs_review("Jam Factory, ADL CBD", entry))

    def test_high_confidence_street_address_is_not_flagged(self):
        entry = {"lat": -34.9, "lng": 138.6, "confidence": 0.95}
        self.assertFalse(gv.needs_review("Coldstore, 66 Wyatt St, Adelaide", entry))

    def test_bare_suburb_is_flagged_even_when_confident(self):
        # A suburb centroid can score 1.0 and still be the wrong pin.
        entry = {"lat": -34.9, "lng": 138.6, "confidence": 1.0}
        self.assertTrue(gv.needs_review("Thebarton", entry))

    def test_a_venue_that_returned_nothing_is_flagged(self):
        self.assertTrue(gv.needs_review("Nowhere At All", None))


class TestMerge(unittest.TestCase):
    """The idempotency guarantee: hand-corrections survive every future run."""

    def test_manual_entries_are_never_overwritten(self):
        existing = {"Thebarton": {"lat": -34.91, "lng": 138.57, "source": "manual"}}
        fresh = {"Thebarton": {"lat": 0.0, "lng": 0.0, "source": "mapbox"}}
        merged = gv.merge(existing, fresh)
        self.assertEqual(merged["Thebarton"]["lat"], -34.91)
        self.assertEqual(merged["Thebarton"]["source"], "manual")

    def test_mapbox_entries_are_refreshed(self):
        existing = {"X": {"lat": 1.0, "lng": 1.0, "source": "mapbox"}}
        fresh = {"X": {"lat": 2.0, "lng": 2.0, "source": "mapbox"}}
        self.assertEqual(gv.merge(existing, fresh)["X"]["lat"], 2.0)

    def test_venues_dropped_from_the_csv_are_kept_not_deleted(self):
        # A venue can vanish from the CSV for a day mid-edit; losing its
        # hand-corrected coordinates because of that would be unrecoverable.
        existing = {"Old Venue": {"lat": 1.0, "lng": 1.0, "source": "manual"}}
        merged = gv.merge(existing, {"New Venue": {"lat": 2.0, "lng": 2.0}})
        self.assertIn("Old Venue", merged)
        self.assertIn("New Venue", merged)

    def test_a_manual_skip_is_also_protected(self):
        existing = {"Weird Place": {"skip": True, "source": "manual"}}
        fresh = {"Weird Place": {"lat": 9.9, "lng": 9.9, "source": "mapbox"}}
        self.assertTrue(gv.merge(existing, fresh)["Weird Place"]["skip"])


class TestDotenv(unittest.TestCase):
    """Reading .env, so keys live in one gitignored file and nowhere else."""

    def test_reads_key_value_pairs(self):
        env = gv.parse_dotenv("MAPBOX_PUBLIC_TOKEN=pk.abc\nMAPBOX_SECRET_TOKEN=sk.def\n")
        self.assertEqual(env["MAPBOX_PUBLIC_TOKEN"], "pk.abc")
        self.assertEqual(env["MAPBOX_SECRET_TOKEN"], "sk.def")

    def test_ignores_comments_and_blank_lines(self):
        env = gv.parse_dotenv("# a comment\n\nA=1\n   # indented\n")
        self.assertEqual(env, {"A": "1"})

    def test_a_key_with_no_value_is_absent_not_empty(self):
        # .env.example ships with empty values. An empty string would look
        # like a token to the script and produce a baffling 401.
        self.assertEqual(gv.parse_dotenv("MAPBOX_PUBLIC_TOKEN=\n"), {})

    def test_strips_quotes_and_surrounding_space(self):
        env = gv.parse_dotenv('A = "pk.abc" \nB=\'sk.def\'\n')
        self.assertEqual(env["A"], "pk.abc")
        self.assertEqual(env["B"], "sk.def")

    def test_a_value_containing_equals_is_kept_whole(self):
        self.assertEqual(gv.parse_dotenv("A=a=b=c\n")["A"], "a=b=c")


class TestUniqueVenues(unittest.TestCase):
    """Reads the real CSV — this is the number the whole pipeline hangs on."""

    def test_reads_the_venue_column_from_the_real_csv(self):
        csv_path = pathlib.Path(__file__).parent.parent / "src/_data/program-2026.csv"
        venues = gv.unique_venues(csv_path)
        self.assertEqual(len(venues), 69)
        self.assertIn("Jam Factory, ADL CBD", venues)


if __name__ == "__main__":
    unittest.main(verbosity=2)
