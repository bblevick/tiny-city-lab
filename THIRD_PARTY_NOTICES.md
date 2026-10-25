# Third-party notices

Original city map, building geometry, parcel fixtures, interface assets and routing/simulation code are created for this project and MIT licensed. No real-world map tiles, addresses, proprietary game assets, or external delivery data are bundled.

Vite, TypeScript, Vitest and Playwright are development dependencies and retain their upstream licenses in their installed packages. FFmpeg is used locally for demonstration encoding and is not redistributed by this repository.

## OpenStreetMap database

`data/*.osm` and `public/cities/*.json` contain actual OpenStreetMap data, © OpenStreetMap contributors, licensed under the Open Data Commons Open Database License (ODbL) 1.0: https://opendatacommons.org/licenses/odbl/1-0/ . Original database and normalized derivatives retain ODbL; the application MIT license does not relicense this data. Retrieval bounds/URLs, dates and raw/normalized SHA-256 are recorded in `data/*-provenance.json`. Relations are omitted, and coordinates are resolved onto ways. Visible attribution links to https://www.openstreetmap.org/copyright . No affiliation or endorsement is implied.
