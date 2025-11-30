# MVP+ Site Layouts

## Product Requirements Document

**Organization:** Pacifico Energy Group
**Document Version:** 1.0.0
**Last Updated:** November 29, 2024
**Status:** Draft for Review
**Classification:** Internal / Confidential

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement & Market Analysis](#2-problem-statement--market-analysis)
3. [Strategic Objectives](#3-strategic-objectives)
4. [User Research & Personas](#4-user-research--personas)
5. [User Stories & Journey Maps](#5-user-stories--journey-maps)
6. [Functional Requirements](#6-functional-requirements)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [System Architecture](#8-system-architecture)
9. [Data Models & Schema Design](#9-data-models--schema-design)
10. [API Specifications](#10-api-specifications)
11. [UI/UX Design Specifications](#11-uiux-design-specifications)
12. [Integration Architecture](#12-integration-architecture)
13. [Security & Compliance](#13-security--compliance)
14. [Testing Strategy](#14-testing-strategy)
15. [Deployment & DevOps](#15-deployment--devops)
16. [Risk Analysis & Mitigation](#16-risk-analysis--mitigation)
17. [Success Metrics & KPIs](#17-success-metrics--kpis)
18. [Appendices](#18-appendices)

---

## 1. Executive Summary

### 1.1 Vision Statement

Transform early-stage real estate due diligence from a labor-intensive, subjective process into an AI-driven, data-optimized workflow that generates preliminary site layouts in minutes rather than days.

### 1.2 Product Overview

The **MVP+ Site Layouts** platform is an intelligent geospatial analysis tool designed to automate the generation of optimized site layouts for energy infrastructure projects. By leveraging machine learning algorithms, topographic analysis, and constraint satisfaction optimization, the platform enables rapid feasibility assessment and cost forecasting for potential development sites.

### 1.3 Key Value Propositions

| Stakeholder          | Value Delivered                                      |
| -------------------- | ---------------------------------------------------- |
| **Site Planners**    | 50% reduction in layout generation time              |
| **Engineers**        | 30% decrease in manual analysis hours                |
| **Project Managers** | 2x increase in sites evaluated per quarter           |
| **Finance Teams**    | Accurate cut/fill cost estimates within 15% variance |
| **Executives**       | Data-driven go/no-go decisions in hours, not weeks   |

### 1.4 Scope Boundaries

**In Scope:**

- Geospatial data ingestion (KMZ/KML, GeoJSON, Shapefiles)
- Terrain analysis and visualization
- Constraint-aware asset placement optimization
- Road network generation
- Cut/fill volume estimation
- Report generation (PDF, KMZ, GeoJSON)

**Out of Scope:**

- Real-time collaboration features
- Mobile application development
- Integration with proprietary CAD systems
- Construction scheduling and project management
- Detailed engineering design (post-feasibility)

---

## 2. Problem Statement & Market Analysis

### 2.1 Current State Analysis

The existing site evaluation workflow at Pacifico Energy Group involves:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    CURRENT STATE WORKFLOW                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [Land Acquisition] ──► [Manual Survey] ──► [CAD Layout] ──► [Review]   │
│       (2-3 days)         (3-5 days)         (5-7 days)      (2-3 days)  │
│                                                                          │
│  Total Cycle Time: 12-18 business days per site                         │
│  Bottlenecks: Manual terrain analysis, subjective placement decisions   │
│  Error Rate: ~25% require significant revisions                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Pain Points Identified

| Category        | Pain Point                                         | Impact                                  |
| --------------- | -------------------------------------------------- | --------------------------------------- |
| **Time**        | Manual layout generation takes 5-7 days            | Missed opportunities, delayed decisions |
| **Cost**        | Senior engineer hours consumed on repetitive tasks | $150-200/hour resource cost             |
| **Quality**     | Subjective placement leads to suboptimal layouts   | 15-20% efficiency loss                  |
| **Scalability** | Limited capacity to evaluate multiple sites        | Competitive disadvantage                |
| **Accuracy**    | Manual cut/fill estimates vary by 30-50%           | Budget overruns, project risk           |

### 2.3 Market Opportunity

The renewable energy sector is experiencing unprecedented growth:

- **$1.3 trillion** invested globally in clean energy (2023)
- **450 GW** of new solar capacity expected by 2025
- **Land acquisition costs** increasing 8-12% annually
- **Competition** for viable sites intensifying

Organizations that can evaluate and secure sites faster gain significant competitive advantage.

### 2.4 Competitive Landscape

| Solution              | Strengths                            | Weaknesses                            |
| --------------------- | ------------------------------------ | ------------------------------------- |
| **Manual Process**    | Flexibility, institutional knowledge | Slow, expensive, error-prone          |
| **Generic CAD**       | Precision, industry standard         | No optimization, steep learning curve |
| **GIS Platforms**     | Data visualization, analysis         | No layout generation, complex         |
| **MVP+ Site Layouts** | Automated, optimized, fast           | New product, learning curve           |

---

## 3. Strategic Objectives

### 3.1 Business Objectives

1. **Accelerate Site Evaluation**: Reduce preliminary layout generation from days to hours
2. **Scale Operations**: Enable evaluation of 3x more sites with existing headcount
3. **Improve Decision Quality**: Data-driven layouts with quantified trade-offs
4. **Reduce Risk**: Accurate cost forecasting to minimize budget surprises
5. **Competitive Positioning**: First-mover advantage in AI-assisted site planning

### 3.2 Product Objectives

1. **Usability**: Intuitive interface accessible to non-GIS specialists
2. **Accuracy**: Cut/fill estimates within 15% of surveyed volumes
3. **Flexibility**: Support for multiple asset types and constraint configurations
4. **Integration**: Seamless export to existing engineering workflows
5. **Reliability**: 99.5% uptime with sub-second response times

### 3.3 Success Criteria

| Metric                     | Current State | Target State        | Measurement Method      |
| -------------------------- | ------------- | ------------------- | ----------------------- |
| Layout Generation Time     | 5-7 days      | 2-4 hours           | System logs             |
| Sites Evaluated/Quarter    | 15-20         | 40-50               | Project tracking        |
| Cut/Fill Estimate Accuracy | ±40%          | ±15%                | Post-construction audit |
| User Adoption Rate         | N/A           | 80% of target users | Usage analytics         |
| Layout Revision Rate       | 25%           | <10%                | QA tracking             |

---

## 4. User Research & Personas

### 4.1 Primary Personas

#### Persona 1: Sarah Chen - Senior Site Planner

```
┌─────────────────────────────────────────────────────────────────────────┐
│  PERSONA: Sarah Chen                                                     │
├─────────────────────────────────────────────────────────────────────────┤
│  Role: Senior Site Planner                                               │
│  Experience: 12 years in renewable energy site development               │
│  Technical Proficiency: Intermediate (CAD, basic GIS)                   │
│                                                                          │
│  Goals:                                                                  │
│  • Quickly assess site viability                                        │
│  • Generate layouts that meet engineering constraints                   │
│  • Reduce repetitive manual work                                        │
│                                                                          │
│  Frustrations:                                                           │
│  • Hours spent on terrain analysis that could be automated              │
│  • Difficulty balancing multiple constraints simultaneously             │
│  • Lack of quantitative comparison between layout alternatives          │
│                                                                          │
│  Quote: "I spend 60% of my time on tasks a computer could do better."   │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Persona 2: Marcus Thompson - Civil Engineer

```
┌─────────────────────────────────────────────────────────────────────────┐
│  PERSONA: Marcus Thompson                                                │
├─────────────────────────────────────────────────────────────────────────┤
│  Role: Civil Engineer                                                    │
│  Experience: 8 years in infrastructure development                       │
│  Technical Proficiency: Advanced (AutoCAD, Civil 3D, GIS)               │
│                                                                          │
│  Goals:                                                                  │
│  • Accurate earthwork volume estimates                                  │
│  • Optimized grading plans that minimize cut/fill                       │
│  • Clear documentation for construction teams                           │
│                                                                          │
│  Frustrations:                                                           │
│  • Preliminary estimates that are wildly inaccurate                     │
│  • Receiving layouts that ignore basic engineering constraints          │
│  • Manual recalculation when layouts change                             │
│                                                                          │
│  Quote: "Bad early estimates cascade into budget problems later."       │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Persona 3: Jennifer Walsh - Project Manager

```
┌─────────────────────────────────────────────────────────────────────────┐
│  PERSONA: Jennifer Walsh                                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  Role: Project Manager                                                   │
│  Experience: 15 years in energy project management                       │
│  Technical Proficiency: Basic (Excel, PM tools)                         │
│                                                                          │
│  Goals:                                                                  │
│  • Fast go/no-go decisions with quantified risk                        │
│  • Clear cost estimates for preliminary budgets                         │
│  • Stakeholder-ready reports and visualizations                         │
│                                                                          │
│  Frustrations:                                                           │
│  • Waiting days/weeks for preliminary analysis                          │
│  • Difficulty comparing multiple site options objectively               │
│  • Technical jargon that obscures key decision factors                  │
│                                                                          │
│  Quote: "I need answers in hours, not weeks."                           │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Secondary Personas

- **Executive Sponsor**: Needs high-level dashboards and portfolio views
- **GIS Specialist**: Requires advanced data manipulation and export options
- **External Consultant**: Needs restricted access with export limitations

---

## 5. User Stories & Journey Maps

### 5.1 Epic Overview

| Epic ID | Epic Name            | Description                                    |
| ------- | -------------------- | ---------------------------------------------- |
| E1      | Data Ingestion       | Import and validate geospatial data            |
| E2      | Terrain Analysis     | Compute and visualize terrain metrics          |
| E3      | Asset Placement      | Optimize infrastructure positioning            |
| E4      | Road Generation      | Create access road networks                    |
| E5      | Volume Estimation    | Calculate cut/fill volumes                     |
| E6      | Report Generation    | Export layouts and analysis                    |
| E7      | Project Management   | Organize and compare sites                     |
| E8      | Sustainability & ESG | Environmental impact and carbon analysis       |
| E9      | Portfolio Analytics  | Cross-site comparison and executive dashboards |

### 5.2 User Stories by Epic

#### Epic 1: Data Ingestion (E1)

| ID     | User Story                                                                                          | Priority | Acceptance Criteria                                        |
| ------ | --------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------- |
| E1-US1 | As a Site Planner, I want to upload KMZ/KML files so that I can define property boundaries          | P0       | File validated, boundary extracted, preview displayed      |
| E1-US2 | As a Site Planner, I want to import topographic contour data so that I can analyze terrain          | P0       | Elevation data parsed, DEM generated, resolution validated |
| E1-US3 | As a Site Planner, I want to define exclusion zones so that assets avoid restricted areas           | P0       | Zones drawn/imported, validated against boundary           |
| E1-US4 | As a Site Planner, I want to import existing infrastructure so that layouts account for constraints | P1       | Features imported, buffers applied                         |
| E1-US5 | As a GIS Specialist, I want to import GeoJSON and Shapefiles so that I can use standard formats     | P1       | All common projections supported, auto-reprojection        |

#### Epic 2: Terrain Analysis (E2)

| ID     | User Story                                                                                    | Priority | Acceptance Criteria                               |
| ------ | --------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------- |
| E2-US1 | As a Civil Engineer, I want to view slope analysis so that I can identify buildable areas     | P0       | Slope calculated, color-coded visualization       |
| E2-US2 | As a Civil Engineer, I want to see aspect analysis so that I can optimize solar orientation   | P0       | Aspect computed, cardinal direction display       |
| E2-US3 | As a Site Planner, I want elevation profiles along transects so that I can understand terrain | P0       | Interactive profile tool, exportable data         |
| E2-US4 | As a Civil Engineer, I want drainage analysis so that I can identify water flow patterns      | P1       | Flow accumulation computed, watershed delineation |
| E2-US5 | As a Site Planner, I want buildability scoring so that I can prioritize areas                 | P1       | Composite score based on configurable weights     |

#### Epic 3: Asset Placement (E3)

| ID     | User Story                                                                                        | Priority | Acceptance Criteria                                  |
| ------ | ------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------- |
| E3-US1 | As a Site Planner, I want to auto-place BESS units so that they're optimally positioned           | P0       | Placement respects constraints, maximizes efficiency |
| E3-US2 | As a Site Planner, I want to position substation areas so that they meet access requirements      | P0       | Located near entry, minimum setbacks maintained      |
| E3-US3 | As a Site Planner, I want to define O&M facilities so that operational needs are met              | P0       | Parking, buildings, laydown areas positioned         |
| E3-US4 | As a Site Planner, I want to manually adjust placements so that I can refine the layout           | P0       | Drag-and-drop with constraint validation             |
| E3-US5 | As a Civil Engineer, I want to compare placement alternatives so that I can select optimal layout | P1       | Side-by-side comparison with metrics                 |

#### Epic 4: Road Generation (E4)

| ID     | User Story                                                                                       | Priority | Acceptance Criteria                           |
| ------ | ------------------------------------------------------------------------------------------------ | -------- | --------------------------------------------- |
| E4-US1 | As a Site Planner, I want auto-generated access roads so that all assets are reachable           | P0       | Roads connect entry to all major assets       |
| E4-US2 | As a Civil Engineer, I want roads to follow terrain so that grading is minimized                 | P0       | Pathfinding considers slope constraints       |
| E4-US3 | As a Site Planner, I want to specify road width requirements so that equipment access is ensured | P0       | Configurable width, turning radii             |
| E4-US4 | As a Civil Engineer, I want road gradient analysis so that I can validate constructability       | P1       | Max grade highlighted, alternatives suggested |

#### Epic 5: Volume Estimation (E5)

| ID     | User Story                                                                                  | Priority | Acceptance Criteria                        |
| ------ | ------------------------------------------------------------------------------------------- | -------- | ------------------------------------------ |
| E5-US1 | As a Civil Engineer, I want cut/fill volume estimates so that I can forecast costs          | P0       | Volumes calculated for each asset pad      |
| E5-US2 | As a Civil Engineer, I want to see net balance (cut vs fill) so that I can optimize hauling | P0       | Balance displayed, haul distance estimated |
| E5-US3 | As a Project Manager, I want cost estimates based on volumes so that I can budget           | P0       | Configurable unit costs applied            |
| E5-US4 | As a Civil Engineer, I want sensitivity analysis so that I can understand cost drivers      | P1       | Impact of grade changes on volumes shown   |

#### Epic 6: Report Generation (E6)

| ID     | User Story                                                                             | Priority | Acceptance Criteria                           |
| ------ | -------------------------------------------------------------------------------------- | -------- | --------------------------------------------- |
| E6-US1 | As a Project Manager, I want PDF reports so that I can share with stakeholders         | P0       | Professional formatting, key metrics included |
| E6-US2 | As a GIS Specialist, I want KMZ export so that I can view in Google Earth              | P0       | All layers included, styled appropriately     |
| E6-US3 | As a Civil Engineer, I want GeoJSON export so that I can import into CAD               | P0       | Accurate coordinates, metadata preserved      |
| E6-US4 | As a Site Planner, I want layout comparison reports so that I can present alternatives | P1       | Multi-layout comparison with pros/cons        |

#### Epic 7: Project Management (E7)

| ID     | User Story                                                                                   | Priority | Acceptance Criteria                     |
| ------ | -------------------------------------------------------------------------------------------- | -------- | --------------------------------------- |
| E7-US1 | As a Project Manager, I want to organize sites into projects so that I can manage portfolios | P1       | Folder structure, search, filtering     |
| E7-US2 | As a Site Planner, I want to save layout versions so that I can track iterations             | P1       | Version history, restore capability     |
| E7-US3 | As an Executive, I want portfolio dashboards so that I can see pipeline status               | P2       | Aggregate metrics, status visualization |

#### Epic 8: Sustainability & ESG (E8)

| ID     | User Story                                                                                                       | Priority | Acceptance Criteria                                  |
| ------ | ---------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------- |
| E8-US1 | As a Project Manager, I want to see the carbon footprint of construction so that I can report to stakeholders    | P1       | CO2 estimate based on earthwork, displayed in report |
| E8-US2 | As an Executive, I want to see net carbon impact over project lifetime so that I can communicate ESG value       | P1       | 25-year projection, comparison to grid baseline      |
| E8-US3 | As a Site Planner, I want to see endangered species habitat overlays so that I can avoid sensitive areas         | P1       | USFWS data displayed, buffer zones highlighted       |
| E8-US4 | As a Site Planner, I want to see wetland boundaries so that I can identify permit requirements                   | P1       | NWI data overlay, wetland type classification        |
| E8-US5 | As a Civil Engineer, I want habitat impact scores so that I can optimize layouts for minimal disturbance         | P1       | Composite score, breakdown by species/habitat type   |
| E8-US6 | As a Project Manager, I want auto-generated environmental permit checklists so that I can plan timelines         | P1       | Required permits listed based on overlaps            |
| E8-US7 | As an Executive, I want ESG summaries in stakeholder reports so that I can demonstrate sustainability commitment | P1       | Professional formatting, key metrics highlighted     |

#### Epic 9: Portfolio Analytics (E9)

| ID     | User Story                                                                                              | Priority | Acceptance Criteria                          |
| ------ | ------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------- |
| E9-US1 | As an Executive, I want a cross-site comparison dashboard so that I can prioritize investments          | P1       | Sortable table, configurable metrics         |
| E9-US2 | As a Project Manager, I want to rank sites by composite score so that I can focus on best opportunities | P1       | Weighted scoring, customizable weights       |
| E9-US3 | As an Executive, I want a portfolio map view so that I can see geographic distribution                  | P1       | Interactive map, site status indicators      |
| E9-US4 | As a Project Manager, I want portfolio-level statistics so that I can report aggregate metrics          | P1       | Total capacity, avg cost, pipeline value     |
| E9-US5 | As an Executive, I want pipeline funnel visualization so that I can track deal flow                     | P1       | Stage-based view, conversion metrics         |
| E9-US6 | As a Site Planner, I want to tag and filter sites so that I can organize by custom criteria             | P1       | Custom tags, multi-filter support            |
| E9-US7 | As an Executive, I want risk-adjusted site scores so that I can account for uncertainty                 | P1       | Risk factors configurable, impact on ranking |
| E9-US8 | As a Project Manager, I want to export portfolio reports so that I can share with stakeholders          | P1       | PDF and Excel formats, customizable sections |

### 5.3 User Journey Map

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        SITE EVALUATION JOURNEY MAP                            │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  PHASE 1: DATA PREPARATION                                                    │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐                    │
│  │ Upload  │───►│ Validate│───►│ Define  │───►│ Review  │                    │
│  │ Files   │    │ Data    │    │ Zones   │    │ Inputs  │                    │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘                    │
│  User: Uploads  System:        User: Draws    User: Confirms                  │
│  KMZ, topo      Validates,     exclusions,    data is correct                │
│  data           shows errors   buffers        before proceeding              │
│                                                                               │
│  PHASE 2: ANALYSIS & OPTIMIZATION                                             │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐                    │
│  │ Terrain │───►│Configure│───►│ Run     │───►│ Review  │                    │
│  │ Analysis│    │ Assets  │    │ Optimize│    │ Results │                    │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘                    │
│  System:        User: Sets     System: Runs   User: Reviews                   │
│  Calculates     asset params,  optimization,  layout, makes                  │
│  slope, aspect  priorities     places assets  adjustments                    │
│                                                                               │
│  PHASE 3: REFINEMENT & EXPORT                                                 │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐                    │
│  │ Adjust  │───►│Calculate│───►│ Generate│───►│ Share/  │                    │
│  │ Layout  │    │ Volumes │    │ Reports │    │ Export  │                    │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘                    │
│  User: Fine-    System:        User: Selects  User: Downloads                 │
│  tunes asset    Computes       report type,   files, shares                  │
│  positions      cut/fill       customizes     with stakeholders              │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Functional Requirements

### 6.1 Requirement Categories

#### P0 - Must Have (MVP)

Critical for initial release. Product cannot launch without these features.

#### P1 - Should Have

Important features that significantly enhance value. Target for MVP+ release.

#### P2 - Nice to Have

Desirable features for future iterations.

### 6.2 Detailed Requirements

#### 6.2.1 Data Ingestion Module

| Req ID    | Requirement                                        | Priority | Notes                                       |
| --------- | -------------------------------------------------- | -------- | ------------------------------------------- |
| FR-DI-001 | System shall accept KMZ file uploads up to 100MB   | P0       | Validate structure, extract KML             |
| FR-DI-002 | System shall accept KML file uploads up to 50MB    | P0       | Support KML 2.2 specification               |
| FR-DI-003 | System shall parse polygon boundaries from KML     | P0       | Support MultiPolygon geometries             |
| FR-DI-004 | System shall accept GeoJSON uploads                | P1       | FeatureCollection with Polygon/MultiPolygon |
| FR-DI-005 | System shall accept Shapefile uploads (zipped)     | P1       | .shp, .shx, .dbf, .prj required             |
| FR-DI-006 | System shall validate coordinate reference systems | P0       | Auto-detect, warn on missing                |
| FR-DI-007 | System shall reproject data to project CRS         | P0       | Support EPSG:4326, UTM zones                |
| FR-DI-008 | System shall parse elevation/contour data          | P0       | DXF contours, GeoTIFF DEMs                  |
| FR-DI-009 | System shall generate DEM from contour data        | P0       | TIN interpolation, configurable resolution  |
| FR-DI-010 | System shall validate data completeness            | P0       | Boundary closure, elevation coverage        |

#### 6.2.2 Terrain Analysis Module

| Req ID    | Requirement                                                       | Priority | Notes                              |
| --------- | ----------------------------------------------------------------- | -------- | ---------------------------------- |
| FR-TA-001 | System shall calculate slope from DEM                             | P0       | Degrees or percent, configurable   |
| FR-TA-002 | System shall calculate aspect from DEM                            | P0       | Cardinal directions, 0-360 degrees |
| FR-TA-003 | System shall calculate elevation differential                     | P0       | Min, max, range within boundary    |
| FR-TA-004 | System shall generate slope classification map                    | P0       | Configurable breakpoints           |
| FR-TA-005 | System shall identify areas exceeding slope threshold             | P0       | Highlight unbuildable zones        |
| FR-TA-006 | System shall calculate terrain ruggedness index                   | P1       | TRI per cell                       |
| FR-TA-007 | System shall compute drainage flow direction                      | P1       | D8 algorithm                       |
| FR-TA-008 | System shall identify drainage accumulation areas                 | P1       | Watershed delineation              |
| FR-TA-009 | System shall generate buildability score                          | P1       | Weighted composite metric          |
| FR-TA-010 | System shall create elevation profile along user-defined transect | P0       | Interactive tool                   |

#### 6.2.3 Asset Placement Module

| Req ID    | Requirement                                                   | Priority | Notes                            |
| --------- | ------------------------------------------------------------- | -------- | -------------------------------- |
| FR-AP-001 | System shall auto-place BESS container arrays                 | P0       | Configurable dimensions, spacing |
| FR-AP-002 | System shall auto-place substation footprint                  | P0       | Size based on capacity           |
| FR-AP-003 | System shall auto-place O&M building                          | P0       | Standard or custom footprint     |
| FR-AP-004 | System shall auto-place parking areas                         | P0       | Based on facility requirements   |
| FR-AP-005 | System shall auto-place laydown/staging areas                 | P0       | Construction requirements        |
| FR-AP-006 | System shall respect property boundary setbacks               | P0       | Configurable distances           |
| FR-AP-007 | System shall respect exclusion zone constraints               | P0       | No asset overlap with zones      |
| FR-AP-008 | System shall respect inter-asset buffer distances             | P0       | Safety and access clearances     |
| FR-AP-009 | System shall respect maximum slope constraints per asset type | P0       | Configurable per asset           |
| FR-AP-010 | System shall optimize placement for minimum earthwork         | P0       | Objective function               |
| FR-AP-011 | System shall allow manual adjustment of placements            | P0       | Drag-and-drop interface          |
| FR-AP-012 | System shall validate constraint compliance on adjustment     | P0       | Real-time feedback               |
| FR-AP-013 | System shall support multiple layout alternatives             | P1       | Generate and compare             |
| FR-AP-014 | System shall support custom asset types                       | P1       | User-defined footprints          |
| FR-AP-015 | System shall support solar panel array placement              | P2       | Row spacing, orientation         |

#### 6.2.4 Road Network Module

| Req ID    | Requirement                                                 | Priority | Notes                           |
| --------- | ----------------------------------------------------------- | -------- | ------------------------------- |
| FR-RN-001 | System shall identify property entry point(s)               | P0       | User-specified or auto-detected |
| FR-RN-002 | System shall generate access roads from entry to assets     | P0       | A\* pathfinding                 |
| FR-RN-003 | System shall respect road width requirements                | P0       | Configurable width              |
| FR-RN-004 | System shall respect maximum road gradient                  | P0       | Configurable max slope          |
| FR-RN-005 | System shall minimize road length while meeting constraints | P0       | Optimization objective          |
| FR-RN-006 | System shall avoid exclusion zones                          | P0       | Hard constraint                 |
| FR-RN-007 | System shall generate internal circulation roads            | P1       | Between assets                  |
| FR-RN-008 | System shall calculate road gradient profile                | P1       | Highlight exceedances           |
| FR-RN-009 | System shall support turning radius constraints             | P1       | For heavy equipment             |

#### 6.2.5 Volume Estimation Module

| Req ID    | Requirement                                           | Priority | Notes                 |
| --------- | ----------------------------------------------------- | -------- | --------------------- |
| FR-VE-001 | System shall calculate cut volume for each asset pad  | P0       | Cubic meters/yards    |
| FR-VE-002 | System shall calculate fill volume for each asset pad | P0       | Cubic meters/yards    |
| FR-VE-003 | System shall calculate net earthwork balance          | P0       | Cut - Fill            |
| FR-VE-004 | System shall calculate road earthwork volumes         | P0       | Along alignment       |
| FR-VE-005 | System shall estimate total project earthwork         | P0       | Sum of all components |
| FR-VE-006 | System shall apply cost factors to volumes            | P0       | $/cubic unit          |
| FR-VE-007 | System shall estimate haul distances                  | P1       | Cut to fill areas     |
| FR-VE-008 | System shall calculate shrink/swell factors           | P1       | Soil type dependent   |
| FR-VE-009 | System shall generate earthwork summary table         | P0       | By component          |
| FR-VE-010 | System shall visualize cut/fill areas on map          | P1       | Color-coded overlay   |

#### 6.2.6 Export & Reporting Module

| Req ID    | Requirement                                                  | Priority | Notes                   |
| --------- | ------------------------------------------------------------ | -------- | ----------------------- |
| FR-ER-001 | System shall export layout as KMZ                            | P0       | Google Earth compatible |
| FR-ER-002 | System shall export layout as GeoJSON                        | P0       | Web/GIS compatible      |
| FR-ER-003 | System shall export layout as PDF report                     | P0       | Professional formatting |
| FR-ER-004 | System shall include terrain analysis in PDF                 | P0       | Maps, profiles          |
| FR-ER-005 | System shall include earthwork summary in PDF                | P0       | Table and charts        |
| FR-ER-006 | System shall include cost estimates in PDF                   | P0       | Summary and breakdown   |
| FR-ER-007 | System shall export raw data as CSV                          | P1       | For external analysis   |
| FR-ER-008 | System shall export DXF for CAD import                       | P1       | AutoCAD compatible      |
| FR-ER-009 | System shall support custom report templates                 | P2       | Branding, sections      |
| FR-ER-010 | System shall generate comparison report for multiple layouts | P1       | Side-by-side metrics    |

#### 6.2.7 Sustainability & ESG Module

| Req ID     | Requirement                                                  | Priority | Notes                                       |
| ---------- | ------------------------------------------------------------ | -------- | ------------------------------------------- |
| FR-ESG-001 | System shall calculate construction carbon footprint         | P1       | Based on earthwork volumes, equipment usage |
| FR-ESG-002 | System shall estimate operational carbon offset              | P1       | Based on energy capacity vs grid mix        |
| FR-ESG-003 | System shall display net carbon impact over project lifetime | P1       | 25-year default horizon                     |
| FR-ESG-004 | System shall overlay USFWS endangered species habitat data   | P1       | Critical habitat boundaries                 |
| FR-ESG-005 | System shall overlay National Wetlands Inventory data        | P1       | Wetland type classification                 |
| FR-ESG-006 | System shall calculate habitat impact score                  | P1       | Weighted by species sensitivity             |
| FR-ESG-007 | System shall identify required environmental permits         | P1       | Based on habitat overlaps                   |
| FR-ESG-008 | System shall generate ESG summary for stakeholder reports    | P1       | Executive-friendly format                   |
| FR-ESG-009 | System shall support custom emission factors                 | P2       | Regional/organizational                     |
| FR-ESG-010 | System shall track cumulative portfolio ESG metrics          | P2       | Aggregate across all sites                  |

#### 6.2.8 Portfolio Analytics Module

| Req ID    | Requirement                                            | Priority | Notes                                      |
| --------- | ------------------------------------------------------ | -------- | ------------------------------------------ |
| FR-PA-001 | System shall display cross-site comparison dashboard   | P1       | Configurable metrics                       |
| FR-PA-002 | System shall rank sites by composite score             | P1       | Weighted criteria                          |
| FR-PA-003 | System shall support custom scoring weights            | P1       | User-configurable                          |
| FR-PA-004 | System shall visualize site locations on portfolio map | P1       | Geographic distribution                    |
| FR-PA-005 | System shall calculate portfolio-level statistics      | P1       | Total capacity, avg cost, etc.             |
| FR-PA-006 | System shall generate pipeline status visualization    | P1       | Funnel/kanban view                         |
| FR-PA-007 | System shall support site tagging and filtering        | P1       | Custom categories                          |
| FR-PA-008 | System shall calculate risk-adjusted site scores       | P1       | Factor in regulatory, interconnection risk |
| FR-PA-009 | System shall export portfolio summary reports          | P1       | PDF, Excel formats                         |
| FR-PA-010 | System shall provide executive dashboard view          | P1       | KPIs, trends, alerts                       |

---

## 7. Non-Functional Requirements

### 7.1 Performance Requirements

| Req ID    | Requirement                    | Target       | Measurement            |
| --------- | ------------------------------ | ------------ | ---------------------- |
| NFR-P-001 | Page load time                 | < 3 seconds  | 95th percentile        |
| NFR-P-002 | File upload processing (100MB) | < 60 seconds | Average                |
| NFR-P-003 | Terrain analysis computation   | < 30 seconds | For 1km² site          |
| NFR-P-004 | Layout optimization            | < 2 minutes  | Standard configuration |
| NFR-P-005 | Report generation              | < 30 seconds | PDF with all sections  |
| NFR-P-006 | Map interaction responsiveness | < 100ms      | Pan, zoom operations   |
| NFR-P-007 | Concurrent users supported     | 50+          | Without degradation    |

### 7.2 Scalability Requirements

| Req ID    | Requirement                       | Target       |
| --------- | --------------------------------- | ------------ |
| NFR-S-001 | Maximum site area supported       | 500 hectares |
| NFR-S-002 | Maximum DEM resolution            | 1 meter      |
| NFR-S-003 | Maximum assets per layout         | 100          |
| NFR-S-004 | Maximum projects per organization | 1000         |
| NFR-S-005 | Maximum concurrent optimizations  | 10           |

### 7.3 Reliability Requirements

| Req ID    | Requirement                       | Target    |
| --------- | --------------------------------- | --------- |
| NFR-R-001 | System uptime                     | 99.5%     |
| NFR-R-002 | Data durability                   | 99.999%   |
| NFR-R-003 | Recovery Point Objective (RPO)    | 1 hour    |
| NFR-R-004 | Recovery Time Objective (RTO)     | 4 hours   |
| NFR-R-005 | Mean Time Between Failures (MTBF) | 720 hours |

### 7.4 Security Requirements

| Req ID      | Requirement                       | Notes               |
| ----------- | --------------------------------- | ------------------- |
| NFR-SEC-001 | All data encrypted at rest        | AES-256             |
| NFR-SEC-002 | All data encrypted in transit     | TLS 1.3             |
| NFR-SEC-003 | Authentication via SSO/OAuth 2.0  | SAML 2.0 support    |
| NFR-SEC-004 | Role-based access control         | Admin, User, Viewer |
| NFR-SEC-005 | Audit logging for all actions     | Immutable logs      |
| NFR-SEC-006 | File upload scanning              | Malware detection   |
| NFR-SEC-007 | Input validation and sanitization | OWASP compliance    |
| NFR-SEC-008 | Session timeout                   | 30 minutes inactive |

### 7.5 Usability Requirements

| Req ID    | Requirement                     | Target                                            |
| --------- | ------------------------------- | ------------------------------------------------- |
| NFR-U-001 | Time to complete basic workflow | < 30 minutes (first use)                          |
| NFR-U-002 | Task success rate               | > 90% without assistance                          |
| NFR-U-003 | Error recovery rate             | > 95% recoverable errors                          |
| NFR-U-004 | Accessibility compliance        | WCAG 2.1 AA                                       |
| NFR-U-005 | Browser support                 | Chrome, Firefox, Safari, Edge (latest 2 versions) |

### 7.6 Compliance Requirements

| Req ID    | Requirement            | Notes          |
| --------- | ---------------------- | -------------- |
| NFR-C-001 | GDPR compliance        | For EU users   |
| NFR-C-002 | SOC 2 Type II          | Data security  |
| NFR-C-003 | Data residency options | US, EU regions |

---

## 8. System Architecture

### 8.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           MVP+ SITE LAYOUTS ARCHITECTURE                      │
└──────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              PRESENTATION LAYER                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Web App   │  │  Map Viewer │  │   Report    │  │   Admin     │        │
│  │   (React)   │  │  (Mapbox)   │  │   Viewer    │  │   Portal    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY LAYER                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  API Gateway (Kong/AWS API Gateway)                                  │    │
│  │  • Rate Limiting  • Authentication  • Request Routing  • Logging    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              APPLICATION LAYER                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Project   │  │   Terrain   │  │  Optimizer  │  │   Export    │        │
│  │   Service   │  │   Service   │  │   Service   │  │   Service   │        │
│  │  (Node.js)  │  │  (Python)   │  │  (Python)   │  │  (Node.js)  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PROCESSING LAYER                                │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Job Queue (Redis/Bull)                                              │    │
│  │  • Terrain Analysis Jobs  • Optimization Jobs  • Export Jobs        │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Worker Pool                                                         │    │
│  │  • Geospatial Workers (GDAL, GeoPandas)                             │    │
│  │  • Optimization Workers (SciPy, OR-Tools)                           │    │
│  │  • Rendering Workers (Matplotlib, ReportLab)                        │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA LAYER                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  PostgreSQL │  │    Redis    │  │     S3      │  │ Elasticsearch│       │
│  │  + PostGIS  │  │   (Cache)   │  │  (Files)    │  │  (Search)   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           INFRASTRUCTURE LAYER                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  AWS / GCP / Azure                                                   │    │
│  │  • ECS/EKS  • RDS  • S3  • CloudFront  • Route53  • CloudWatch     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Component Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         COMPONENT ARCHITECTURE                                │
└──────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  DATA INGESTION COMPONENT                                                    │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                                                                        │  │
│  │  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐            │  │
│  │  │ File    │───►│ Format  │───►│ Geometry│───►│ DEM     │            │  │
│  │  │ Parser  │    │ Validator│   │ Extractor│   │ Generator│           │  │
│  │  └─────────┘    └─────────┘    └─────────┘    └─────────┘            │  │
│  │       │              │              │              │                  │  │
│  │       ▼              ▼              ▼              ▼                  │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │  │
│  │  │                    Data Validation Engine                        │ │  │
│  │  │  • CRS validation  • Topology checks  • Completeness checks     │ │  │
│  │  └─────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  TERRAIN ANALYSIS COMPONENT                                                  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                                                                        │  │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐               │  │
│  │  │   Slope     │    │   Aspect    │    │  Drainage   │               │  │
│  │  │  Calculator │    │  Calculator │    │  Analyzer   │               │  │
│  │  └─────────────┘    └─────────────┘    └─────────────┘               │  │
│  │         │                  │                  │                       │  │
│  │         └──────────────────┼──────────────────┘                       │  │
│  │                            ▼                                          │  │
│  │              ┌─────────────────────────────┐                          │  │
│  │              │   Buildability Scorer       │                          │  │
│  │              │   (Weighted Composite)      │                          │  │
│  │              └─────────────────────────────┘                          │  │
│  │                                                                        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  OPTIMIZATION COMPONENT                                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                                                                        │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                  Constraint Engine                               │  │  │
│  │  │  • Boundary setbacks      • Exclusion zones                     │  │  │
│  │  │  • Slope limits           • Inter-asset buffers                 │  │  │
│  │  │  • Access requirements    • Regulatory constraints              │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  │                            │                                          │  │
│  │                            ▼                                          │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                  Optimization Engine                             │  │  │
│  │  │  • Genetic Algorithm      • Simulated Annealing                 │  │  │
│  │  │  • Constraint Satisfaction • Multi-objective optimization       │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  │                            │                                          │  │
│  │                            ▼                                          │  │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │  │                  Layout Generator                                │  │  │
│  │  │  • Asset placement        • Road network                        │  │  │
│  │  │  • Pad grading            • Volume calculation                  │  │  │
│  │  └─────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.3 Technology Stack

| Layer                     | Technology              | Justification                         |
| ------------------------- | ----------------------- | ------------------------------------- |
| **Frontend**              | React 18 + TypeScript   | Component reusability, type safety    |
| **State Management**      | Zustand                 | Lightweight, minimal boilerplate      |
| **Mapping**               | Mapbox GL JS            | High performance, customizable        |
| **API Gateway**           | Kong / AWS API Gateway  | Rate limiting, authentication         |
| **Backend API**           | Node.js + Express       | Fast I/O, JavaScript ecosystem        |
| **Geospatial Processing** | Python + GDAL/GeoPandas | Industry standard, mature libraries   |
| **Optimization**          | Python + SciPy/OR-Tools | Proven algorithms, active development |
| **Database**              | PostgreSQL + PostGIS    | Spatial queries, ACID compliance      |
| **Cache**                 | Redis                   | Sub-millisecond latency               |
| **File Storage**          | AWS S3                  | Durability, scalability               |
| **Job Queue**             | Bull (Redis-backed)     | Reliability, monitoring               |
| **PDF Generation**        | ReportLab / Puppeteer   | Flexibility, quality                  |
| **Infrastructure**        | AWS (ECS, RDS, S3)      | Enterprise-ready, global reach        |

---

## 9. Data Models & Schema Design

### 9.1 Entity Relationship Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        ENTITY RELATIONSHIP DIAGRAM                            │
└──────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│Organization │───1:N─│   Project   │───1:N─│    Site     │
└─────────────┘       └─────────────┘       └─────────────┘
                                                   │
                      ┌────────────────────────────┼────────────────────────────┐
                      │                            │                            │
                      ▼                            ▼                            ▼
               ┌─────────────┐              ┌─────────────┐              ┌─────────────┐
               │  Boundary   │              │ Exclusion   │              │   Layout    │
               │  (Polygon)  │              │    Zone     │              │  (Version)  │
               └─────────────┘              └─────────────┘              └─────────────┘
                                                                               │
                      ┌────────────────────────────┼────────────────────────────┐
                      │                            │                            │
                      ▼                            ▼                            ▼
               ┌─────────────┐              ┌─────────────┐              ┌─────────────┐
               │    Asset    │              │    Road     │              │  Earthwork  │
               │ (Placement) │              │  (Network)  │              │  (Volumes)  │
               └─────────────┘              └─────────────┘              └─────────────┘
```

### 9.2 Core Entities

#### Organization

```typescript
interface Organization {
  id: UUID;
  name: string;
  slug: string;
  settings: OrganizationSettings;
  createdAt: DateTime;
  updatedAt: DateTime;
}

interface OrganizationSettings {
  defaultUnits: 'metric' | 'imperial';
  defaultCRS: string; // EPSG code
  costFactors: CostFactors;
  assetTemplates: AssetTemplate[];
}
```

#### Project

```typescript
interface Project {
  id: UUID;
  organizationId: UUID;
  name: string;
  description?: string;
  status: 'active' | 'archived' | 'completed';
  metadata: Record<string, any>;
  createdBy: UUID;
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

#### Site

```typescript
interface Site {
  id: UUID;
  projectId: UUID;
  name: string;
  description?: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
    region?: string;
  };
  boundary: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  boundaryArea: number; // square meters
  terrainData: {
    demUrl: string;
    resolution: number;
    minElevation: number;
    maxElevation: number;
    averageSlope: number;
  };
  exclusionZones: ExclusionZone[];
  entryPoints: GeoJSON.Point[];
  status: 'draft' | 'analyzed' | 'optimized' | 'finalized';
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

#### ExclusionZone

```typescript
interface ExclusionZone {
  id: UUID;
  siteId: UUID;
  name: string;
  type: 'wetland' | 'setback' | 'easement' | 'environmental' | 'custom';
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  buffer: number; // additional buffer in meters
  notes?: string;
}
```

#### Layout

```typescript
interface Layout {
  id: UUID;
  siteId: UUID;
  version: number;
  name: string;
  status: 'draft' | 'optimized' | 'approved' | 'rejected';
  configuration: LayoutConfiguration;
  assets: AssetPlacement[];
  roads: RoadNetwork;
  earthwork: EarthworkSummary;
  metrics: LayoutMetrics;
  createdBy: UUID;
  createdAt: DateTime;
  updatedAt: DateTime;
}

interface LayoutConfiguration {
  optimizationObjective: 'min_earthwork' | 'max_capacity' | 'balanced';
  constraints: {
    maxSlope: number;
    boundarySetback: number;
    interAssetBuffer: number;
    maxRoadGrade: number;
    roadWidth: number;
  };
  assetRequirements: AssetRequirement[];
}

interface LayoutMetrics {
  totalArea: number;
  usableArea: number;
  utilizationRate: number;
  totalCutVolume: number;
  totalFillVolume: number;
  netBalance: number;
  estimatedCost: number;
  roadLength: number;
  averageHaulDistance: number;
}
```

#### AssetPlacement

```typescript
interface AssetPlacement {
  id: UUID;
  layoutId: UUID;
  assetType: AssetType;
  name: string;
  geometry: GeoJSON.Polygon;
  centroid: GeoJSON.Point;
  dimensions: {
    length: number;
    width: number;
    area: number;
  };
  elevation: {
    existing: number;
    proposed: number;
    grade: number;
  };
  earthwork: {
    cutVolume: number;
    fillVolume: number;
  };
  constraints: {
    minSetback: number;
    maxSlope: number;
  };
  metadata: Record<string, any>;
}

type AssetType =
  | 'bess_container'
  | 'bess_array'
  | 'substation'
  | 'om_building'
  | 'parking'
  | 'laydown'
  | 'transformer'
  | 'inverter'
  | 'solar_array'
  | 'custom';
```

#### RoadNetwork

```typescript
interface RoadNetwork {
  id: UUID;
  layoutId: UUID;
  segments: RoadSegment[];
  totalLength: number;
  totalEarthwork: {
    cutVolume: number;
    fillVolume: number;
  };
}

interface RoadSegment {
  id: UUID;
  geometry: GeoJSON.LineString;
  length: number;
  width: number;
  grade: number[]; // grade at each vertex
  maxGrade: number;
  avgGrade: number;
  earthwork: {
    cutVolume: number;
    fillVolume: number;
  };
  type: 'access' | 'internal' | 'emergency';
}
```

#### EarthworkSummary

```typescript
interface EarthworkSummary {
  id: UUID;
  layoutId: UUID;
  components: EarthworkComponent[];
  totals: {
    cutVolume: number;
    fillVolume: number;
    netBalance: number;
    importRequired: number;
    exportRequired: number;
  };
  costs: {
    unitCutCost: number;
    unitFillCost: number;
    unitHaulCost: number;
    totalCutCost: number;
    totalFillCost: number;
    totalHaulCost: number;
    grandTotal: number;
  };
  calculatedAt: DateTime;
}

interface EarthworkComponent {
  assetId?: UUID;
  roadSegmentId?: UUID;
  name: string;
  cutVolume: number;
  fillVolume: number;
  avgHaulDistance: number;
}
```

### 9.3 Database Schema (PostgreSQL + PostGIS)

```sql
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Organizations
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    metadata JSONB DEFAULT '{}',
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_org ON projects(organization_id);
CREATE INDEX idx_projects_status ON projects(status);

-- Sites
CREATE TABLE sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    location_lat DOUBLE PRECISION,
    location_lng DOUBLE PRECISION,
    address TEXT,
    region VARCHAR(100),
    boundary GEOMETRY(MULTIPOLYGON, 4326) NOT NULL,
    boundary_area DOUBLE PRECISION,
    dem_url TEXT,
    dem_resolution DOUBLE PRECISION,
    min_elevation DOUBLE PRECISION,
    max_elevation DOUBLE PRECISION,
    avg_slope DOUBLE PRECISION,
    entry_points GEOMETRY(MULTIPOINT, 4326),
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sites_project ON sites(project_id);
CREATE INDEX idx_sites_boundary ON sites USING GIST(boundary);
CREATE INDEX idx_sites_status ON sites(status);

-- Exclusion Zones
CREATE TABLE exclusion_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    geometry GEOMETRY(MULTIPOLYGON, 4326) NOT NULL,
    buffer DOUBLE PRECISION DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exclusion_zones_site ON exclusion_zones(site_id);
CREATE INDEX idx_exclusion_zones_geometry ON exclusion_zones USING GIST(geometry);

-- Layouts
CREATE TABLE layouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft',
    configuration JSONB NOT NULL,
    metrics JSONB DEFAULT '{}',
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(site_id, version)
);

CREATE INDEX idx_layouts_site ON layouts(site_id);
CREATE INDEX idx_layouts_status ON layouts(status);

-- Asset Placements
CREATE TABLE asset_placements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    layout_id UUID REFERENCES layouts(id) ON DELETE CASCADE,
    asset_type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    geometry GEOMETRY(POLYGON, 4326) NOT NULL,
    centroid GEOMETRY(POINT, 4326),
    dimensions JSONB,
    elevation JSONB,
    earthwork JSONB,
    constraints JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_asset_placements_layout ON asset_placements(layout_id);
CREATE INDEX idx_asset_placements_geometry ON asset_placements USING GIST(geometry);
CREATE INDEX idx_asset_placements_type ON asset_placements(asset_type);

-- Road Segments
CREATE TABLE road_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    layout_id UUID REFERENCES layouts(id) ON DELETE CASCADE,
    geometry GEOMETRY(LINESTRING, 4326) NOT NULL,
    length DOUBLE PRECISION,
    width DOUBLE PRECISION,
    grade DOUBLE PRECISION[],
    max_grade DOUBLE PRECISION,
    avg_grade DOUBLE PRECISION,
    earthwork JSONB,
    type VARCHAR(50) DEFAULT 'access',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_road_segments_layout ON road_segments(layout_id);
CREATE INDEX idx_road_segments_geometry ON road_segments USING GIST(geometry);

-- Earthwork Summaries
CREATE TABLE earthwork_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    layout_id UUID REFERENCES layouts(id) ON DELETE CASCADE UNIQUE,
    components JSONB NOT NULL,
    totals JSONB NOT NULL,
    costs JSONB NOT NULL,
    calculated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_earthwork_summaries_layout ON earthwork_summaries(layout_id);

-- Audit Log
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);
```

---

## 10. API Specifications

### 10.1 API Overview

The MVP+ Site Layouts API follows RESTful conventions with JSON request/response bodies. All endpoints require authentication via Bearer token (JWT).

**Base URL:** `https://api.sitelayouts.pacificoenergy.com/v1`

### 10.2 Authentication

```
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET  /auth/me
```

### 10.3 Projects API

```yaml
# List Projects
GET /projects
Query Parameters:
  - status: string (active|archived|completed)
  - page: integer (default: 1)
  - limit: integer (default: 20, max: 100)
Response: 200 OK
{
  "data": [Project],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}

# Create Project
POST /projects
Request Body:
{
  "name": "string (required)",
  "description": "string"
}
Response: 201 Created
{
  "data": Project
}

# Get Project
GET /projects/{projectId}
Response: 200 OK
{
  "data": Project
}

# Update Project
PATCH /projects/{projectId}
Request Body:
{
  "name": "string",
  "description": "string",
  "status": "string"
}
Response: 200 OK

# Delete Project
DELETE /projects/{projectId}
Response: 204 No Content
```

### 10.4 Sites API

```yaml
# List Sites
GET /projects/{projectId}/sites
Response: 200 OK
{
  "data": [Site]
}

# Create Site
POST /projects/{projectId}/sites
Request Body (multipart/form-data):
{
  "name": "string (required)",
  "description": "string",
  "boundaryFile": File (KMZ, KML, GeoJSON),
  "topoFile": File (DXF, GeoTIFF),
  "entryPoints": GeoJSON.MultiPoint
}
Response: 201 Created
{
  "data": Site,
  "job": {
    "id": "uuid",
    "status": "processing",
    "progress": 0
  }
}

# Get Site
GET /sites/{siteId}
Response: 200 OK
{
  "data": Site
}

# Get Site Terrain Analysis
GET /sites/{siteId}/terrain
Query Parameters:
  - metric: string (slope|aspect|elevation|drainage|buildability)
  - format: string (geojson|png)
Response: 200 OK
{
  "data": {
    "metric": "slope",
    "statistics": {
      "min": 0,
      "max": 35.5,
      "mean": 8.2,
      "stdDev": 4.1
    },
    "geojson": GeoJSON.FeatureCollection,
    "rasterUrl": "https://..."
  }
}

# Add Exclusion Zone
POST /sites/{siteId}/exclusion-zones
Request Body:
{
  "name": "string (required)",
  "type": "string (required)",
  "geometry": GeoJSON.Polygon,
  "buffer": number
}
Response: 201 Created

# Delete Exclusion Zone
DELETE /sites/{siteId}/exclusion-zones/{zoneId}
Response: 204 No Content
```

### 10.5 Layouts API

```yaml
# List Layouts
GET /sites/{siteId}/layouts
Response: 200 OK
{
  "data": [Layout]
}

# Generate Layout (Optimization)
POST /sites/{siteId}/layouts
Request Body:
{
  "name": "string",
  "configuration": {
    "optimizationObjective": "min_earthwork",
    "constraints": {
      "maxSlope": 15,
      "boundarySetback": 50,
      "interAssetBuffer": 10,
      "maxRoadGrade": 8,
      "roadWidth": 6
    },
    "assetRequirements": [
      {
        "type": "bess_array",
        "count": 1,
        "dimensions": { "length": 200, "width": 100 }
      },
      {
        "type": "substation",
        "count": 1,
        "dimensions": { "length": 50, "width": 50 }
      }
    ]
  }
}
Response: 202 Accepted
{
  "data": Layout,
  "job": {
    "id": "uuid",
    "status": "processing",
    "estimatedDuration": 120
  }
}

# Get Layout
GET /layouts/{layoutId}
Response: 200 OK
{
  "data": Layout
}

# Update Asset Placement (Manual Adjustment)
PATCH /layouts/{layoutId}/assets/{assetId}
Request Body:
{
  "geometry": GeoJSON.Polygon,
  "elevation": { "proposed": 125.5 }
}
Response: 200 OK
{
  "data": AssetPlacement,
  "validation": {
    "valid": true,
    "warnings": ["Increased cut volume by 15%"]
  }
}

# Recalculate Earthwork
POST /layouts/{layoutId}/recalculate
Response: 200 OK
{
  "data": EarthworkSummary
}

# Approve Layout
POST /layouts/{layoutId}/approve
Response: 200 OK
```

### 10.6 Export API

```yaml
# Export Layout
POST /layouts/{layoutId}/export
Request Body:
{
  "format": "pdf|kmz|geojson|dxf|csv",
  "options": {
    "includeTerrainAnalysis": true,
    "includeEarthworkDetails": true,
    "includeComparison": false
  }
}
Response: 202 Accepted
{
  "job": {
    "id": "uuid",
    "status": "processing"
  }
}

# Get Export Status / Download
GET /exports/{jobId}
Response: 200 OK
{
  "status": "completed",
  "downloadUrl": "https://...",
  "expiresAt": "2024-11-30T12:00:00Z"
}
```

### 10.7 Jobs API

```yaml
# Get Job Status
GET /jobs/{jobId}
Response: 200 OK
{
  "id": "uuid",
  "type": "terrain_analysis|optimization|export",
  "status": "queued|processing|completed|failed",
  "progress": 75,
  "result": { ... },
  "error": null,
  "createdAt": "datetime",
  "completedAt": "datetime"
}

# List Active Jobs
GET /jobs
Query Parameters:
  - status: string
  - type: string
Response: 200 OK
{
  "data": [Job]
}
```

### 10.8 Error Responses

```yaml
# Standard Error Format
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": [
      {
        "field": "configuration.maxSlope",
        "message": "Must be between 0 and 45"
      }
    ],
    "requestId": "uuid"
  }
}

# HTTP Status Codes
400 Bad Request     - Invalid input
401 Unauthorized    - Missing/invalid token
403 Forbidden       - Insufficient permissions
404 Not Found       - Resource not found
409 Conflict        - Resource conflict
422 Unprocessable   - Business logic error
429 Too Many Requests - Rate limit exceeded
500 Internal Error  - Server error
```

---

## 11. UI/UX Design Specifications

### 11.1 Design Principles

1. **Clarity**: Present complex geospatial data in understandable visualizations
2. **Efficiency**: Minimize clicks to accomplish common tasks
3. **Feedback**: Provide real-time validation and progress indication
4. **Flexibility**: Support both guided workflows and expert shortcuts
5. **Consistency**: Maintain uniform patterns across all features

### 11.2 Information Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         INFORMATION ARCHITECTURE                              │
└──────────────────────────────────────────────────────────────────────────────┘

Dashboard
├── Projects List
│   ├── Project Detail
│   │   ├── Sites List
│   │   │   ├── Site Detail
│   │   │   │   ├── Data Import
│   │   │   │   ├── Terrain Analysis
│   │   │   │   ├── Layout Editor
│   │   │   │   │   ├── Asset Placement
│   │   │   │   │   ├── Road Network
│   │   │   │   │   └── Volume Calculator
│   │   │   │   └── Export
│   │   │   └── Site Comparison
│   │   └── Project Settings
│   └── Create Project
├── Templates
│   ├── Asset Templates
│   └── Report Templates
├── Settings
│   ├── Organization Settings
│   ├── User Settings
│   └── Cost Factors
└── Help
    ├── Documentation
    └── Support
```

### 11.3 Key Screens

#### 11.3.1 Dashboard

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  MVP+ Site Layouts                                    [Search] [User Menu]   │
├─────────────────┬────────────────────────────────────────────────────────────┤
│                 │                                                            │
│  📁 Projects    │   RECENT PROJECTS                                         │
│  📐 Templates   │   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │
│  ⚙️ Settings    │   │ Texas Wind  │ │ Arizona     │ │ Nevada BESS │        │
│  ❓ Help        │   │ 5 sites     │ │ Solar       │ │ 2 sites     │        │
│                 │   │ Updated 2d  │ │ 3 sites     │ │ Updated 1w  │        │
│                 │   └─────────────┘ └─────────────┘ └─────────────┘        │
│                 │                                                            │
│                 │   QUICK STATS                                              │
│                 │   ┌───────────────────────────────────────────────────┐   │
│                 │   │ Sites Evaluated: 47  │  Layouts Generated: 128   │   │
│                 │   │ This Quarter: 12     │  Avg Generation Time: 45m │   │
│                 │   └───────────────────────────────────────────────────┘   │
│                 │                                                            │
│                 │   [+ New Project]                                          │
│                 │                                                            │
└─────────────────┴────────────────────────────────────────────────────────────┘
```

#### 11.3.2 Site Editor (Layout Mode)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  ← Back to Project    Site: "Riverside Parcel A"       [Save] [Export ▼]    │
├─────────────────┬────────────────────────────────────────────────────────────┤
│                 │  ┌────────────────────────────────────────────────────┐   │
│  LAYERS         │  │                                                    │   │
│  ☑ Boundary     │  │                     MAP VIEW                       │   │
│  ☑ Exclusions   │  │                                                    │   │
│  ☑ Terrain      │  │    ┌──────────────┐                               │   │
│    ○ Slope      │  │    │    BESS      │      ┌─────┐                  │   │
│    ○ Aspect     │  │    │    Array     │      │ SUB │                  │   │
│    ○ Elevation  │  │    └──────────────┘      └─────┘                  │   │
│  ☑ Assets       │  │                              │                     │   │
│  ☑ Roads        │  │    ────────────────────────────                   │   │
│                 │  │                                                    │   │
│  ASSETS         │  │    [Entry]                                        │   │
│  + Add Asset    │  │                                                    │   │
│  ├ BESS Array   │  └────────────────────────────────────────────────────┘   │
│  ├ Substation   │                                                            │
│  └ O&M Building │  METRICS                                                   │
│                 │  ┌─────────────────────────────────────────────────────┐  │
│  CONSTRAINTS    │  │ Utilization: 68%  │  Cut: 12,500 m³  │ Est: $450K  │  │
│  Max Slope: 15° │  │ Road Length: 850m │  Fill: 8,200 m³  │ Net: 4,300  │  │
│  Setback: 50m   │  └─────────────────────────────────────────────────────┘  │
│                 │                                                            │
│ [Optimize]      │  [< Previous Layout]  Version 3 of 5  [Next Layout >]     │
│                 │                                                            │
└─────────────────┴────────────────────────────────────────────────────────────┘
```

### 11.4 Interaction Patterns

#### Drag-and-Drop Asset Placement

- Assets can be dragged from palette to map
- Real-time constraint validation (red highlight for violations)
- Snap-to-grid option for alignment
- Multi-select for bulk operations

#### Progressive Disclosure

- Basic options visible by default
- Advanced settings in expandable panels
- Tooltips for technical parameters
- Contextual help throughout

#### Feedback Mechanisms

- Toast notifications for background operations
- Progress indicators for long-running tasks
- Inline validation messages
- Success/error states clearly communicated

---

## 12. Integration Architecture

### 12.1 External Data Sources

| Source            | Data Type                 | Integration Method | Update Frequency   |
| ----------------- | ------------------------- | ------------------ | ------------------ |
| **USGS**          | Elevation data (DEMs)     | REST API           | Static (on-demand) |
| **OpenStreetMap** | Road networks, land use   | Overpass API       | Weekly             |
| **FEMA**          | Flood zones               | WMS/WFS            | Monthly            |
| **EPA**           | Environmental constraints | REST API           | Monthly            |
| **NWS**           | Weather data              | REST API           | Real-time          |

### 12.2 Internal System Integrations

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        INTEGRATION ARCHITECTURE                               │
└──────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────────────┐
                    │      MVP+ Site Layouts          │
                    │           (Core)                │
                    └─────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   Identity    │    │   Document    │    │   Project     │
│   Provider    │    │   Management  │    │   Management  │
│   (Okta)      │    │   (SharePoint)│    │   (Jira)      │
└───────────────┘    └───────────────┘    └───────────────┘

┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   GIS         │    │   Financial   │    │   Email/      │
│   Platform    │    │   System      │    │   Notifications│
│   (ArcGIS)    │    │   (SAP)       │    │   (SendGrid)  │
└───────────────┘    └───────────────┘    └───────────────┘
```

### 12.3 Webhook Events

The system publishes events for external consumption:

| Event              | Trigger               | Payload          |
| ------------------ | --------------------- | ---------------- |
| `site.created`     | New site added        | Site details     |
| `layout.optimized` | Optimization complete | Layout summary   |
| `layout.approved`  | Layout approved       | Layout + metrics |
| `export.completed` | Export ready          | Download URL     |
| `job.failed`       | Job failure           | Error details    |

---

## 13. Security & Compliance

### 13.1 Security Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        SECURITY ARCHITECTURE                                  │
└──────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                          PERIMETER SECURITY                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  WAF (AWS WAF)  │  DDoS Protection (Shield)  │  Rate Limiting       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AUTHENTICATION                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  OAuth 2.0 / OIDC  │  SAML 2.0  │  MFA  │  Session Management      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AUTHORIZATION                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Role-Based Access Control (RBAC)  │  Resource-Level Permissions    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATA PROTECTION                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Encryption at Rest (AES-256)  │  Encryption in Transit (TLS 1.3)   │    │
│  │  Key Management (AWS KMS)      │  Data Masking                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 13.2 Role-Based Access Control

| Role        | Permissions                                     |
| ----------- | ----------------------------------------------- |
| **Admin**   | Full access, user management, org settings      |
| **Manager** | Create/edit projects, approve layouts, view all |
| **Analyst** | Create/edit sites, generate layouts, export     |
| **Viewer**  | Read-only access to assigned projects           |
| **API**     | Programmatic access with scoped permissions     |

### 13.3 Data Classification

| Classification   | Examples                            | Handling                            |
| ---------------- | ----------------------------------- | ----------------------------------- |
| **Confidential** | Site locations, business strategies | Encrypted, access logged, no export |
| **Internal**     | Layouts, cost estimates             | Encrypted, role-restricted          |
| **Public**       | Documentation, sample data          | Standard protection                 |

### 13.4 Compliance Requirements

| Framework         | Status   | Notes                 |
| ----------------- | -------- | --------------------- |
| **SOC 2 Type II** | Target   | Annual audit          |
| **GDPR**          | Required | EU user data handling |
| **ISO 27001**     | Future   | Information security  |

---

## 14. Testing Strategy

### 14.1 Testing Pyramid

```
                    ┌───────────────┐
                    │     E2E       │  10%
                    │    Tests      │  - Critical user flows
                    └───────────────┘  - Cross-browser
                   ┌─────────────────┐
                   │   Integration   │  30%
                   │     Tests       │  - API endpoints
                   └─────────────────┘  - Service interactions
                  ┌───────────────────┐
                  │      Unit         │  60%
                  │      Tests        │  - Functions, components
                  └───────────────────┘  - Algorithms, calculations
```

### 14.2 Test Categories

#### Unit Tests

| Component             | Framework                    | Coverage Target |
| --------------------- | ---------------------------- | --------------- |
| Frontend (React)      | Jest + React Testing Library | 80%             |
| Backend (Node.js)     | Jest                         | 85%             |
| Geospatial (Python)   | pytest                       | 90%             |
| Optimization (Python) | pytest                       | 90%             |

#### Integration Tests

| Scope             | Framework                | Focus                       |
| ----------------- | ------------------------ | --------------------------- |
| API Endpoints     | Supertest                | Request/response validation |
| Database          | Jest + testcontainers    | Query correctness           |
| External Services | Nock/Mock Service Worker | Contract testing            |

#### End-to-End Tests

| Scope             | Framework  | Browsers                |
| ----------------- | ---------- | ----------------------- |
| Critical Flows    | Playwright | Chrome, Firefox, Safari |
| Visual Regression | Percy      | Chrome                  |
| Accessibility     | axe-core   | Chrome                  |

### 14.3 Test Data Strategy

- **Synthetic Data**: Generated boundary/terrain datasets
- **Sample Sites**: Curated set of representative site types
- **Edge Cases**: Extreme slopes, complex boundaries, large areas
- **Golden Master**: Verified calculation results for regression testing

### 14.4 Quality Gates

| Stage                 | Criteria                                   |
| --------------------- | ------------------------------------------ |
| **PR Merge**          | All tests pass, no decrease in coverage    |
| **Staging Deploy**    | Integration tests pass, no critical bugs   |
| **Production Deploy** | E2E tests pass, performance benchmarks met |

---

## 15. Deployment & DevOps

### 15.1 Deployment Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        DEPLOYMENT ARCHITECTURE                                │
└──────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              AWS CLOUD                                       │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                           VPC                                          │ │
│  │                                                                        │ │
│  │  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐   │ │
│  │  │  Public Subnet  │    │ Private Subnet  │    │ Private Subnet  │   │ │
│  │  │                 │    │   (App Tier)    │    │  (Data Tier)    │   │ │
│  │  │  ┌───────────┐  │    │                 │    │                 │   │ │
│  │  │  │    ALB    │  │    │  ┌───────────┐  │    │  ┌───────────┐  │   │ │
│  │  │  └───────────┘  │    │  │    ECS    │  │    │  │    RDS    │  │   │ │
│  │  │       │         │    │  │  Cluster  │  │    │  │ PostgreSQL│  │   │ │
│  │  │       │         │    │  └───────────┘  │    │  └───────────┘  │   │ │
│  │  │       ▼         │    │                 │    │                 │   │ │
│  │  │  ┌───────────┐  │    │  ┌───────────┐  │    │  ┌───────────┐  │   │ │
│  │  │  │CloudFront │  │    │  │  Workers  │  │    │  │ ElastiCache│  │   │ │
│  │  │  │   (CDN)   │  │    │  │  (ECS)    │  │    │  │  (Redis)  │  │   │ │
│  │  │  └───────────┘  │    │  └───────────┘  │    │  └───────────┘  │   │ │
│  │  │                 │    │                 │    │                 │   │ │
│  │  └─────────────────┘    └─────────────────┘    └─────────────────┘   │ │
│  │                                                                        │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                │
│  │       S3       │  │   CloudWatch   │  │     Route53    │                │
│  │    (Storage)   │  │  (Monitoring)  │  │     (DNS)      │                │
│  └────────────────┘  └────────────────┘  └────────────────┘                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 15.2 CI/CD Pipeline

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            CI/CD PIPELINE                                     │
└──────────────────────────────────────────────────────────────────────────────┘

  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
  │  Code   │───►│  Build  │───►│  Test   │───►│ Stage   │───►│  Prod   │
  │  Push   │    │         │    │         │    │ Deploy  │    │ Deploy  │
  └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
       │              │              │              │              │
       ▼              ▼              ▼              ▼              ▼
  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
  │ Lint    │    │ Compile │    │ Unit    │    │ E2E     │    │ Smoke   │
  │ Format  │    │ Docker  │    │ Integ   │    │ Perf    │    │ Health  │
  │ Secrets │    │ Build   │    │ Security│    │ Tests   │    │ Check   │
  └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
```

### 15.3 Environment Strategy

| Environment     | Purpose             | Data            | Access     |
| --------------- | ------------------- | --------------- | ---------- |
| **Development** | Feature development | Synthetic       | Developers |
| **Staging**     | Integration testing | Anonymized prod | Team       |
| **Production**  | Live users          | Real data       | Restricted |

### 15.4 Monitoring & Observability

| Layer              | Tool                  | Metrics                            |
| ------------------ | --------------------- | ---------------------------------- |
| **Infrastructure** | CloudWatch            | CPU, memory, disk, network         |
| **Application**    | DataDog / New Relic   | Request latency, error rates       |
| **Business**       | Custom dashboards     | Sites evaluated, layouts generated |
| **Logs**           | CloudWatch Logs + ELK | Centralized logging                |
| **Alerts**         | PagerDuty             | Incident management                |

---

## 16. Risk Analysis & Mitigation

### 16.1 Technical Risks

| Risk                           | Probability | Impact | Mitigation                                       |
| ------------------------------ | ----------- | ------ | ------------------------------------------------ |
| **Optimization performance**   | Medium      | High   | Implement timeout limits, progressive refinement |
| **DEM resolution limitations** | Medium      | Medium | Support multiple data sources, interpolation     |
| **Browser compatibility**      | Low         | Medium | Progressive enhancement, polyfills               |
| **Data accuracy**              | Medium      | High   | Validation pipelines, confidence scoring         |
| **Scalability bottlenecks**    | Low         | High   | Load testing, auto-scaling configuration         |

### 16.2 Business Risks

| Risk                         | Probability | Impact | Mitigation                            |
| ---------------------------- | ----------- | ------ | ------------------------------------- |
| **User adoption resistance** | Medium      | High   | Training program, change management   |
| **Regulatory changes**       | Low         | Medium | Modular constraint engine, updates    |
| **Data availability**        | Low         | Medium | Multiple data source fallbacks        |
| **Competitive response**     | Medium      | Medium | Continuous improvement, IP protection |

### 16.3 Operational Risks

| Risk                      | Probability | Impact   | Mitigation                            |
| ------------------------- | ----------- | -------- | ------------------------------------- |
| **System downtime**       | Low         | High     | Multi-AZ deployment, failover         |
| **Data breach**           | Low         | Critical | Encryption, access controls, auditing |
| **Key person dependency** | Medium      | Medium   | Documentation, cross-training         |

---

## 17. Success Metrics & KPIs

### 17.1 Product Metrics

| Metric                | Definition                          | Target    | Measurement             |
| --------------------- | ----------------------------------- | --------- | ----------------------- |
| **Time to Layout**    | Avg time from data upload to layout | < 2 hours | System logs             |
| **Layout Accuracy**   | Cut/fill estimate vs actual         | ±15%      | Post-construction audit |
| **User Satisfaction** | NPS score                           | > 50      | Quarterly survey        |
| **Feature Adoption**  | % users using each feature          | > 70%     | Analytics               |

### 17.2 Business Metrics

| Metric                      | Definition                                | Target        | Measurement        |
| --------------------------- | ----------------------------------------- | ------------- | ------------------ |
| **Sites Evaluated**         | Sites processed per quarter               | 2x baseline   | System reports     |
| **Engineering Hours Saved** | Time reduction vs manual                  | 30%           | Time tracking      |
| **Decision Velocity**       | Days from site identification to go/no-go | 50% reduction | Process audit      |
| **ROI**                     | (Savings + Revenue) / Cost                | > 300% Year 1 | Financial analysis |

### 17.3 Technical Metrics

| Metric            | Definition                    | Target  | Measurement |
| ----------------- | ----------------------------- | ------- | ----------- |
| **System Uptime** | Availability percentage       | 99.5%   | Monitoring  |
| **API Latency**   | 95th percentile response time | < 500ms | APM         |
| **Error Rate**    | Failed requests / total       | < 0.1%  | Logging     |
| **Build Success** | CI/CD pipeline success rate   | > 95%   | CI metrics  |

### 17.4 Tracking Dashboard

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         SUCCESS METRICS DASHBOARD                             │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  PRODUCT HEALTH                          BUSINESS IMPACT                      │
│  ┌─────────────────────────────┐        ┌─────────────────────────────┐     │
│  │ Time to Layout              │        │ Sites Evaluated             │     │
│  │ ████████░░ 1.8 hrs (Target: 2)     │ ████████████ 45/50          │     │
│  │                              │        │                             │     │
│  │ Layout Accuracy             │        │ Hours Saved                 │     │
│  │ █████████░ ±12% (Target: 15%)      │ ██████████░░ 28% (Target: 30%)   │     │
│  │                              │        │                             │     │
│  │ User Satisfaction           │        │ Decision Velocity           │     │
│  │ ██████████ NPS: 58 (Target: 50)    │ ████████████ 55% faster     │     │
│  └─────────────────────────────┘        └─────────────────────────────┘     │
│                                                                               │
│  TECHNICAL HEALTH                        ADOPTION                             │
│  ┌─────────────────────────────┐        ┌─────────────────────────────┐     │
│  │ Uptime: 99.7%  │  Latency: 320ms   │ Active Users: 42/50         │     │
│  │ Error Rate: 0.05%  │  Deploys: 12   │ Features Used: 85%          │     │
│  └─────────────────────────────┘        └─────────────────────────────┘     │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 18. Appendices

### Appendix A: Glossary

| Term        | Definition                                    |
| ----------- | --------------------------------------------- |
| **BESS**    | Battery Energy Storage System                 |
| **CRS**     | Coordinate Reference System                   |
| **DEM**     | Digital Elevation Model                       |
| **KML/KMZ** | Keyhole Markup Language (Google Earth format) |
| **O&M**     | Operations and Maintenance                    |
| **PostGIS** | PostgreSQL extension for geographic objects   |
| **TIN**     | Triangulated Irregular Network                |

### Appendix B: References

- USGS National Elevation Dataset (NED) Documentation
- OGC GeoJSON Specification
- KML 2.2 Reference
- GDAL/OGR Documentation
- PostGIS Manual

### Appendix C: Revision History

| Version | Date       | Author           | Changes         |
| ------- | ---------- | ---------------- | --------------- |
| 1.0.0   | 2024-11-29 | Engineering Team | Initial release |

### Appendix D: Stakeholder Sign-Off

| Role              | Name | Signature | Date |
| ----------------- | ---- | --------- | ---- |
| Product Owner     |      |           |      |
| Engineering Lead  |      |           |      |
| Design Lead       |      |           |      |
| Security          |      |           |      |
| Executive Sponsor |      |           |      |

---

_This document is confidential and intended for internal use at Pacifico Energy Group._

**Document End**
