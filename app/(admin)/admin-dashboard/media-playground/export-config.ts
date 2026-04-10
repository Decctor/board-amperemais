/** Multiplier for `html-to-image` canvas output — higher = sharper PNG, larger files & memory. */
export const MEDIA_EXPORT_PIXEL_RATIO_OPTIONS = [1, 2, 3] as const;

export type TMediaExportPixelRatio = (typeof MEDIA_EXPORT_PIXEL_RATIO_OPTIONS)[number];

export const DEFAULT_MEDIA_EXPORT_PIXEL_RATIO: TMediaExportPixelRatio = 2;
