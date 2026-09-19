# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.


## Durable visual feedback

2026-09-18: The user rejected V1 because its visual quality fell far short of Anime.js. Functional and responsive checks are not visual acceptance. Do not repeat identical simple slabs and call the architecture design finished. Prioritize distinct silhouettes, visible material/lighting relationships, and generous space for the main object. V2 is a revision awaiting user feedback, not an approved design reference.


## Current direction: readable flowchart (supersedes V2 geometry)

2026-09-18: The user clarified that they envisioned a flowchart and explicitly allowed removing the existing components. They found the mechanical shapes unattractive and too limited for explanatory content. Do not preserve metal, 3D modules, or ornamental objects as a design requirement. Prioritize readable node responsibilities, labelled connectors, and explicit tool loops. Put essential information directly on the diagram; selection reveals deeper source notes. Default to the complete reading view, with the previous scroll narrative available as an optional demonstration. Mobile reading reflows vertically with explicit relationship captions. Do not claim aesthetic approval before user feedback.


## Fold continuity and environment change

2026-09-19: The folded workbench must remain as one horizontal line. Remove the separate Web UI card from the flowchart; request and response paths connect to this same line. Use a distinct flowchart environment after the workbench folds, then restore the workbench environment as it reappears. The current implementation uses a light workspace and dark navy diagram, driven by reversible progress; do not reintroduce a duplicate UI node or replace the line with a mechanical object.
