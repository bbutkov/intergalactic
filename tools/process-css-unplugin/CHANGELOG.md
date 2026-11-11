## [2.0.1] - 2026-11-06

### Fixed

- Duplicated styles in the bundle: the same stylesheet embedded in several modules (e.g. `data-table` Head/Column/Group) produced a separate virtual CSS file for each module. Virtual file names now depend only on the CSS content.
- Support of the new `sstyled.insert` output format (`(sstyled.insert(...)) /*__reshadow_css_end__*/`) and of the `/*__reshadow-styles__*/` marker without `!`.
- Escape sequences (`\n`, `\"`, etc.) in double-quoted CSS strings got into the extracted CSS as is.
- Syntax error (`Module parse failed: Unexpected token`) for esm build of `@semcore/flags` v18: the opening parenthesis is now kept based on the cut code, not on the package name.

## [2.0.0] - 2026-01-21

### Added

- `isolationSuffix` option.

### Break

- `prefix` renamed to `virtualFilesPrefix`

## [1.0.0] - 2025-12-15

### Added

- Introduced `@semcore/process-css-unplugin`.