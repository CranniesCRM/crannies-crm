# RBAC System Design for Crannies CRM

## Overview
This document outlines the role-based access control (RBAC) system for Crannies CRM, designed to integrate with Stytch's native RBAC capabilities.

## User Roles

### 1. Owner (Workspace Creator)
- **Description**: The creator of the workspace with full administrative privileges
- **Stytch Role**: `workspace_owner`
- **Permissions**:
  - All CRUD operations on all resources
  - Delete workspace account
  - Manage all users and roles
  - Access billing and subscription settings
  - View all financial data and reports
  - Configure system-wide settings

### 2. Admin (Workspace Administrator)
- **Description**: Can manage everything except deleting the workspace account
- **Stytch Role**: `workspace_admin`
- **Permissions**:
  - All CRUD operations on all resources except workspace deletion
  - Manage users and assign roles (cannot modify Owner role)
  - Access financial data and reports
  - Configure system settings
  - Approve/reject workflows
  - Import/export data

### 3. Sales Admin
- **Description**: Manages sales pipeline and client communications
- **Stytch Role**: `sales_admin`
- **Permissions**:
  - **Issues**: Create, read, update, close (all status changes)
  - **Customers**: Create, read, update (convert Issues to customers)
  - **Sales Invoices**: Create, read, update, send
  - **Customer Payments**: Record and view
  - **Team Management**: Read-only access to team members
  - **Reports**: Sales and customer-related reports only

### 4. Client Support
- **Description**: Limited access for customer support and communication
- **Stytch Role**: `client_support`
- **Permissions**:
  - **Issues**: Read, comment, update status (open/closed only)
  - **Customers**: Read-only access
  - **Sales Invoices**: Read-only access (no modifications)
  - **No Access**: Financial data, user management, system settings

### 5. Procurement Admin
- **Description**: Manages purchasing, vendors, and procurement processes
- **Stytch Role**: `procurement_admin`
- **Permissions**:
  - **Vendors**: Full CRUD operations
  - **Purchase Orders**: Create, read, update, approve
  - **Purchase Invoices**: Create, read, update, approve
  - **Purchase Requisitions**: Create, read, update, approve
  - **Payments**: Read, create payment runs, approve
  - **Receipts**: Create, read, update
  - **Spend Analytics**: View procurement reports
  - **No Access**: Sales invoices, customer management, billing accounts

## Resource-Permission Matrix

| Resource | Owner | Admin | Sales Admin | Client Support | Procurement Admin |
|----------|-------|-------|-------------|----------------|-------------------|
| **Users & Teams** | Full | Full (no Owner) | Read | Read | Read |
| **Issues (Deals)** | Full | Full | Full | Limited | Read |
| **Customers** | Full | Full | Create/Update | Read | Read |
| **Sales Invoices** | Full | Full | Create/Update/Send | Read | None |
| **Customer Payments** | Full | Full | Create/Read | Read | None |
| **Vendors** | Full | Full | Read | Read | Full |
| **Purchase Orders** | Full | Full | Read | Read | Full |
| **Purchase Invoices** | Full | Full | Read | Read | Full |
| **Purchase Requisitions** | Full | Full | Read | Read | Full |
| **Payment Runs** | Full | Full | Read | Read | Full |
| **Receipts** | Full | Full | Read | Read | Full |
| **Spend Categories** | Full | Full | Read | Read | Full |
| **System Settings** | Full | Full | None | None | None |
| **Billing** | Full | Full | None | None | None |

## Stytch RBAC Integration

### Role Creation Process
1. **Workspace Creation**: Automatically create Owner role with full permissions
2. **User Invitation**: Assign default roles based on invitation type
3. **Role Assignment**: Admins can assign/modify roles for team members

### Permission Scopes
We'll define granular permissions for each resource using Stytch's scope objects:

```typescript
const PERMISSION_SCOPES = {
  // Core business resources
  'issues': ['create', 'read', 'update', 'delete', 'close', 'assign'],
  'customers': ['create', 'read', 'update', 'delete'],
  'sales_invoices': ['create', 'read', 'update', 'delete', 'send', 'refund'],
  'customer_payments': ['create', 'read', 'update', 'delete'],
  
  // Vendor and procurement
  'vendors': ['create', 'read', 'update', 'delete', 'rate'],
  'purchase_orders': ['create', 'read', 'update', 'delete', 'approve', 'cancel'],
  'purchase_invoices': ['create', 'read', 'update', 'delete', 'approve', 'match'],
  'purchase_requisitions': ['create', 'read', 'update', 'delete', 'approve'],
  'payment_runs': ['create', 'read', 'update', 'delete', 'execute'],
  'payments': ['create', 'read', 'update', 'delete', 'process'],
  'receipts': ['create', 'read', 'update', 'delete', 'complete'],
  
  // Analytics and settings
  'spend_categories': ['create', 'read', 'update', 'delete'],
  'spend_transactions': ['read', 'analyze'],
  'users': ['create', 'read', 'update', 'delete', 'invite', 'role_assign'],
  'workspaces': ['read', 'update', 'delete'],
  'billing': ['read', 'update', 'manage_subscription'],
};
```

## Implementation Strategy

### 1. Database Schema Updates
- Extend `users` table to store Stytch RBAC metadata
- Create role assignment audit trail
- Store permission cache for performance

### 2. Backend Middleware
- Create permission checking middleware
- Implement role-based route protection
- Add audit logging for permission checks

### 3. Frontend Components
- Create role-based UI components
- Implement conditional rendering based on permissions
- Add permission-aware navigation

### 4. API Integration
- Sync roles with Stytch's RBAC system
- Implement role assignment endpoints
- Create permission verification services

## Security Considerations

1. **Principle of Least Privilege**: Each role should have minimal required permissions
2. **Audit Trail**: Log all role changes and permission checks
3. **Regular Reviews**: Periodic review of role assignments
4. **Emergency Access**: Owner role should be recoverable if compromised

## Migration Strategy

1. **Phase 1**: Implement database schema and basic role storage
2. **Phase 2**: Create Stytch RBAC integration and role sync
3. **Phase 3**: Add permission checking middleware
4. **Phase 4**: Update frontend with role-based components
5. **Phase 5**: Testing and validation of all permissions

## Testing Approach

1. **Unit Tests**: Permission checking functions
2. **Integration Tests**: API endpoint protection
3. **E2E Tests**: User workflow validation
4. **Security Tests**: Permission escalation attempts