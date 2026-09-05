# Responsive menus

`components/Utils/ResponsiveMenu.tsx` exports the responsive overlay foundation. It uses Base UI Dialog on desktop (768px and above), and Vaul Drawer on mobile. The default export remains callable with the existing form API for compatibility.

## Composing a menu

```tsx
import ResponsiveMenu from "@/components/Utils/ResponsiveMenu";
import { LoadingButton } from "@/components/loading-button";

<ResponsiveMenu.Root
  open={isOpen}
  onOpenChange={setIsOpen}
  lockClose={isPending}
>
  <ResponsiveMenu.Content dialogVariant="md" drawerVariant="lg">
    <ResponsiveMenu.Header>
      <ResponsiveMenu.Title>Editar produto</ResponsiveMenu.Title>
      <ResponsiveMenu.Description>Atualize os dados do produto.</ResponsiveMenu.Description>
    </ResponsiveMenu.Header>
    <ResponsiveMenu.Body>
      <ProductFields />
    </ResponsiveMenu.Body>
    <ResponsiveMenu.Footer>
      <ResponsiveMenu.Close variant="outline">Cancelar</ResponsiveMenu.Close>
      <LoadingButton loading={isPending} onClick={save}>Salvar</LoadingButton>
    </ResponsiveMenu.Footer>
  </ResponsiveMenu.Content>
</ResponsiveMenu.Root>
```

For conditionally mounted menus, pass `open` and invoke `closeMenu()` when `onOpenChange` receives false. For an uncontrolled menu, omit `open`, optionally supply `defaultOpen`, and place `ResponsiveMenu.Trigger` inside Root before Content. Trigger and Close accept the native project Button props and refs; callers do not need primitive-specific `asChild` or `render` props.

## Responsibilities

- Root owns responsive presentation and uncontrolled open state. Feature hooks continue to own queries, form state, mutations, and success flows.
- Root accepts `lockClose` to block close requests, disable Close controls, hide the desktop X, and disable mobile swipe dismissal. Controlled owners can still close intentionally by changing `open`.
- `onOpenChange(open, details)` can veto a request with `details.cancel()`. Desktop reasons come from Base UI; Vaul exposes only a boolean change, reported as `drawer-change`. Do not rely on desktop-specific reason strings for cross-device logic.
- Root keeps the selected presentation while open to avoid remounting a form during resizing. Reopening uses the current viewport. Nesting a Root inside another mobile Root uses Vaul NestedRoot.
- Content owns sizes and the surface. Use `className` for shared styling and `dialogClassName`/`drawerClassName` for device-specific overrides. Drawer supports `full` (92dvh).
- Header, Title, Description, Body and Footer accept their respective native element props and refs. Supply a meaningful Title, even if visually hidden with `sr-only`.
- Body provides the scroll region. Header and Footer sit outside it. Read-only menus simply compose a Close button; menus without actions omit Footer.
- Footer defaults to both presentations. `visibleOn="desktop"` or `"mobile"` supports device-specific actions without CSS-hidden focusable controls.
- Use Button/LoadingButton directly for business actions. An action does not implicitly close the menu; its mutation or handler controls that decision.

## Loading, errors and success

Render the desired content inside Body. For flows that animate replacement, import `ResponsiveMenuAnimatedBody` from its separate file and use it instead of Body:

```tsx
<ResponsiveMenuAnimatedBody stateKey={isLoading ? "loading" : error ? "error" : "content"}>
  {isLoading ? <LoadingComponent /> : error ? <ErrorComponent msg={error} /> : <FormFields />}
</ResponsiveMenuAnimatedBody>
```

Changing `stateKey` transitions and remounts the body. Keep editable state in the feature hook above that boundary. The helper respects reduced-motion preferences. Success content and whether the footer remains visible are explicit decisions at the call site.

## Migration scope

All 18 ResponsiveMenuV2 consumers and all 6 ResponsiveMenuViewOnly consumers now compose the foundation. Both old wrappers have been removed. Existing callers of the default form API remain compatible; direct Dialog users and those legacy callers can be migrated separately.

Migrated ViewOnly consumers retain their larger desktop `sm` dimensions explicitly. V2/ViewOnly consumers retain their former mobile `sm` cap. The QR connection flow retains its mobile-only footer when connected status hides desktop actions, and client linking retains the full-height mobile drawer.
