# Use Case Diagram - Yohanns E-commerce System

## Overview
This document describes the use case diagram for the Yohanns E-commerce System, covering all four main actors: Customer, Admin, Owner, and Artist.

---

## Actors

### 1. Customer
Regular users who browse, purchase products, and interact with the system.

### 2. Admin
Branch administrators who manage their specific branch operations.

### 3. Owner
System owners who have access to all branches and overall system management.

### 4. Artist
Designers/artists who handle custom design tasks and customer communications.

---

## Use Cases by Actor

### CUSTOMER USE CASES

#### Authentication & Account Management
- **UC1**: Register Account
- **UC2**: Login
- **UC3**: Logout
- **UC17**: View Profile
- **UC18**: Edit Profile
- **UC19**: Change Password

#### Product Browsing & Shopping
- **UC4**: Browse Products
- **UC5**: Search Products
- **UC6**: View Product Details
- **UC7**: Add to Cart
- **UC8**: Manage Cart (Add/Remove/Update Quantity)
- **UC9**: Add to Wishlist
- **UC10**: View Wishlist

#### Order Management
- **UC11**: Checkout
- **UC12**: Place Order
- **UC13**: View Order History
- **UC14**: Track Order
- **UC15**: Cancel Order
- **UC16**: Review Order

#### Support & Information
- **UC20**: Contact Support (Chat)
- **UC21**: View Branches
- **UC22**: View FAQs
- **UC23**: View About Page
- **UC24**: View Highlights
- **UC25**: View Privacy Policy
- **UC26**: View Terms and Conditions
- **UC27**: Subscribe to Newsletter

---

### ADMIN USE CASES

#### Dashboard & Analytics
- **UC28**: View Dashboard
- **UC29**: View Analytics (Branch-specific)
- **UC35**: View Branch Data

#### Order Management
- **UC30**: Manage Orders (View/Update Status)
- **UC31**: Manage Walk-in Orders

#### Inventory & Product Management
- **UC32**: Manage Inventory (Add/Edit/Delete Products)

#### User & Support Management
- **UC33**: Manage Accounts (Users/Admins)
- **UC34**: Support Chats (Respond to Customers)

#### Authentication
- **UC2**: Login
- **UC3**: Logout

---

### OWNER USE CASES

#### Dashboard & Analytics
- **UC36**: View Dashboard
- **UC37**: View Analytics (All Branches)
- **UC42**: View All Branches Data

#### Order Management
- **UC38**: Manage Orders (All Branches)
- **UC39**: Manage Walk-in Orders (All Branches)

#### User & Support Management
- **UC40**: Manage Accounts (All Users/Admins)
- **UC41**: Support Chats (All Branches)

#### Authentication
- **UC2**: Login
- **UC3**: Logout

---

### ARTIST USE CASES

#### Dashboard & Tasks
- **UC43**: View Dashboard
- **UC44**: View Tasks
- **UC45**: Update Task Status
- **UC46**: View Workload Overview

#### Profile & Communication
- **UC47**: Manage Profile
- **UC48**: Customer Chats (Communicate with Customers)

#### Authentication
- **UC2**: Login
- **UC3**: Logout

---

## Use Case Relationships

### Include Relationships
- **Add to Cart** includes **Manage Cart**
- **Manage Cart** includes **Checkout**
- **Checkout** includes **Place Order**

### Extend Relationships
- **Place Order** extends to **View Order History**
- **View Order History** extends to:
  - **Track Order**
  - **Review Order**
  - **Cancel Order**
- **View Product Details** extends to:
  - **Add to Cart**
  - **Add to Wishlist**
- **Manage Orders** (Admin) extends to **Support Chats**
- **Manage All Orders** (Owner) extends to **Support Chats**
- **View Tasks** (Artist) extends to:
  - **Update Task Status**
  - **Customer Chats**

---

## Use Case Descriptions

### Customer Use Cases

#### UC1: Register Account
**Actor**: Customer  
**Description**: New users can create an account by providing email, password, and basic information.  
**Preconditions**: User is not logged in  
**Postconditions**: User account is created and user is logged in

#### UC2: Login
**Actor**: Customer, Admin, Owner, Artist  
**Description**: Authenticated users can log into the system with their credentials.  
**Preconditions**: User has an account  
**Postconditions**: User is logged in and redirected to appropriate dashboard

#### UC4: Browse Products
**Actor**: Customer  
**Description**: Customers can browse products by category (Jerseys, T-Shirts, Balls, Trophies, etc.).  
**Preconditions**: None  
**Postconditions**: Products are displayed

#### UC7: Add to Cart
**Actor**: Customer  
**Description**: Customers can add products to their shopping cart with customization options (size, team details, etc.).  
**Preconditions**: User is logged in, product is available  
**Postconditions**: Item is added to cart

#### UC12: Place Order
**Actor**: Customer  
**Description**: Customers can place orders after checkout, selecting delivery or pickup options.  
**Preconditions**: Cart has items, user is logged in  
**Postconditions**: Order is created and saved

#### UC16: Review Order
**Actor**: Customer  
**Description**: Customers can submit reviews and ratings for completed orders.  
**Preconditions**: Order is completed  
**Postconditions**: Review is saved and displayed

### Admin Use Cases

#### UC28: View Dashboard
**Actor**: Admin  
**Description**: Admins can view their branch dashboard with key metrics and statistics.  
**Preconditions**: Admin is logged in  
**Postconditions**: Dashboard is displayed

#### UC29: View Analytics
**Actor**: Admin  
**Description**: Admins can view analytics and reports for their assigned branch only.  
**Preconditions**: Admin is logged in  
**Postconditions**: Analytics data is displayed

#### UC32: Manage Inventory
**Actor**: Admin  
**Description**: Admins can add, edit, and delete products in their inventory.  
**Preconditions**: Admin is logged in  
**Postconditions**: Inventory is updated

### Owner Use Cases

#### UC36: View Dashboard
**Actor**: Owner  
**Description**: Owners can view the overall system dashboard with aggregated data from all branches.  
**Preconditions**: Owner is logged in  
**Postconditions**: Dashboard is displayed

#### UC37: View Analytics
**Actor**: Owner  
**Description**: Owners can view analytics and reports for all branches combined.  
**Preconditions**: Owner is logged in  
**Postconditions**: Analytics data for all branches is displayed

### Artist Use Cases

#### UC43: View Dashboard
**Actor**: Artist  
**Description**: Artists can view their dashboard with task metrics and workload information.  
**Preconditions**: Artist is logged in  
**Postconditions**: Dashboard is displayed

#### UC44: View Tasks
**Actor**: Artist  
**Description**: Artists can view assigned tasks with details and status.  
**Preconditions**: Artist is logged in  
**Postconditions**: Tasks are displayed

#### UC45: Update Task Status
**Actor**: Artist  
**Description**: Artists can update the status of their tasks (pending, in progress, completed, etc.).  
**Preconditions**: Task is assigned to artist  
**Postconditions**: Task status is updated

---

## System Boundaries

The system includes:
- Customer-facing e-commerce features
- Admin/Owner management dashboards
- Artist task management system
- Support chat system
- Analytics and reporting
- Order management
- Inventory management

The system excludes:
- Payment gateway integration (external)
- Shipping provider integration (external)
- Email service provider (external)

---

## Notes

1. **Role-based Access**: Different actors have different levels of access to the same features (e.g., Admin sees branch-specific data, Owner sees all branches).

2. **Shared Use Cases**: Login and Logout are shared across all actors.

3. **Dependencies**: Some use cases depend on others (e.g., Place Order requires Checkout, which requires items in Cart).

4. **Extend Relationships**: Extend relationships indicate optional or conditional behavior (e.g., viewing order history can lead to tracking, reviewing, or canceling).

---

## Diagram File

The PlantUML source file for this use case diagram is available at: `Use_Case_Diagram.puml`

To view the diagram:
1. Install PlantUML (http://plantuml.com/)
2. Open the `.puml` file in a PlantUML-compatible viewer
3. Or use an online PlantUML editor (http://www.plantuml.com/plantuml/uml/)


