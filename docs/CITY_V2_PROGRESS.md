# City 2.0 — part 1, work in progress

Owner specification: `claude/release-m:docs/CITY_V2_SPEC.md`.
Base native commit: `bfdaae8`; JS instructions/specification: `c4f2d46`.

## Implemented foundation

- Original deterministic town generator: `tools/city-v2/generate.mjs`.
- All eight district IDs retained; two river crossings, a connected one-way roundabout,
  arterial/collector/local/service roads, four exits, civic reservations.
- 1,024 road records, 3,343 routing nodes, 1,773 initial building footprints.
  The population of 15,000 is a design target, not a simulated resident count.
- Generated data uses the established world origin/metre conversion. Geometry and routing
  consume the same points. T-junctions and driveway junctions explicitly split their parent road.
- Checks: strong directed connectivity, districts and service bases on roads, building clearance
  from carriageways and sidewalks, buildings outside the river, deterministic outputs.
- Five generator tests pass, including deliberately broken graph/placement negative controls.
- `CITY_V2_PLAN.svg` is a schematic for reviewing the town plan, NOT a Godot screenshot.
- `prepare.mjs` and `runtime-wip.patch` reproduce experimental integration in isolated JS/native
  working directories. These are not in the released checkpoint or patch chain yet.

## Verified baseline and findings

The release-m repository's source-import archive is **0.9.0-a**, despite the patch chain requiring
0.9.2-a. Restore the archive from `codex/android-029-claude-c2-e`, verify its accompanying SHA-256,
then apply `patches/apply-claude-092.sh` through release-g1. This recovered baseline passes
**634/634** tests. Do not blindly apply this chain to the archive currently on release-m.

Experimental map exported into `assets/city.json`, `map.json`, routing fixtures and land use;
Godot **4.7.2** imported successfully. UI and simulation bundles compiled; 36 parity fixtures
generated. These are build checks, NOT release acceptance.

Initial integration tests exposed old OSM-specific assumptions (fixed street/node IDs, literal
coordinate and dataset-hash expectations) and real integration work (walking routes, migration,
bridge profiles). Initial native audit caught missing `bridge:false` on roads and stale bridge
profiles; the generator now includes explicit flags and preparation regenerates profiles.
Latest local verification: **641/641 JS**, **51/51 native audit**, **7/7 two-shift parity**, **5/5 generator checks**. The seven new JS checks cover old-save migration and correct transport/service destinations. These gates do not replace visual review or complete the remaining design work; do not publish this draft.

## Remaining before the first APK

1. Review/refine the large grid into distinct district street patterns; add station/railway,
   park furniture, crossing geometry and proper service driveways. Civic footprints are placeholders.
2. Finish physically separated sidewalks and bridge walking links. Current experimental walking
   graph follows road nodes; do not treat it as a completed pedestrian solution.
3. Complete and test all old-save migrations: walking officers, resident destinations, active
   services, custody transport, taxi and pursuit; preserve progression and case/person links.
4. Replace old OSM test fixtures with authored city fixtures, preserving behavioral assertions.
   Do not just delete failing tests or loosen timing to hide regressions.
5. Connect G5 countryside exits and remove outdated coastal assumptions in its placement logic.
6. Rebuild source hash manifest and bundles, rerun 634+ JS tests, native audit 51/51 and long
   shifts 7/7. No release results are claimed for the experimental build.
7. Run portrait/landscape day/night/snow render review. This execution environment has no Xvfb;
   the attempted normal package installation failed due to environment permissions. No renders
   were produced and no permission restriction was bypassed.
8. Only after acceptance: pack checkpoint, PR integration, signed CI APK, verify checksum and
   existing certificate, publish meridian-watch-apk channel and record exact APK/SHA in COLLAB_LOG.

The released checkpoint, signing material, workflows, update channel and website are unchanged.

## Commands

```sh
node --test tools/city-v2/generate.test.mjs
node tools/city-v2/generate.mjs /tmp/city-v2-output
node tools/city-v2/preview.mjs docs/CITY_V2_PLAN.svg
node tools/city-v2/prepare.mjs /path/to/clean-js-release-g1 /path/to/native-map
```

## Reproducible verification

`reconstruct.py` restores pinned 0.9.2 sources by SHA-256 and release-g1 patches. `prepare.mjs` also exports walking.json and bridges.json (previously stale), and `build.mjs` rebuilds manifests and bundles. City V2 CI captures portrait/landscape day, night and snow using the existing render tools. Captures must be inspected before any release.
