# Opsflow Design System

Opsflow is a calm operations workspace for small teams. The interface should feel precise, warm, and quietly confident: a paper-like working surface, deep green actions, rust signals, and enough structure to make busy work easy to scan.

## Product Principles

- **Calm over noisy:** reduce decoration and surface only the next useful action.
- **Editorial but operational:** use expressive headings with compact, highly scannable controls.
- **Workspaces are the anchor:** always make the active workspace visible and easy to change.
- **Progressive density:** show the essential view first; reveal detail through navigation and focused panels.
- **Honest states:** empty, loading, error, and success states should explain what happened and what to do next.

## Visual Direction

### Color

Use CSS variables from `apps/web/app/globals.css` as the source of truth. Do not introduce a new palette per page.

| Token | Value | Use |
| --- | --- | --- |
| `--background` | `#f4f1e9` | Main paper surface |
| `--foreground` | `#17211c` | Primary text |
| `--ink-muted` | `#66736a` | Secondary text |
| `--line` | `#bdc9bd` | Borders and dividers |
| `--green` | `#1e6b55` | Primary action, active state, positive signal |
| `--rust` | `#a16b42` | Eyebrows, highlights, attention signal |

Supporting surfaces may use `#ebe9df` and `#e7eee8`. Red is reserved for destructive or error states. Blue, purple gradients, neon colors, and unrelated dark-mode palettes are not part of the Opsflow product language.

### Typography

- Use Geist for UI text through `--font-geist-sans`.
- Use a restrained serif such as Georgia for major editorial headings only.
- Never use oversized display type inside compact controls, cards, sidebars, or tables.
- Keep letter spacing at `0`; use uppercase and small font size for labels instead of negative tracking.
- Eyebrows and metadata: 10-12px, uppercase, semibold/bold, rust or muted green.
- Body copy: 14-17px with comfortable line height.
- Headings: sentence case, short, and action-oriented.

## Layout Rules

- Full-page application surfaces use `min-height: 100vh`; do not wrap the primary experience in a floating dialog with an arbitrary outer gutter.
- Keep a clear content max width, usually `1100px` for operational views and `1440px` for full-viewport setup pages.
- Desktop dashboard: compact sidebar plus flexible content area.
- Mobile dashboard: hide the desktop sidebar and preserve access to the same destinations through a future mobile navigation pattern.
- Use borders, alignment, and whitespace to create hierarchy. Avoid nested cards and decorative containers around entire page sections.
- Keep stable dimensions for navigation rows, icon buttons, form controls, metric tiles, and table columns.

## Navigation

- The active workspace must be visible in the dashboard shell.
- Sidebar navigation uses compact icon-plus-label rows.
- Active navigation uses `--green` with paper-colored text.
- Utility destinations such as support and settings sit below the primary work destinations.
- Search is a real control with a visible focus state, not decorative placeholder text.
- Use `Link` for navigation and buttons for actions. Do not nest interactive elements.

## Icons

Use `lucide-react` for interface icons. Do not use Unicode symbols, emoji, hand-drawn SVGs, or inconsistent text glyphs for navigation and actions.

- Navigation icons: 15-17px.
- Header icon buttons: 18-20px.
- Icon buttons must have an accessible label and a tooltip when the meaning is not obvious.
- Keep icons aligned in a fixed-width slot so labels do not shift.
- Use icons to support a clear action, never as decoration that competes with the content.

## Components

### Buttons

Primary buttons use `--green`, paper-colored text, square or lightly rounded corners, and a clear action label. Include a Lucide icon when it clarifies the action. Disabled buttons must visibly communicate why they cannot be used.

### Forms

- Always pair inputs with visible labels.
- Show live previews for derived values such as workspace slugs.
- Validate before submit where possible, but show server errors as well.
- Use `:focus-visible` or an equivalent visible focus treatment.
- Keep submit behavior explicit with loading text or a spinner.

### Cards and Panels

Use a panel only when content is genuinely grouped or actionable. Panels use the paper palette, a quiet border, and no excessive shadow. Repeated items should share a consistent row height and hover treatment.

### Metrics

Metrics should show a short uppercase label, a prominent value, and one concise context line. Avoid inventing numbers: use zero states or loading states until the API provides real data.

## Page Patterns

### Authentication

Auth is a branded entry point, not a generic centered form. Use the green brand panel and a focused Clerk form surface. Keep the message concise and make the product name visible immediately.

### Workspace Setup

Workspace creation is a full-viewport page. The left side explains the value of a workspace; the right side contains the creation form and existing workspace list. Show the generated slug while typing. If a user already has a workspace, make the dashboard action more prominent than creating another one.

### Dashboard

The dashboard is a command center, not a marketing page. It should answer:

1. Which workspace is active?
2. What needs attention?
3. What is the next useful action?

Use the compact sidebar, a restrained header, metric summaries, and a focused empty state when data is not available yet.

## States

- **Loading:** use a quiet progress bar or skeleton with the same page background; never flash an empty dashboard.
- **Empty:** explain what the user can create next and provide one primary action.
- **Error:** use clear language, preserve the surrounding layout, and offer retry or a route back to safety.
- **Success:** transition to the next meaningful destination, such as `/dashboard` after workspace creation.
- **Signed out:** route to `/auth`; do not render protected content as if it were available.

## Motion and Accessibility

- Use a few purposeful entrance and state transitions, generally under 700ms.
- Respect `prefers-reduced-motion: reduce`.
- Preserve visible focus styles and sufficient contrast.
- Use semantic landmarks, labels, and `role="alert"` for errors.
- Do not rely on color alone to communicate status.

## Engineering Rules

- Keep shared tokens in `globals.css`; keep route-specific styling in route CSS Modules.
- Prefer existing components and patterns over one-off abstractions.
- Keep API calls authenticated through Clerk `getToken()`.
- Never expose organization data without an authenticated membership check on the API.
- When a new page is added, review it against this document before calling the work complete.
