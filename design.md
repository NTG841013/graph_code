# Graphcode design

source: extracted-from-code

character: Compact, quiet, and practical. Neutral surfaces and small type keep dense developer information easy to scan. Blue marks interactive and selected states. File paths and labels use monospace text.

tokens: `app/globals.css`

## Build mandate

Keep the interface dense and calm. Use the existing neutral surfaces and blue accent. Do not add imagery or motion. Light and dark themes are complete palettes, and the user's system, light, or dark choice takes precedence as selected.

Sign in and sign up use the existing two panel layout with concise Graphcode context beside Clerk's prebuilt form. Organization setup and the shared header stay compact and focused on selecting or creating an organization.

## Component & usage rules

Use the existing CSS variables and Tailwind utilities. Do not add raw color values when a token exists. Keep labels visible, controls keyboard operable, and focus states clear.

Use the existing header for shared account and organization controls. Place the theme control in the shared header and in the authentication shell so it is available on every route.

## Responsive behavior

Keep the two panel authentication layout on wider screens. Stack its panels on narrow screens. Keep organization controls usable at small widths without hiding loading, empty, or error states.
