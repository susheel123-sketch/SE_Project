# Revive — Software Engineering, Fall 2026

Revive is a marketplace that connects owners of broken or unwanted electronics with verified local repair shops. Owners send a repair or trade-in request to up to 3 shops, compare quotes/offers, and track the job until handover.

**Team:** Susheel Kumar (30935) · Muhammad Alam (30592) · Rohan Lohana (31686)

## Links
- **Trello board** (Product Backlog, Definition of Done): https://trello.com/b/jFQGdQdh/revive-software-engineering
- **Repository:** https://github.com/susheel123-sketch/SE_Project

## Tech stack
| Layer | Choice |
|---|---|
| Frontend | React (Vite) |
| Backend | Node.js + Express (REST API) |
| Database & file storage | PostgreSQL + Supabase Storage |
| Maps | Leaflet + OpenStreetMap |
| Hosting | Vercel (frontend), Render (backend) |

## Branching
- `main` — always deployable; updated from `develop` through a reviewed pull request at the end of a sprint
- `develop` — integration branch for the current sprint
- `feature/<card-number>-<short-name>` — one branch per Trello story (e.g. `feature/15-send-request`), merged into `develop` through a pull request with at least one review

## Definition of Done
A story is done only when it meets every item on the **Definition of Done** card (first card on the Trello board) and every acceptance criterion on its own card.
