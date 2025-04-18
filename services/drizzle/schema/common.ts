import { pgTableCreator } from "drizzle-orm/pg-core";

export const newTable = pgTableCreator((name) => `ampmais_${name}`);
