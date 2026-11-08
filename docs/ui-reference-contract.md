# Shared inventory interface

Square item library informs compact controls, neutral navigation and flat tables. Plane work-item detail informs request hierarchy and history. References: https://mobbin.com/screens/36ae5076-f9b4-488d-a3b9-ace1d89c8aba and https://mobbin.com/screens/2a0d1ae2-1aab-4bb6-b4eb-7c1b54fd2a32.

Dashboard prioritizes pending work and shortages with calculated counts. Inventory exposes on-hand, held-aside and available quantities. Requests keeps per-item units, status and stock readiness; no mixed-unit total. Shared neutral shell, black primary actions, semantic status colors. On narrow screens controls wrap and tables scroll within their region; detail remains usable full-screen. Preserve empty/error/loading states, keyboard row access, filters, role boundaries and all transactional behavior. No charts, decorative cards or new backend features.

## Component refinement pass

Preserve: the established neutral visual system, all three tabs, URL filters, server roles, stock semantics and API payloads. Existing empty/loading/error states remain. No dependencies or paid services added.

| Priority   | Observed problem                                        | Move and reference                                                                                                                                                                                                      |
| ---------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 Shell    | Two utility rows before the page                        | One utility header, following Stripe's separation of shell and page content: https://mobbin.com/screens/fc5d4bcd-1d9a-4cf1-b2f0-cdecac3a1abf. Exact demo-control placement is product-specific judgement.               |
| 2 Lists    | Filters wrap as separate form stacks                    | Inline labelled selectors beside search, compact Apply control; Square: https://mobbin.com/screens/2ddfa73a-cc73-4312-88b8-cd4a0fb89209.                                                                                |
| 3 Details  | Metadata occupies space before stock decisions          | Compact secondary metadata and flatter sections; Linear detail structure only: https://mobbin.com/screens/beb9d6b3-ec34-46d7-9332-320fcb32a338. Shortage link and its exact placement are inventory-specific judgement. |
| 4 Actions  | Browser popups break the in-app action context          | Native HTML modal dialogs with explicit Cancel and Confirm; Square: https://mobbin.com/screens/f6a677be-0e78-47ae-935a-393c0b78cf4b.                                                                                    |
| 5 Controls | Inconsistent density in rows, status labels and footers | Shared control sizing, text emphasis and compact table controls; Square item library above.                                                                                                                             |

Browser evidence: local receipt 1 → 3 pens; issuance preview paper 12 → 9 and pens 3 → 0. Cancel and failed-write retry/focus behavior covered by component tests. These are local UI checks, not a production release or a new concurrency audit.

## Small controls refinement

- Square create item: https://mobbin.com/screens/360a4aa9-6292-4e36-b3e0-53a2783970ad — compact labelled fields, deliberate grouping, neutral controls and one primary save action.
- Stripe filtered empty state: https://mobbin.com/screens/2b2d5f4f-bdd9-4186-b383-e3b30140a551 — short no-results heading, specific recovery copy and clear-filter action.
- Applied shared input focus/error/disabled treatment, full-width request reason, quiet availability readout, exact shortage copy, consistent button and badge rhythm, and distinct filtered/initial empty states.
- Inventory creation now retains all fields following a failed server action; regression coverage checks retained values and accessible SKU error description.
- References guide presentation only; server authorization, validation, stock rules and database schema remain unchanged.

## Graphical dashboard

- Steep dashboard: https://mobbin.com/screens/e6aba7a1-65b5-4903-ba4a-c892852ca7e0 — structural reference for large headline values paired with restrained bars and rings. Analytics-domain structure only; inventory metric definitions are our own.
- Amplitude chart: https://mobbin.com/screens/9f953ce4-7de1-4528-9832-57063359b799 — explicit time window and readable chart labels; no forecasts or invented comparisons copied.
- Workload is a partition of open requests: pending, approved with available stock, approved with any short line. Readiness is per request, not an allocation promise.
- Stock ring counts supplies, not mixed physical units: healthy, low but positive available, zero available. Holds are deducted from on-hand stock.
- Daily issuance bars cover seven UTC calendar dates, including today. Counts are grouped by fulfilled_at, scoped to the workspace and employee. Seeded demo history is explicitly disclosed.
- Queue takes the earliest five pending and earliest five approved requests, merges by required date and creation date, and displays the earliest five. Stock risks include zero-stock supplies.

## Inventory and Requests graphical summaries

- Shopify orders: https://mobbin.com/screens/168c2cfe-2399-4b47-ae3a-6a3df57970bd — compact graphical summaries above the operational table, keeping filters and rows primary.
- Inventory shows the share of all workspace supplies that are healthy, low stock, or unavailable. Requests shows the share of all visible requests in each lifecycle status, with employee ownership respected.
- Every summary links to its matching stock/status group, clearing other filters. The all-records scope is explicitly labelled. Zero totals produce zero-length bars and 0%, never invalid percentages.
- Summaries are omitted while a detail panel is open to preserve room for the task. No charting dependencies or paid resources added.

Privacy and scenario controls: Airtasker FAQ rows (https://mobbin.com/screens/757cbfd3-4573-4261-8681-f8fbfa25c583) inform custom disclosure treatment; HoneyBook setup tasks (https://mobbin.com/screens/7c915d6b-2a99-4eb0-956d-e7a3a97bb265) inform visible task cards with descriptions. These are structural references from other domains. Privacy uses a styled button with plus/minus, aria-expanded and a controlled panel. Scenario guides remain visible and link to the existing seeded requests. Browser-default disclosure markers are removed.
