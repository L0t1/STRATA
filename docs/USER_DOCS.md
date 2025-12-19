# STRATA User Guide

Welcome to **STRATA — Intelligent Warehouse Management**. This guide will help you navigate the operational backbone of your logistics network.

---

## 1. Introduction
IWMS is a comprehensive platform designed to provide real-time visibility into your inventory, streamline order fulfillment, and optimize warehouse workflows.

**Key Benefits:**
- **Accuracy**: Reduce stock discrepancies with real-time tracking.
- **Efficiency**: Speed up picking and packing with clear task queues.
- **Control**: Manage multiple warehouses and locations from a single dashboard.

---

## 2. Getting Started

### Accessing the System
1. Open your browser and navigate to the IWMS URL.
2. Enter your **Username** and **Password** on the Login screen.
3. Upon successful login, you will be redirected to the **Dashboard**.

### Roles & Permissions
- **Admin**: Full system access, including user management and system settings.
- **Manager**: Can add/edit inventory, create orders, and assign tasks.
- **Staff**: Can view inventory and update order/task statuses (e.g., mark as "Shipped").

---

## 3. Core Concepts

| Concept | Description |
| :--- | :--- |
| **SKU** | Stock Keeping Unit - A unique identifier for each product. |
| **Location** | A specific spot in the warehouse (Zone-Aisle-Shelf). |
| **Inventory** | The actual count of items currently stored in a location. |
| **Order** | A request to ship items out of the warehouse. |
| **Task** | An operational action assigned to staff (e.g., "Pick items"). |

---

## 4. Feature Walkthroughs

### Managing Inventory
- **Viewing Stock**: Go to the **Inventory** page to see a list of all products, their quantities, and locations.
- **Adding Product**: Click **+ Add Product** to register a new item in the system.
- **Low Stock Alerts**: Items with fewer than 10 units will display a RED badge as a warning.

### Processing Orders
1. **Create Order**: Go to **Order Fulfillment** and click **+ Create Order**. Enter the order number and select items.
2. **Auto-Tasking**: Upon creation, STRATA automatically generates "Pick" tasks for every item in the order. You can view and assign these in the **Tasks** dashboard.
3. **Stock Reservation**: The system automatically checks if stock is available and reserves it immediately.
4. **Fulfillment Flow**: Update the order status as you progress:
   - `Pending` → `Picked` → `Packed` → `Shipped`.
5. **Shipping**: When marked as **Shipped**, the system automatically decrements the inventory level.

### Replenishment
- **Thresholds**: The system monitors SKU levels against pre-defined reorder points.
- **Alerts**: Access the **Replenishment** page to see items that need restocking based on current demand and lead times.

### Reporting & Analytics
- **Standard Reports**: Go to the **Reports** page to generate Inventory Turnover, Aging, and Shrinkage reports.
- **Ad-hoc Queries (Admin only)**: Run custom SQL queries for specialized data analysis.

### Warehouse Setup & Facilities
- **Warehouses**: Register buildings in the **Warehouses** page. Commissions can only be performed by Admins.
- **Locations**: Define the physical matrix (Zones, Aisles, Shelves) in the **Locations** page.
- **Decommissioning**: You cannot delete a location or warehouse if it still contains active inventory. Relocate stock first.

---

## 5. Mobile Operations (Field Terminal)

The **Field Terminal** is designed for staff on the warehouse floor using mobile scanners or tablets.

### A. Asset Identification
1. Open the **Scanner** page on your mobile device.
2. Enter a SKU or use the **Visual Scanner** (Camera) to scan a label.
3. The system will identify the asset and show its current location and available stock.

### B. "Stock Out" (Picking)
- Used when fulfilling orders or removing stock for adjustments.
- Enter the quantity and tap **STOCK OUT**.
- **Important**: Scanning items associated with a pending fulfillment task will automatically complete that task.

### C. "Stock In" (Receiving)
- Used for inbound replenishment or returning items to shelf.
- Tap **STOCK IN** to increment the physical count at that location.

---

## 6. Audit & Accountability

IWMS maintains a "Paperless Forensic Trail" for every system action.

- **Audit Logs**: Access via **Administration → Audit Logs**.
- **Visibility**: Every stock movement, price change, or order cancellation is logged with a timestamp, IP address, and User ID.
- **Cancellations**: If an order is cancelled *after* being picked, the system logs a high-priority event. Stock must be manually returned to the shelf via a "Stock In" scanner action to ensure count accuracy.

---

## 7. UI Reference

### Status Badges
| Badge | Meaning |
| :--- | :--- |
| `badge-success` (Green) | Ready, Shipped, or Sufficient Stock. |
| `badge-warning` (Yellow) | Pending action or Low Stock (< 10). |
| `badge-danger` (Red) | Cancelled or Zero Stock. |
| `badge-primary` (Blue) | In-progress (Picked/Packed). |

### Common Actions
- **Search**: Use the search bar at the top of tables to find specific SKUs or products.
- **Filter**: Use the filter dropdowns (e.g., in Orders) to view specific statuses.
- **Pagination**: Use the "Next" and "Previous" buttons at the bottom of lists to navigate through data.

---

## 6. Troubleshooting & FAQ

**Q: Why can't I mark an order as "Shipped"?**
- *A: Ensure you have sufficient stock. The system will block shipment if the quantity on hand is less than the ordered quantity.*

**Q: I added an item but don't see it in the list.**
- *A: Try refreshing the page or checking your search/filter settings.*

**Q: How do I change my role?**
- *A: Role changes must be performed by a System Administrator in the **Users** management page.*

---

## 7. Best Practices
- **Scan Everything**: Always update the system immediately when moving items to maintain 99.5% accuracy.
- **Clear Descriptions**: Use consistent naming for products and locations.
- **Regular Counts**: Use the **Cycle Counts** feature periodically to reconcile physical stock with the system.
