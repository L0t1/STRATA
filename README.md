# IWMS — Intelligent Warehouse Management System

IWMS is a high-performance, enterprise-grade SaaS platform designed for real-time inventory sovereignty, predictive fulfillment, and forensic auditing. It bridges the gap between high-velocity floor operations (via the Field Terminal) and strategic management (via Predictive Analytics).

## 🚀 Advanced Features
- **Field Terminal (Mobile Scanner)**: Optimized UI for real-time Picking, Receiving, and Task completion with QR/Barcode support.
- **Intelligent Stock Reservation**: Sophisticated allocation logic (`Available = Physical - Reserved`) with strict pre-order validation.
- **Weighted Forecasting**: Predictive replenishment using time-weighted Average Daily Sales (ADS) to support new inventory velocity.
- **Forensic Auditing**: Every system mutation is triple-logged via transactional `audit_log` and `inventory_movements` ledgers.
- **Operational Safety Guards**: Logical blocks preventing decommission of facilities with active stock to eliminate "ghost stock" data drift.
- **Role-Based Sovereignty (RBAC)**: Granular permissions for Admin, Manager, and Staff roles across 18 specialized backend modules.

## 🛠️ Tech Stack
- **Engine**: Node.js / Express / TypeScript (18+ Feature Modules)
- **Database**: PostgreSQL (Relational schema + JSONB Audit trails)
- **Frontend**: React 18 / TypeScript / Glassmorphic CSS System
- **Operations**: Docker & Docker Compose / CI-CD with GitHub Actions

## 📖 Documentation
- [📘 **Developer Guide**](docs/DEVELOPER_DOCS.md) — Architecture, API Reference, & Reconciliation Logic.
- [📙 **User Guide**](docs/USER_DOCS.md) — Operational workflows, Field Terminal guide, and UI Reference.
- [📄 **Product Requirements**](IWMS_PRD.md) — Strategic goals, Success metrics, and Persona mapping.

## 🚦 Getting Started

### Local Development
1. Clone the repository and configure `.env`.
2. Run `docker-compose up --build` or start services manually:
   - **Backend**: `cd backend && npm run dev` (Port 4000)
   - **Frontend**: `cd frontend && npm start` (Port 3000)

### Verification
- **Test Suite**: `npm test` in `backend/` or `frontend/` directories.
- **Audit Check**: Access `/api/audit_log` to verify system-level traceability.

## 📄 License
MIT — Documented for absolute rebuildability.
