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
