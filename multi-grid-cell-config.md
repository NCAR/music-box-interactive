# Extend the music-box config format for multiple grid cells

Target: [NCAR/music-box](https://github.com/NCAR/music-box). Not music-box-interactive.

## Brief description

`MusicBox` always solves one grid cell per call, though the underlying
`@ncar/musica`/MICM layer already supports many cells in one vectorized
call. Extend `MusicBox`'s JSON config to describe multiple grid cells, so
one call solves a whole grid.

## Acceptance criteria

- No `"grid cells"` key: solves exactly as today.
- `"grid cells"` as an array: each entry overrides some conditions, in the
  same inline `data`/`filepaths` format `conditions` already uses.
- A cell's conditions = shared baseline + its own data on top. Later
  blocks win column by column, `ConditionsManager`'s existing merge rule.
- `"grid cells"` can instead point at one NetCDF file for every cell.
- Mechanism, time step, and simulation length stay shared; only
  conditions vary per cell.
- `solve()` returns one table per cell when `"grid cells"` is present,
  else today's single table.

## Ideas

### Per-cell array

```json
{
  "conditions": {
    "filepaths": ["examples/chapman/conditions_Boulder.csv"],
    "data": ["shared inline baseline, same as today"]
  },
  "grid cells": [
    { "conditions": { "data": [{ "headers": ["CONC.O3.mol m-3"], "rows": [[6.0e-9]] }] } },
    { "conditions": { "filepaths": ["examples/chapman/cell_2_overrides.csv"] } }
  ]
}
```

Effective blocks for cell `k`: top-level filepaths + data, then the cell's
own filepaths + data, fed to today's `ConditionsManager` unchanged. A cell
states only what differs; it inherits the rest from the baseline.

### One NetCDF file for every cell

```json
"grid cells": {
  "source": "netcdf",
  "filepath": "examples/regional_grid/conditions.nc",
  "cell dimension": "grid_cell",
  "time dimension": "time",
  "variable mapping": {
    "CONC.O3.mol m-3": "o3_concentration",
    "ENV.temperature.K": "temperature"
  }
}
```

`cell dimension` sets the cell count. `time dimension` is optional; a
variable without it is time-invariant. `variable mapping` translates file
variable names to this format's headers. The reader just produces the
same per-cell `{headers, rows}` blocks the CSV path already does.

### Open questions

- NetCDF3 (light, pure JS) versus NetCDF4/HDF5 (heavier, needs WASM).
- `solve()`'s return shape: array only when `"grid cells"` is present.
- Bonus: always compile the vector-ordered solver, even for one cell --
  same result, no breakage.

### Why here, not in a caller

Isopleths already works around the missing API by driving `MICM`/`State`
directly, reimplementing `MusicBox.solve()`'s timestep loop
(`vectorizedGridScan.js`). Correct, but duplicated. This extension lets
any caller use `MusicBox` directly instead.
