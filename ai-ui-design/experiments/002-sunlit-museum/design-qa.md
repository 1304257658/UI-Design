# Visual review — WASD museum prototype

Date: 2026-09-17

Final result: **blocked** — visual fidelity is not accepted. This is a visual quality result, not a claim that the application cannot run.

## Evidence

- Reference: [original selected gallery](../../concepts/ui-museum/images/01-quiet-gallery.png), 1487 × 1058.
- Browser capture: [desktop initial](qa/desktop-initial.png), requested viewport 1440 × 1024, captured using browser CDP screenshot. Reviewed with the reference together. Different aspect ratios mean this is a perceptual comparison, not a pixel diff.
- User feedback: “感觉效果和图片差太远了呀，html 真的能做到图片中的效果吗？”
- Local build passed. Browser loaded the 3D scene and navigation; console reported PMREM sampling warnings. No error-level entries appeared in the inspected log sample.
- Full movement, collision, mobile, and exhibit interaction acceptance remain unfinished. The automated held-key attempt was rejected by the browser API before dispatch; it does not establish movement correctness.

## Material mismatches

1. Lighting and contrast: the implementation is washed out and lacks the reference's rich directional light, shade, tree shadows, and warm/cool variation.
2. Architecture and composition: generic room geometry changes the curved enclosure, window depth, foreground, and relative scale of exhibits. The water and planted foreground are missing.
3. Materials: flat color textures lack the reference's stone surface response. Glass lacks the intended readable frosted layers and dimensional edge treatment.
4. Outdoor depth: a cylindrical image backdrop does not reproduce the reference's layered vegetation and scenery from moving viewpoints.
5. Exhibit design: the repeated canvas layout loses the distinct design and composition of the three hero specimens.

## Decision

Keep this experiment as evidence of a failed visual translation, not as an accepted museum. Avoid claiming that successful compilation or the presence of 3D geometry establishes image fidelity.

The proposed next step is a small visual slice: one entrance viewpoint and three exhibits, with authored geometry, material detail, deliberate lighting, and outdoor depth. Judge its still image against the reference before testing nearby viewpoints and scaling to more rooms. An exact match from every viewpoint is not promised by a single generated reference image.
