# Rusun Twin Analytics

Rusun ASN IKN — Smart Metering Predictive Digital Twin Dashboard

Project Context

I have an existing Smart Metering Dashboard for Rusun ASN in IKN Nusantara.

The existing system already monitors electricity and water consumption from smart meters and provides:

Rusun-level monitoring

Tower-level monitoring

Floor/unit-level monitoring

Electricity consumption

Water consumption

Electricity cost

Daily consumption charts

5-minute consumption readings

Tower comparison

Floor/unit heatmaps

Consumption efficiency categories

Unit resident information

CSV/report export

I want to ENHANCE this existing system into an interactive Building Digital Twin dashboard.

Do NOT replace the existing monitoring concept.

The Digital Twin should become an additional analytical and spatial visualization layer on top of the existing smart-metering system.

1. Design Direction

Create a modern, professional dark-mode Smart City / Building Digital Twin interface.

The design should feel similar to:

Smart City Command Center

Building Management System

Energy Management System

Digital Twin platform

Enterprise analytics dashboard

Use the existing dashboard screenshots as the primary reference for the current UI.

Maintain:

Dark navy background

Dark blue-gray cards

Rounded cards

Clear hierarchy

Compact enterprise dashboard layout

Blue for water

Amber/yellow for electricity

Green for efficient consumption

Yellow/orange for moderate/high consumption

Red for abnormal/high consumption

The interface must remain professional and suitable for an academic final-project prototype and government Smart City context.

2. Main Navigation

Create a left sidebar navigation with:

Overview

3D Digital Twin

Towers

Floor Plans

Units

Analytics

Alerts

Reports

Settings

The main page should open on the Digital Twin / Overview experience.

3. Top-Level Dashboard

At the top of the dashboard show:

Total Electricity

Total Water

Total Cost

Number of Towers

Number of Units

Number of Residents

Include:

Rusun selector

Month/date selector

Electricity / Water / Both filter

Export Report

Refresh Data

Use the existing dashboard screenshots to preserve the existing terminology and hierarchy.

4. Main Digital Twin View

Create a large central panel titled:

"3D Digital Twin — Rusun ASN 3"

Load the provided GLB building model into an interactive 3D viewer.

Use Three.js / React Three Fiber if appropriate.

The 3D model must support:

Orbit rotation

Zoom

Pan

Reset camera

Fullscreen

Selection/highlighting

Tower selection

Floor selection

The 3D model should not be treated as a decorative image.

It is the spatial representation of the building and must be connected to the smart-metering data.

5. Tower Selection

Provide a tower selector:

Tower A

Tower B

Tower C

Tower D

Tower E

Tower F

When a tower is selected:

Highlight the selected tower in the 3D model.

Update the tower statistics.

Update the floor-plan view.

Update electricity and water charts.

Update unit information.

Keep all visualizations synchronized.

Example:

Tower A selected → all displayed analytical information refers to Tower A.

6. Floor Selection

Provide a vertical floor selector beside the 3D model.

Example:

Roof

Floor 10

Floor 9

Floor 8

Floor 7

...

Floor 1

When a floor is selected:

Highlight the corresponding floor in the 3D model.

Display that floor's floor plan.

Display unit-level consumption.

Update the heatmap.

Allow individual unit selection.

7. Interactive Floor Plan Heatmap

This is a major feature.

Use the provided architectural floor-plan image as the visual reference.

Create an interactive floor-plan heatmap similar to the existing Energy Efficiency Grades visualization.

For example:

Floor 10 — Tower A

Display:

Unit A-1001

Unit A-1002

Unit A-1003

Unit A-1004

Unit A-1005

Unit A-1006

etc.

Each unit should be represented by a selectable colored region corresponding to its position on the floor plan.

Do not simply display the floor-plan image as a static picture.

Overlay interactive unit regions on top of the floor plan.

Each unit should display:

Unit number

Electricity consumption

Water consumption

Efficiency/anomaly status

Example:

A-1003
16.5 kWh/day
0.23 m³/day
Wajar

8. Heatmap Categories

Initially use these categories:

Sangat Hemat

Hemat

Wajar

Cukup Boros

Sangat Boros

No Data

Use the existing dashboard's category concept.

The colors should clearly distinguish the categories.

Add a legend.

Also provide a toggle:

Electricity

Water

Cost

Anomaly

This allows the same floor plan to become a multi-dimensional analytical map.

9. Unit Selection

When the user clicks a unit in either:

the 3D model

the floor plan

the unit list

all three representations should synchronize.

Example:

User clicks Unit A-1003.

Then:

3D model:
→ Highlight Unit A-1003

Floor plan:
→ Highlight Unit A-1003

Unit detail:
→ Show Unit A-1003

Charts:
→ Show Unit A-1003 historical data

This synchronization is a key Digital Twin interaction.

10. Unit Detail Panel

Display:

Unit A-1003

Floor

Unit number

Unit type

Number of residents

Electricity consumption

Water consumption

Electricity cost

Efficiency status

Last update

Include buttons:

View 5-Minute Data

View Daily Data

View Monthly Data

Also show small trend indicators:

Electricity Today
Water Today
Cost Today

11. Analytical Dashboard

Add analytical cards for:

Forecast

Electricity forecast

Water forecast

Forecast horizon

Forecast confidence where appropriate

Example:

"Predicted electricity tomorrow: 17.2 kWh/day"

Peak Analysis

Display:

Historical peak

Predicted peak

Peak date/time

Peak consumption

Anomaly Detection

Display:

Normal

Warning

Anomaly

If an anomaly is detected, show:

Unit

Timestamp

Actual consumption

Expected consumption

Deviation

Example:

"Unit A-1009 — electricity consumption 2.4σ above expected pattern."

12. Forecasting

The UI must be designed to support an LSTM forecasting model.

Do not hard-code the concept as random prediction.

The application should have a clean data interface so a real forecasting API/model can later be connected.

Create a placeholder service layer such as:

forecastElectricity()
forecastWater()

The frontend should initially work with mock data if the ML backend is not connected.

Forecast visualization should distinguish:

Historical actual data

Forecast data

Forecast period

13. Electricity Cost Estimation

The existing system already displays electricity cost.

Do not remove that functionality.

Enhance it by allowing:

Historical Cost
+
Predicted Electricity Consumption

Estimated Future Electricity Cost

Display:

Current cost

Historical cost

Predicted cost

Cost trend

The tariff should be configurable rather than hard-coded into UI components.

14. Main Charts

Create three synchronized charts:

Daily Electricity

Show:

Historical electricity consumption

Forecast electricity consumption

Daily Water

Show:

Historical water consumption

Forecast water consumption

Electricity Cost

Show:

Historical cost

Predicted cost

Charts should support:

Hover tooltip

Date selection

Unit/tower filtering

Daily/weekly/monthly views

15. Digital Twin Status

Add an overall Digital Twin status card:

"Digital Twin Status"

Display:

Data Connection: Connected

Last Data Update

Model Status

Forecast Status

Anomaly Engine Status

Example:

Data Connection
● Connected

Last Update
11/08/2026 16:10

Forecast Model
● Ready

Anomaly Detection
● Active

16. Data Architecture

Structure the frontend so it can later connect to the existing smart-metering database/API.

Expected hierarchy:

Rusun
→ Tower
→ Floor
→ Unit
→ Meter
→ Timestamp
→ Electricity / Water consumption

Do not create unnecessary new sensor concepts.

The system is based on EXISTING smart-meter data.

17. Existing Data

I will provide CSV files containing electricity and water smart-meter data.

Use those files to understand the actual data structure.

Do not invent a completely unrelated schema.

Create a clean data-access layer so the prototype can later be connected to Supabase/PostgreSQL or an API.

18. Important Interaction Flow

The main user journey should be:

Rusun Overview
↓
Select Tower
↓
3D Tower View
↓
Select Floor
↓
Floor Plan Heatmap
↓
Select Unit
↓
Unit Detail
↓
Historical Consumption
↓
Forecast
↓
Anomaly / Peak Analysis
↓
Decision Support

The 3D model and floor plan must behave as two synchronized spatial representations of the same building.

19. Performance

The provided building model may be very high-poly.

Do not assume the original model is optimized for web rendering.

Implement the 3D viewer in a way that supports a web-optimized GLB.

Use:

Lazy loading

Loading indicator

Suspense

Proper disposal of Three.js resources

Efficient rendering

Avoid unnecessary re-renders

If the original model is too heavy, make the architecture ready for a lower-poly optimized GLB replacement.

Do not remove the 3D functionality simply because the model is large.

20. Responsive Design

The primary target is desktop/laptop because this is a command-center style dashboard.

Prioritize:

1920×1080
1440×900
1366×768

Maintain readable charts and usable 3D controls.

21. Prototype Scope

This is an academic Digital Twin prototype.

Prioritize:

Existing smart-meter monitoring

3D spatial visualization

Floor-plan heatmap

Unit selection

Historical analytics

Forecast visualization

Peak analysis

Anomaly visualization

Electricity cost estimation

Do not add unrelated smart-city modules such as:

traffic

weather

CCTV

waste management

transportation

Keep the Digital Twin focused on Rusun building utility consumption.

22. Important Concept

The final application should visually communicate this concept:

EXISTING SMART METERING
↓
ELECTRICITY + WATER DATA
↓
ANALYTICAL DIGITAL TWIN
↓
3D BUILDING + FLOOR PLAN
↓
FORECAST + PEAK + ANOMALY + COST
↓
DECISION SUPPORT

The system should feel like an enhancement of the existing Smart Metering Dashboard rather than an unrelated new application.

Build the first version with realistic mock data derived from the provided screenshots/CSV structure, but keep all components modular so they can later be connected to the real backend and LSTM/anomaly-detection services.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/eff804b2-753d-430e-b60f-23418710b513).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
