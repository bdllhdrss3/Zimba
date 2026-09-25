# Asset and Character API

Every asset lives in assets/<category>/<asset-id>/asset.json, with media beside it. IDs are unique across the show. `zimba assets [id]` lists descriptions, capabilities and source paths. The UI renders thumbnails from the actual definitions.

## Manifest

Required: schemaVersion 1, id, name, type, description. Types: character, environment, prop, audio, reference. Optional: tags, width/height, expressions, poses, anchors, shapes, file, duration, text, provenance.

```json
{
  "schemaVersion": 1, "id": "red-mug", "name": "Red mug", "type": "prop",
  "description": "Milo's chipped red mug", "width": 90, "height": 80,
  "shapes": [
    {"type": "Rect", "attrs": {"x": 5, "y": 5, "width": 70, "height": 65, "fill": "#cf5669", "cornerRadius": 8}}
  ]
}
```

## Drawing

Shapes use Konva attributes. Supported types: Group, Rect, Circle, Ellipse, Line, Text, Path, Image. Group accepts children. Path uses SVG path data. Image uses attrs.src relative to the asset folder; PNG/JPEG/WebP/SVG are loaded as images. An SVG image is flattened artwork, not an editable skeleton. Avoid remote resources/fonts inside SVGs. Pre-rasterize unsupported SVG features.

```json
{"type":"Image","attrs":{"src":"body.svg","width":180,"height":270}}
```

Shapes can declare expression, pose and mouth tags. A tagged node is visible only for that active variant. Untagged nodes are always visible. Mouth is open or closed. Declare allowed expression/pose names in the manifest. No fixed anatomy is required; create new silhouettes rather than copying the starter rig everywhere.

Environments are ordered shapes/layers covering the project's framing. Anchors are documented named local points for authors; the current API uses explicit coordinates. Read anchors from JSON or use show-local constants when placing props. Hierarchical attachments, automatic anchor following and gait generation are not part of 0.1; helpers can schedule shared movement.

## Audio

Audio assets specify file and measured duration in seconds. Example: file speech.wav, duration 2.35. Use ffprobe to measure imported audio. The render pipeline places the same cue times as preview, pads silence and limits the mix. Never use a nonexistent audio file as a placeholder.

## References

For an image reference, add a reference-type manifest with file and description beside the image. The catalog displays it; agents can inspect the original file. References do not automatically become animated characters. Explain the intended identity and requested visual properties in the description or feedback comment.

## Reuse

Look up IDs and capabilities before adding art. Add missing items once. Shared edits affect every episode using that asset; get approval and regression-preview affected episodes. Preserve provenance. Generated thumbnails and build bundles are disposable, not source.