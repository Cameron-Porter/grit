# CSS conventions

Use BEM for component styles: `.workout-card` is a block,
`.workout-card__header` is an element, and `.workout-card--history` is a variant.
Always use a modifier alongside its base class. Name elements by their purpose,
without mirroring every level of the HTML tree.

Keep shared utilities such as `.surface`, `.stack`, and `.cap`, and use existing
theme tokens. Shared controls can remain separate blocks inside a component.
Prefer a single class selector for new styles; avoid adding specificity or
`!important` to work around existing rules.

Migrate one component at a time, updating markup, CSS, and test selectors together.
Workout cards are the first migration; their existing selector specificity and
stylesheet order are retained to preserve the appearance. The `--exercise`
variant distinguishes exercise cards from recovery feedback cards; `--history`
and `--preview` add the corresponding screen treatments.

The import order in `globals.css` is intentional. Consolidating legacy overrides
requires checking computed styles and visual output across themes, responsive
widths, and interactive states before moving declarations between files.
