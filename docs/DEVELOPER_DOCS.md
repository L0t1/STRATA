# STRATA — Developer Documentation

## 1. System Overview
The Intelligent Warehouse Management System (**STRATA**) is a production-grade SaaS platform designed for real-time tracking of inventory, warehouse operations, and order fulfillment.

### Core Goals
- **Real-time visibility**: Track stock levels across multiple locations.
- **Operational Efficiency**: Automate picking, packing, and shipping workflows.
- **Data Integrity**: Ensure transactional correctness using PostgreSQL transactions.

---

## 2. Tech Stack

### Backend
- **Framework**: Node.js with Express and TypeScript.
- **Database**: PostgreSQL (pg pool).
- **Auth**: JWT (JSON Web Tokens) with Passport.js for session management (optional).
- **Validation**: Manual schema validation and PostgreSQL constraints.

### Frontend
- **Framework**: React 18 with TypeScript.
- **Styling**: Material UI (MUI) v5 + SASS.
- **Routing**: React Router v7.
- **API Client**: Axios.

### Infrastructure
- **Containerization**: Docker & Docker Compose.
- **Environment**: `.env` based configuration.

---

## 3. Architecture & Code Structure

### Backend (`/backend`)
- `src/index.ts`: Application entry point and middleware configuration.
- `src/db.ts`: Database connection pool.
- `src/middleware/`: Global middlewares (Auth, Pagination, Error Handling).
- `src/modules/`: Feature-based routing (Inventory, Orders, Tasks, etc.).

---

## 4. Operational Workflows

### 4.1 Automated Fulfillment Loop
The system implements a "Full-Circle Fulfillment" loop to minimize manual task entry:
1. **Order Creation**: When a `POST /api/orders` request is successful, the system automatically inserts a `pick` task for every item into the `tasks` table.
2. **Task Assignment**: Managers can then assign these pending tasks to staff members.
3. **Execution**: Staff use the Field Terminal to confirm picks, which auto-resolves the associated task and completes the inventory adjustment.

### Frontend (`/frontend`)
- `src/App.tsx`: Routing and protected route logic.
- `src/pages/`: Component-based page views.
- `src/components/`: Reusable UI components (Navbar, Footer, ProtectedRoute).
- `src/styles/`: Global styles and themes.

---

## 4. API Reference

The IWMS API is organized into 18 functional modules. All endpoints require a valid JWT except for authentication.

### Core Operations
- **Inventory (`/api/inventory`)**: Master stock records, CRUD, and bulk import/export.
- **Orders (`/api/orders`)**: Order lifecycle, stock reservation, and fulfillment status.
- **Scanner (`/api/scanner`)**: Field terminal endpoints for real-time Picking and Receiving.
- **Tasks (`/api/tasks`)**: Operational workflow management, queueing, and discovery notes.

### Facilities & Logic
- **Warehouse (`/api/warehouse`)**: Physical site management with deletion guards.
- **Locations (`/api/locations`)**: Zone/Aisle/Shelf mapping within warehouses.
- **Replenishment (`/api/replenishment`)**: Predictive modeling and automated PO generation.
- **Cycle Counts (`/api/cycle_counts`)**: Inventory audit batches and reconciliation logic.

### Intelligence & Analytics
- **Analytics (`/api/analytics`)**: Real-time telemetry (Accuracy Index, Pipeline Efficiency).
- **Dashboard (`/api/dashboard`)**: Aggregated metrics for managerial visibility.
- **Reports (`/api/reports`)**: Forensic data extraction and historical trends.

### Administration & Safety
- **Auth (`/api/auth`)**: JWT-based identity management.
- **Users (`/api/users`)**: RBAC profile management.
- **Audit Log (`/api/audit_log`)**: System-wide forensic event tracking.

---

## 5. Critical Business Logic

### A. Stock Reservation System
Stock is managed using a three-tier quantity model:
- `quantity`: Physical units on hand.
- `reserved_quantity`: Units allocated to pending orders.
- `Available Stock` (Calculated): `quantity - reserved_quantity`.

The system prevents orders from being created if `Available Stock` is insufficient. Reservations are released only upon successful **Shipment** or **Cancellation (Pre-Pick)**.

### B. Order Lifecycle & Pick-Cancel Policy
1. **Pending**: Stock is reserved.
2. **Picked**: Physical items removed from shelf. `quantity` and `reserved_quantity` are decremented.
3. **Shipped**: Transition confirmed. No further stock changes.
4. **Cancelled**:
    - If status was *Pending*: Reservation is released (stock restored to Available).
    - If status was *Picked/Packed*: Stock is **NOT** restored to prevent "ghost stock." All post-pick cancellations are logged as high-priority audit events for manual reconciliation.

### C. Predictive Forecasting (ADS)
The system calculates Average Daily Sales (ADS) over a 30-day window. Logic is weighted by **SKU Age** (up to 30 days) to prevent under-estimation of high-velocity new items.

---

## 6. Database Schema & Constraints
Refer to `backend/schema.sql`. Key implementations:
- **`inventory`**: Enforces `quantity >= reserved_quantity` via database CHECK constraints.
- **`audit_log`**: Captures `user_id`, `action`, `entity`, and `details` (JSONB) for every mutation.
- **Deletion Guards**: Foreign key constraints and application-level logic prevent deletion of Warehouses or Locations that contain active inventory assets.
- **Schema Stability**: Foreign keys `user_id` and `assigned_to` use `ON DELETE SET NULL` to preserve historical audit accuracy after staff departure.

---

## 7. Forensic Auditing & Data Reconciliation

The IWMS uses a decoupled logging architecture to balance performance with absolute forensic reliability.

### A. The Audit Log (`audit_log`)
**Purpose**: System-wide activity trail.
- **Scope**: Every user action (Login, Create Order, Delete Warehouse, Update Settings).
- **Format**: High-level action metadata + `details` (JSONB) containing the specific row state at the time of action.
- **Role**: Used for answering: *"Who changed this SKU's price and when?"*

### B. Inventory Movements (`inventory_movements`)
**Purpose**: Quantitative ledger.
- **Scope**: Every change to physical stock quantity (`quantity`).
- **Format**: Snapshot of `type` (inbound/outbound/adjustment), `sku`, `quantity`, and `order_id` (if applicable).
- **Role**: Used for answering: *"What is the velocity of this SKU, and how much stock did we lose to damage last month?"*

### C. The Reconciliation Matrix
For any critical stock event (e.g., a "Stock Out" via scanner), the system performs a triple-write:
1. Update `inventory` (Physical quantity).
2. Insert `inventory_movements` (Quantitative delta for analytics).
3. Insert `audit_log` (Forensic operator details).

**Consistency Policy**: If any part of this matrix fails, the entire transaction is rolled back via PostgreSQL `BEGIN/ROLLBACK` blocks to prevent data drift.

---

## 8. Testing Strategy
We use **Jest** and **Supertest** for automated testing.
- **Unit/Logic Tests**: Validate business rules in isolation.
- **Integration Tests**: Verify API endpoints and DB interactions.
- **RBAC Tests**: Ensure role-based access is strictly enforced.

Run tests sequentially:
```bash
npm test -- --runInBand
```

---

## 8. Setup & Deployment

### Local Development
1. `cd backend && npm install`
2. `cd frontend && npm install`
3. Configure `.env` files.
4. `npm run dev` (Backend) / `npm start` (Frontend).

### Docker
```bash
docker-compose up --build
```

---

## 9. Security
- **JWT**: Required for all non-public routes.
- **RBAC**: enforced via `requireRole` middleware.
- **Sanitization**: Database queries use parameterized inputs to prevent SQL injection.
