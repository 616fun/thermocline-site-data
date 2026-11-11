# Thermocline dive-site lists from OpenStreetMap

The dive-site suggestions in the Thermocline dive logbook (iPhone and Mac) come partly from
these four databases. They are offered here free, as the Open Database License asks.

Contains information from OpenStreetMap, © OpenStreetMap contributors, made available under
the Open Database License (ODbL) 1.0. See LICENSE.txt and https://www.openstreetmap.org/copyright.

| File | Sites | Data from | What it is |
|---|---|---|---|
| sites-osm | 6,306 | 2026-11-02 | Dive sites, wrecks and reefs tagged in OpenStreetMap worldwide, and named springs, quarries and lakes in some US states |
| sites-osm-states | 1,487 | 2026-11-03 | Named springs, quarries and lakes across the US states, not already in sites-osm |
| sites-inland | 125 | 2026-11-10 | US inland dive sites (quarries, springs, lakes) checked as dived, positions from OpenStreetMap and its Nominatim search |
| sites-osm-world | 5,895 | 2026-11-09 | Named reefs, cenotes, wrecks and dive spots worldwide that the other lists lack, from Geofabrik's continent extracts |

**Download:** the latest zip under [Releases](https://github.com/616fun/thermocline-site-data/releases/latest). A new release goes up with each app build that changes the lists, and every release is kept, so each build's lists stay available:

| Release | Thermocline iPhone builds | Thermocline Mac builds |
|---|---|---|
| [v2026-11-11](https://github.com/616fun/thermocline-site-data/releases/tag/v2026-11-11) | 26 onward | 11 onward |
| [v2026-11-10](https://github.com/616fun/thermocline-site-data/releases/tag/v2026-11-10) | 25 | 10 |
| [v2026-11-09](https://github.com/616fun/thermocline-site-data/releases/tag/v2026-11-09) | 23–24 | 8–9 |

The build number is the number in brackets after the version: on iPhone under Profile, Version; on Mac in Thermocline > About Thermocline.

Each list comes as SQLite (as the app ships it) and as CSV. Columns:

- `name`, `lat`, `lon` (WGS 84 degrees), `type` (dive_site, wreck, reef, artificial_reef, or water_label for a named spring, quarry or lake), `depth_ft` where tagged, `region`.
- `source_id`: the OpenStreetMap element (node/123, way/456), or the Nominatim result the position came from.
- `other_names` (CSV) or the `aliases` table (SQLite): other spellings the app matches.
- `details`: JSON of OpenStreetMap tags kept (access, entry, sunk date, website, ...), and for some wrecks
  history from Wikidata (CC0, public domain) where the item matched.

Changes from OpenStreetMap: features filtered to diving, deduplicated by name and distance,
dive sites in lakes marked `"water": "fresh"` in `details`, and some names corrected (spelling, "(Wrack)" to "(Wreck)"). Corrections are welcome in
OpenStreetMap itself, where everyone benefits.

Positions are for logging dives, not for navigation.
