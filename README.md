# Rusun Twin Analytics

Rusun ASN IKN — Smart Metering Predictive Digital Twin Dashboard

## Intelligence API connection

The dashboard reads **real Supabase smart-meter data** through the NusaWatt
intelligence API. Every page is wired to it:

| Dashboard area | API endpoint | Data |
|---|---|---|
| Rusun/tower/unit selectors | `GET /api/catalog` | real units & towers |
| Stat cards, tower comparison | `GET /api/summary` | real monthly totals |
| Floor-plan heatmap, unit list | `GET /api/summary` | real per-unit usage |
| Unit detail chart | `GET /api/series` | real daily readings |
| Alerts, anomaly panel | `GET /api/anomalies` | real z-score deviations |
| Forecast charts | `POST /api/forecast` | LSTM / avg4 forecasts |

Copy `.env.example` to `.env` and set `VITE_INTELLIGENCE_API_URL` to the
running API's `/api/forecast` URL. The API process owns the Supabase
connection; do not put `SUPABASE_DB_URL` or a secret key in this frontend.

Start the intelligence API from `rusun-intelligence` after training and
forecasting a run:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.forecast_api:app --host 127.0.0.1 --port 8080
```

> The API listens on **8080**, not 8000. Windows reserves ports 7940–8039
> (Docker Desktop), so binding 8000 fails with `winerror 10013`.

### Mock vs real data

Two pieces have **no source in the internal database** and stay illustrative:

- **Residents** — resident data is sensitive and not stored in the internal
  smart-metering database. The resident table in the unit detail panel is
  labelled *illustrative*.
- **5-minute intervals** — the internal database stores daily usage only
  (`daily_usage`). Interval data exists in the resident-facing production
  database, so the 5-minute view is omitted and a note explains why.

Everything else — totals, unit summaries, heatmaps, anomalies, series — is
computed from the real `meter_readings` table. See
[`src/lib/twin/server.ts`](src/lib/twin/server.ts) for the API client and
[`src/lib/twin/data.ts`](src/lib/twin/data.ts) for the remaining helpers.

## Project status

The 3D Digital Twin viewer now uses a procedural Three.js tower instead of a
heavy GLB asset. The tower is generated in code from a traced floor-plan
outline and shared across all six towers, which keeps the viewer lightweight
while preserving the real model's footprint, floor elevations, and three
lightwell openings.

The 3D units are coloured from the **real** monthly summaries returned by
`/api/summary`, so the spatial model reflects actual consumption rather than
generated values.

The current procedural model contains:

- A podium from 0 to 10.67 m
- Ten 3.6 m residential floors
- A roof slab and 1.1 m parapet
- Cream slab-edge bands at every floor
- Generic window panes along the exterior and lightwell edges
- Five shared meshes/material groups, approximately 3.6k triangles and five
  draw calls

This is a stylized analytical model, not a fully detailed architectural
replacement. Staggered balconies, open corridors, and roof pergola frames are
not represented. The floor-plan outline and floor heights are traced from the
original model, while window positions use an assumed 3 m bay spacing.

### Procedural tower files

- [`src/components/twin/ProceduralTower.tsx`](src/components/twin/ProceduralTower.tsx)
  creates the reusable meshes and materials.
- [`src/lib/twin/towerGeometry.ts`](src/lib/twin/towerGeometry.ts) builds and
  caches the geometry.
- [`src/lib/twin/towerShape.ts`](src/lib/twin/towerShape.ts) contains the
  traced footprint, podium, slab bands, parapet, and lightwell holes.
- [`src/lib/twin/towerModel.ts`](src/lib/twin/towerModel.ts) defines model
  dimensions and floor-selection helpers.
- [`scripts/trace-footprint.py`](scripts/trace-footprint.py) can regenerate
  `towerShape.ts` from a dumped copy of another model. See the script header
  for the expected input format and Python dependencies.

## Project context

This project enhances an existing Smart Metering Dashboard for Rusun ASN in
IKN Nusantara. The existing system already monitors electricity and water
consumption from smart meters and provides:

- Rusun-level, tower-level and floor/unit-level monitoring
- Electricity and water consumption
- Electricity cost
- Daily consumption charts
- 5-minute consumption readings
- Tower comparison
- Floor/unit heatmaps
- Consumption efficiency categories
- Unit resident information
- CSV/report export

The goal was to ENHANCE this system into an interactive Building Digital Twin
dashboard, not replace the existing monitoring concept. The Digital Twin is an
additional analytical and spatial visualization layer on top of the existing
smart-metering system.

The current implementation is connected to the real smart-metering database
(through the intelligence API) rather than the mock data the prototype was
first built with. Two items from the original brief remain illustrative
because the internal database does not carry them — see
[Mock vs real data](#mock-vs-real-data) above.

## Features

### Overview
- Stat cards: total electricity, total water, total cost, peak unit, unit and
  tower counts — all from `/api/summary` for the selected month and scope
- Tower comparison bar chart (click a bar to focus that tower)
- Forecast summary cards (electricity, water, estimated future cost, peak)
- Rusun / month / metric selectors and CSV export

### 3D Digital Twin
- Procedural Three.js tower (no heavy GLB asset): podium, ten residential
  floors, roof slab, parapet, slab bands, window panes and lightwell openings
- Orbit / zoom / pan / reset camera / fullscreen
- Tower and floor selection; units coloured by real consumption category
- Synchronised with the floor plan, unit list and unit detail panel

### Towers and Floor Plans
- Per-tower stat cards and unit list
- Interactive floor-plan heatmap (SVG unit regions, not a static image) with
  Electricity / Water / Cost / Anomaly toggle and a category legend
- Unit selection synchronises the 3D model, floor plan, list and detail panel

### Unit Detail
- Monthly totals, averages, cost and efficiency category
- Daily and monthly consumption charts from `/api/series`
- Trend indicators (electricity today, water today, forecast tomorrow)
- Resident table (illustrative — see *Mock vs real data*)

### Analytics
- Forecast horizon selector (7 / 14 / 30 days)
- Historical actual vs forecast charts with confidence band
- Peak analysis and anomaly detection panel

### Reports
- CSV export of per-unit monthly consumption (tower or whole rusun)
- Tower summary export
- Tariff configurable on the Settings page

## Efficiency categories

Electricity (average daily kWh per unit):

| Category | Range |
|---|---|
| Hemat | < 17.81 kWh |
| Normal | 17.81 – 21.46 kWh |
| Boros | 21.47 – 25.11 kWh |
| Sangat Boros | > 25.11 kWh |

Water (average daily m³ per unit):

| Category | Range |
|---|---|
| Hemat | < 0.48 m³ |
| Normal | 0.48 – 0.73 m³ |
| Boros | > 0.73 m³ |

Defined in [`src/lib/twin/config.ts`](src/lib/twin/config.ts) and shown in the
legend on the floor-plan heatmap.

## Data architecture

```
Dashboard (src/lib/twin/server.ts)
  → intelligence API (app/forecast_api.py)
    → Supabase "meteran-cerdas" schema
         complexes → towers → units → meter_readings
```

Hierarchy: Rusun → Tower → Floor → Unit → Meter → Timestamp → Electricity / Water.

The data-access layer is split in two files:

- [`src/lib/twin/server.ts`](src/lib/twin/server.ts) — async API client and
  React Query hooks for all real data (summary, series, anomalies, catalog)
- [`src/lib/twin/data.ts`](src/lib/twin/data.ts) — remaining helpers and the
  illustrative resident data

The browser never receives the database connection string; it only gets
catalog/summary/series/anomaly JSON from the API.

### Data source

From the Supabase `meteran-cerdas` schema:

- `complexes` — rusun (ASN 1–4)
- `towers` — towers within a complex
- `units` — apartments (1,320 across all rusun)
- `meter_readings` — daily electricity/water usage (≈500k rows)

### Forecasting

The UI supports the LSTM forecasting model served by the intelligence API.
The service layer is [`src/lib/twin/forecast.ts`](src/lib/twin/forecast.ts):

- `forecastElectricity()` / `forecastWater()` — `POST /api/forecast` with
  `{ unitIds, monthKey, horizonDays }`
- `forecastCost()` — same forecast multiplied by the configured tariff

The month filter (`monthKey`) selects what the forecast endpoint returns: a
past month shows as-of backtest forecasts, the cutoff month mixes backtest +
live, and a future month shows the live forecast. `meta.forecastType` reports
which one was served.

## Performance notes

The viewer uses a low-poly procedural model rather than the original high-poly
asset. Geometry is cached and shared between towers, materials are shared
between active and dimmed states, and the canvas uses on-demand rendering so
the GPU can idle when the scene is unchanged.

When extending the viewer:

- Use `Suspense` and a loading indicator for scene content
- Avoid duplicating geometry or materials per tower
- Dispose resources only when they are not shared by another tower
- Keep tower selection and floor highlighting synchronised with the
  smart-metering state

## Responsive design

The primary target is desktop/laptop (command-centre dashboard):

- 1920×1080
- 1440×900
- 1366×768

## Scope

Focused on Rusun building utility consumption only. Out of scope: traffic,
weather, CCTV, waste management and transportation modules.

## Tech stack

- React + TypeScript + Vite
- TanStack Start (file-based routing) and TanStack Query (server state)
- React Three Fiber + Three.js (procedural digital twin)
- Recharts (charts), Radix UI + Tailwind CSS (interface)

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm install
npm run dev
```

### Validation

Run the production checks before submitting changes:

```sh
npx tsc --noEmit
npm run lint
npm run build
```

> Note: `npm run lint` currently reports many pre-existing CRLF
> (`Delete ␍`) prettier errors across `src/components/ui/*` and other
> untouched files. Lint only the files you changed, e.g.:
>
> ```sh
> npx eslint src/lib/twin/server.ts src/components/twin/StatCards.tsx
> ```

The targeted tower integration files can be linted independently:

```sh
npx eslint src/components/twin/ProceduralTower.tsx \
  src/components/twin/TwinViewer.tsx \
  src/lib/twin/towerGeometry.ts \
  src/lib/twin/towerModel.ts \
  src/lib/twin/towerShape.ts
```
