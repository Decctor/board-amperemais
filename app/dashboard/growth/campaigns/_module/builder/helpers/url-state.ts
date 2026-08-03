import { parseAsStringEnum } from "nuqs";
import { BUILDER_CATEGORY_IDS } from "./categories";
import { BUILDER_STAGE_IDS } from "./stages";

export const categoryParser = parseAsStringEnum<(typeof BUILDER_CATEGORY_IDS)[number]>([...BUILDER_CATEGORY_IDS]);
export const stageParser = parseAsStringEnum<(typeof BUILDER_STAGE_IDS)[number]>([...BUILDER_STAGE_IDS]);
