# Extend the music-box config format for multiple grid cells

Target repository: [NCAR/music-box](https://github.com/NCAR/music-box) (the
`@ncar/music-box` package). Not music-box-interactive.

## Brief description

The `MusicBox` class always solves one grid cell per call. It always
compiles the non-vectorized solver and always builds a 1-cell state, even
though the underlying `@ncar/musica`/MICM layer already supports many grid
cells in a single vectorized call. Extend `MusicBox`'s public JSON config
format to describe multiple grid cells, so a caller can solve a whole grid
in one call instead of one `MusicBox` instance per cell.

## Acceptance criteria

- A config with no `"grid cells"` key solves exactly as it does today. No
  output changes for any existing caller.
- A config can list grid cells as an array. Each entry can override any
  subset of the shared conditions, using the same inline `data` and
  `filepaths` (CSV) format the existing `conditions` block already uses.
- Each grid cell's effective conditions come from the shared baseline
  conditions, with the cell's own data appended on top. Later blocks
  override earlier ones column by column, the same merge rule
  `ConditionsManager` already applies to multiple inline blocks today.
- A config can instead point `"grid cells"` at one NetCDF file that holds
  conditions for every cell, instead of listing cells one by one.
- The mechanism, the chemistry time step, and the simulation length stay
  shared across every cell. Only conditions vary per cell.
- `solve()` returns one result table per cell when `"grid cells"` is
  present, and returns today's single table, unchanged, when it is absent.

## Ideas

### Per-cell array, reusing the existing conditions format

```json
{
  "box model options": { "...": "..." },
  "mechanism": { "...": "..." },
  "conditions": {
    "filepaths": ["examples/chapman/conditions_Boulder.csv"],
    "data": ["shared inline baseline, same as today"]
  },
  "grid cells": [
    { "conditions": { "data": [{ "headers": ["CONC.O3.mol m-3"], "rows": [[6.0e-9]] }] } },
    { "conditions": { "filepaths": ["examples/chapman/cell_2_overrides.csv"] } },
    { "conditions": { "filepaths": ["examples/chapman/cell_3_overrides.csv"] } }
  ]
}
```

Effective condition blocks for grid cell `k`:

```
resolveConditionsFilepaths(topLevel.filepaths)
  + topLevel.data
  + resolveConditionsFilepaths(gridCells[k].conditions.filepaths)
  + gridCells[k].conditions.data
```

Hand that list to the existing `parseConditions`/`ConditionsManager` code,
unchanged. A cell only needs to state what is different about it; it
inherits temperature, pressure, and every other species from the shared
baseline.

### A single NetCDF file for every cell

```json
"grid cells": {
  "source": "netcdf",
  "filepath": "examples/regional_grid/conditions.nc",
  "cell dimension": "grid_cell",
  "time dimension": "time",
  "variable mapping": {
    "CONC.O3.mol m-3": "o3_concentration",
    "ENV.temperature.K": "temperature",
    "ENV.pressure.Pa": "pressure"
  }
}
```

- `cell dimension` names which axis of each variable indexes grid cells.
  `numberOfGridCells` comes from that dimension's length in the file.
- `time dimension` is optional. A variable with no time axis is a
  time-invariant field, such as an initial concentration.
- `variable mapping` translates the file's own variable names to this
  format's header convention (`CONC.<species>.mol m-3`, `ENV.temperature.K`,
  and so on), since a NetCDF file will not share that naming by default.
- The NetCDF reader's only job is to produce the same
  `{headers, rows}` blocks per cell that the CSV path already produces. No
  other part of the pipeline needs to know the data came from NetCDF.

### Optional: per-cell overrides on top of a NetCDF baseline

Combine both forms so a handful of cells can still be hand-tweaked on top
of a bulk file:

```json
"grid cells": {
  "source": "netcdf",
  "filepath": "examples/regional_grid/conditions.nc",
  "cell dimension": "grid_cell",
  "overrides": [
    { "cell": 5, "conditions": { "data": [{ "headers": ["CONC.O3.mol m-3"], "rows": [[6.0e-9]] }] } }
  ]
}
```

### Open questions to settle before implementation

- NetCDF3 versus NetCDF4. NetCDF3 (classic format) has lightweight, pure
  JavaScript, browser-friendly readers. NetCDF4 is built on HDF5, a much
  heavier dependency to run in a browser. Decide which one this actually
  needs to support before picking a library.
- `solve()`'s return shape. The clean, non-breaking choice: keep returning
  today's bare `{columns, height, data}` object when `"grid cells"` is
  absent, and return an array of that shape, one per cell, only when it is
  present.
- Bonus, separate from the config format: `MusicBox` could always compile
  the vector-ordered solver (`SolverType.rosenbrock`), even for a single
  cell. That variant gives identical results for one cell, so nothing
  breaks, and it removes the need for a caller to bypass `MusicBox` for a
  fast single-cell solve too.

### Why this belongs in music-box, not a caller

`music-box-interactive`'s Isopleths tab currently works around the missing
multi-cell API by driving `@ncar/musica`'s `MICM`/`State` directly and
reimplementing `MusicBox.solve()`'s own timestep loop
(`src/services/simulation/local/vectorizedGridScan.js`). That workaround is
verified correct, but it duplicates logic that should live in one place.
This extension would let that caller (and any other) go back to using
`MusicBox` directly, with `MusicBox` doing the batching internally.
