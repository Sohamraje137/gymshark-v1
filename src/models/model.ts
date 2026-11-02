import { model, models, type InferSchemaType, type Model, type Schema } from "mongoose";

/**
 * Registers a Mongoose model once. Reusing `models[name]` avoids "OverwriteModelError"
 * when Next.js hot-reloads a model file.
 */
export function defineModel<S extends Schema>(name: string, schema: S) {
  return (models[name] as Model<InferSchemaType<S>>) ?? model(name, schema);
}

/** Calendar day in the client's own time zone, e.g. "2026-11-02". See AGENTS.md. */
export const dayString = {
  type: String,
  required: true,
  match: /^\d{4}-\d{2}-\d{2}$/,
} as const;

/** Where a log entry came from. Imported rows keep their source id in `externalId` for de-duplication. */
export const SOURCES = ["manual", "hevy", "cronometer", "import"] as const;
export type Source = (typeof SOURCES)[number];
