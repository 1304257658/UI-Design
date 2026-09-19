# Prototype Instructions

## Confirmed museum direction

- Superseded on 2026-09-17: the user cancelled further museum reproduction and selected the 2D swatch atlas at `../../learning/ui-atlas-2d/`. This museum is a historical experiment. Resume its implementation only when the user explicitly returns to it.

- Visual source: `../../concepts/ui-museum/images/01-quiet-gallery.png`. Preserve its original natural light and tonal depth; the brighter v2 was rejected.
- The user requested trying WASD exploration and asked how the museum can hold many styles. Modular rooms and a searchable directory are the current proposal, not an unlimited-scale implementation.
- On 2026-09-17 the user rejected this prototype's visual fidelity as far from the reference. Treat it as an unaccepted interaction experiment. See `design-qa.md` before visual work.
- Next visual milestone: validate a small scene and the reference entrance composition before expanding the museum. Report visual acceptance separately from build success and control implementation.

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.
