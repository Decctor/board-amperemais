# dialog

2026-09-05 — engine, resumed the existing progressive migration. Base UI Dialog is now the canonical wrapper; all 22 direct consumers use `components/ui/dialog`.

## Changed

- `components/ui/dialog.tsx`: promoted the existing `dialog-base.tsx` implementation, retaining styles and Base UI Popup/Backdrop/render composition; translated close labels to Portuguese. Removed the temporary wrapper.
- All 22 consumers previously importing `dialog-base` now import `dialog`; import-only intermediate changes consequently disappear from the final diff.
- `components/Settings/AiAgent/Blocks/ModelSelectorField.tsx:55`: migrated the remaining indirect trigger from `asChild` to `render`, with disabled state on the trigger.
- `components/ui/command.tsx:45`: narrowed wrapper children to ReactNode because they render inside Popup; moved title and description into Popup for accessibility. cmdk primitives are unchanged.
- Preserved the user's completed trigger/close conversions in `components/Chats/ChatMediaAttachment.tsx`, `components/Modals/Stats/StatsPeriodComparisonMenu.tsx`, `components/Modals/Users/Blocks/Utils/PermissionsScope.tsx`, `components/Utils/ResponsiveMenuViewOnly.tsx`, and the cancellation guard in `components/Utils/ResponsiveMenu.tsx`.
- Leftover scan is clean for the dialog wrapper: no `radix-ui` or `@radix-ui` imports. No `dialog-base` references remain in app/components.
- Typecheck: the two dialog migration errors from baseline are resolved. Remaining errors were present in baseline: AI transcription APIs in `app/api/integrations/ai/process-media/route.ts` and `lib/ai/ai-media-processing/index.ts`, and casts in `tmp/use-e-abluse-fiscal-profiles.ts`.
- Targeted oxlint: zero errors, 19 existing unused-variable/import warnings. `git diff --check` passes.
- `npm run build`: blocked by the same pre-existing missing `transcribe` export in the two AI media modules above. Final typecheck has 8 errors versus 10 at baseline, with no dialog errors.

## Left alone

- `components/ui/drawer.tsx` (Vaul) and cmdk internals: separate libraries, not part of the dialog primitive migration.
- `components/ui/sheet.tsx`: separate Radix wrapper, intentionally deferred.
- `components/ui/button.tsx`: existing render targets forward refs and render native buttons without asChild; broad Button migration is outside this resumed Dialog task.
- Dependencies and `components.json`: retained for progressive migration. 20 UI wrappers still directly import Radix, including Button/Badge/Sidebar Slot usage.
- Existing skill files and skills-lock changes were preserved. Work remains uncommitted in the user's existing working tree.

## Behavior changes

- Base UI nested dialogs omit an additional backdrop by default. Verify nested modal appearance.
- Base UI owns focus and dismissal; the existing lockClose guard cancels close requests with eventDetails.cancel().
- Shared close labels now read “Fechar”.

## Verify by hand

- Open a chat image, close with Escape, and verify focus returns to its trigger.
- Open the AI model selector, search and choose a model; verify disabled/loading trigger behavior.
- Open a desktop ResponsiveMenu, test backdrop/Escape/close button, then repeat while lockClose is active.
- Open a nested modal and a portaled select/popover inside a modal; verify focus, selection and dismissal.
- Open the command palette and confirm its accessible title, input focus and keyboard selection.
- Check mobile drawers remain usable. Browser verification was not performed in this run.
