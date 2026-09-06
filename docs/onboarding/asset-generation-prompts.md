# Onboarding asset generation

Four transparent PNG illustrations live in `public/images/onboarding/` and are composed by
`app/onboarding/_components/shell/JourneyStory.tsx`. All were generated with the built-in ImageGen
tool, preserved as the original PNG output (1254 × 1254, verified alpha) and served through
`next/image`. Text, numbers and brand marks are never part of the raster; headings and connection
status stay in HTML.

| File | Scene | Used by |
| --- | --- | --- |
| `storefront.png` | Miniature porcelain storefront with empty sign | company details, store appearance, entry and launch steps; the store name is rendered as real text over the sign |
| `whatsapp-connection.png` | Phone, chat bubbles and shopping bag with Meta and WhatsApp marks integrated into the objects | WhatsApp step when the official Cloud API path is active |
| `whatsapp-gateway.png` | Same still life without the Meta tile | WhatsApp step when the connection is the internal gateway |
| `cashback-reward.png` | Shopping bag, curling receipt and gold reward medallion | cashback (CRM) and incentive (ERP) steps |

Art direction shared by the set: cobalt blue `#24549c`, warm gold `#ffb900`, porcelain surfaces,
soft studio light from the upper left, dimensional satin ceramic and matte resin objects, square
canvas with the silhouette inside the central 75 to 80 percent, no floor, no lettering, no
confetti, no watermark. The shopping bag is the recurring object.

Sales, campaign, channel, product and simulation scenes are HTML compositions with vector icons
inside `JourneyStory.tsx`, not rasters.

## Prompts

### Storefront

Production illustration for Brazilian retail CRM and ERP onboarding. Match a premium cobalt blue #24549c and gold #ffb900 dimensional asset family with satin ceramic materials, soft light from upper left, subtle tactile surfaces. One beautiful miniature local storefront, three-quarter frontal view, porcelain building with cobalt blue and porcelain striped awning, large glass shop window with a few simple blue and gold product packages, inviting doorway, small cobalt shopping bag with gold handle beside entrance. Broad EMPTY porcelain sign over awning, no text or letters anywhere. Warm inviting miniature architectural product render with precise rounded bevels. Square image, actual transparent alpha background, no background scene or floor, entire silhouette contained in central 80 percent with generous margin. Calm sophisticated composition, restrained depth, soft contact shadow, no people, no logos, no floating decorative objects, no confetti, no sparkles, no lettering, no watermark. A store coming to life, reusable for company details and launch step.

### WhatsApp connection

Base still life (use case: stylized-concept): create a premium production illustration asset for a Brazilian retail CRM onboarding, WhatsApp connection step. Square canvas with genuinely transparent alpha background. A refined dimensional still life: one upright slightly tilted porcelain-white smartphone with a deep cobalt blue frame, two floating rounded chat bubbles in pale blue and WhatsApp green, and a small matte blue shopping bag at its foot. Phone screen is pale blank with just two simple rounded message shapes, NO text. Leave a clear center in the green bubble and a small white floating rounded-square tile on the upper left. Sophisticated tactile satin ceramic and matte resin, gentle bevels, coherent soft studio light from upper left, soft contact shadows only, three-quarter front camera with restrained perspective. Brand colors cobalt #24549c, warm gold #ffb900 as tiny accent on bag handle, porcelain white and pale blue. Main cluster occupies central 75 percent, entire silhouette and shadows contained with generous padding. No lettering, numbers, watermark, confetti, sparkles, extra icons, background floor, frame or UI screenshot.

Marks edit: integrate an accurate blue Meta infinity mark into the porcelain tile and a white WhatsApp mark into the green chat bubble, with embossed depth, matching perspective, lighting and shading. Preserve the phone, shopping bag, palette and composition. Square canvas, transparent alpha, no text or added objects. If the output paints a checkerboard into the image, follow up: remove only that background, preserve all objects and integrated marks, and output actual PNG alpha transparency.

### WhatsApp gateway

Edit of the connection asset: remove only the Meta tile; preserve the phone, bag, green bubble and integrated WhatsApp logo, keeping the square framing and actual transparent background.

### Cashback reward

Use case: stylized-concept. Production illustration for cashback step of premium Brazilian retail CRM onboarding. Square canvas, genuinely transparent alpha background. Refined dimensional still life: matte cobalt-blue shopping bag with warm gold handles at lower left, one elegantly curling porcelain-white purchase receipt rising behind it (only three understated embossed horizontal blue-gray lines, NO letters or numbers), one prominent thick satin-gold reward medallion at upper right with a simple embossed curved return arrow, a smaller pale-blue token near the base. Arrangement suggests a purchase turning into a reward and return visit. Soft dimensional ceramic/resin craftsmanship, subtle bevels, tactile surfaces, same coherent soft studio light from upper left, gentle contained contact shadows, three-quarter front camera, restrained perspective. Palette deep cobalt #24549c, warm gold #ffb900, porcelain and pale blue. Balanced central composition occupies 75 percent of canvas with generous safe padding, all objects fully visible. No currency marks, lettering, numbers, logos, watermarks, confetti, sparkles, floor or background scene. Transparent background essential.
