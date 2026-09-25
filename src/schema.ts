import {z} from 'zod';

export const id = z.string().regex(/^[a-z][a-z0-9_-]*$/).max(80);
const finite = z.number().finite();
export const projectSchema = z.object({
  schemaVersion: z.literal(1), id, title: z.string().min(1),
  width: z.number().int().min(160).max(3840), height: z.number().int().min(160).max(3840),
  fps: z.number().int().min(1).max(60), poseFps: z.number().int().min(1).max(24),
  previewScale: z.number().min(0.1).max(1).default(0.5),
}).strict();
export type Project = z.infer<typeof projectSchema>;
export const episodeSchema = z.object({schemaVersion: z.literal(1), id, title: z.string(), scenes: z.array(z.string().min(1)).min(1)}).strict();
export type Episode = z.infer<typeof episodeSchema>;
export type Shape = {type: 'Group' | 'Rect' | 'Circle' | 'Ellipse' | 'Line' | 'Text' | 'Path' | 'Image'; attrs: Record<string, unknown>; children?: Shape[]; expression?: string; pose?: string; mouth?: 'open' | 'closed'};
export const shapeSchema: z.ZodType<Shape> = z.lazy(() => z.object({
  type: z.enum(['Group', 'Rect', 'Circle', 'Ellipse', 'Line', 'Text', 'Path', 'Image']),
  attrs: z.record(z.unknown()), children: z.array(shapeSchema).optional(),
  expression: z.string().optional(), pose: z.string().optional(), mouth: z.enum(['open', 'closed']).optional(),
}));
export const assetSchema = z.object({
  schemaVersion: z.literal(1), id, name: z.string().min(1), type: z.enum(['character', 'environment', 'prop', 'audio', 'reference']),
  description: z.string(), tags: z.array(z.string()).default([]),
  width: finite.positive().default(200), height: finite.positive().default(200),
  expressions: z.array(z.string()).default([]), poses: z.array(z.string()).default([]),
  anchors: z.record(z.object({x: finite, y: finite})).default({}),
  shapes: z.array(shapeSchema).default([]), file: z.string().optional(),
  duration: finite.positive().optional(), text: z.string().optional(),
  provenance: z.string().default('Original project artwork'),
}).strict().superRefine((asset, ctx) => {
  if (asset.type === 'audio' && (!asset.file || !asset.duration)) ctx.addIssue({code: 'custom', message: 'Audio needs file and duration in seconds'});
});
export type Asset = z.infer<typeof assetSchema> & {source: string; media?: string};
export const transformSchema = z.object({
  x: finite, y: finite, scaleX: finite, scaleY: finite, rotation: finite,
  opacity: finite.min(0).max(1),
});
export type Transform = z.infer<typeof transformSchema>;
const transformPatch = transformSchema.partial();
export const sceneSchema = z.object({
  id, title: z.string(), duration: finite.positive().max(900), environment: id,
  actors: z.array(z.object({id, asset: id, initial: transformSchema, expression: z.string(), pose: z.string()})),
  actions: z.array(z.object({id, target: id, at: finite.nonnegative(), duration: finite.nonnegative(),
    kind: z.enum(['move', 'expression', 'pose', 'camera']), values: transformPatch.optional(), value: z.string().optional(), ease: z.enum(['none', 'power1.inOut', 'back.out(1.7)']).default('none')})),
  audio: z.array(z.object({id, asset: id, at: finite.nonnegative(), duration: finite.positive(), actor: id.optional(), text: z.string().optional(), gain: finite.min(0).max(2)})),
}).strict();
export type Scene = z.infer<typeof sceneSchema>;
export const feedbackSchema = z.object({
  episode: id, scene: id, revision: z.string().regex(/^[a-f0-9]{64}$/),
  frame: z.number().int().nonnegative(), target: z.string().max(100).optional(),
  kind: z.enum(['comment', 'transform', 'timing', 'appearance', 'sketch', 'settings', 'reference']),
  text: z.string().trim().min(1).max(8000),
  proposed: z.record(z.union([finite, z.string().max(1000)])).optional(),
  strokes: z.array(z.array(finite).max(8000)).max(100).optional(),
}).strict();
export type FeedbackInput = z.infer<typeof feedbackSchema>;
export type Feedback = FeedbackInput & {id: string; createdAt: string; status: 'pending' | 'applied' | 'rejected' | 'needs-clarification'; resolution?: string};
export type Production = {project: Project; episode: Episode; assets: Asset[]; scenes: Scene[]; revision: string; feedback: Feedback[]};