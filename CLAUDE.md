@AGENTS.md

## Ganjoor Poem Fetcher
- Use the bundled `/Users/realestomid/.codex/skills/ganjoor-poem-fetcher/scripts/ganjoor_poem.py` helper when a request targets Ganjoor poems. It normalizes full `https://ganjoor.net/...` URLs (only that host), calls `https://api.ganjoor.net` for search or fetch, and can emit either JSON or cleaned text with `--text`.
- Prefer explicit search/fetch subcommands described in `SKILL.md` (search → confirm match before fetching, fetch-url for relative paths, fetch-id for known IDs) so Claude knows exactly which path is being requested.
- Mention the `--compact` flag when you only need the poem body, and include the normalized Ganjoor path in error messages so Claude can relay it if the API returns `404`.
