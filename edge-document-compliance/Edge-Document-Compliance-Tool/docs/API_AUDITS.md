# Audit Module API Documentation

This document describes the REST API endpoints for the Audit module.

## Base URL

All endpoints are prefixed with `/api`

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <token>
```

## Endpoints

### Authentication

#### POST /api/auth/login
Login and get JWT token.

**Request:**
```json
{
  "email": "admin@example.com",
  "password": "admin123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "displayName": "Admin User",
    "tenantId": "uuid",
    "roles": ["Admin"]
  }
}
```

#### POST /api/auth/logout
Logout (client-side token removal).

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Logged out"
}
```

#### GET /api/auth/me
Get current user information.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "id": "uuid",
  "email": "admin@example.com",
  "displayName": "Admin User",
  "tenantId": "uuid",
  "roles": ["Admin"]
}
```

### Source Documents

#### POST /api/sources/upload
Upload a source document (standard, regulation, customer requirement, or checklist).

**Headers:** 
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Form Data:**
- `file` (file) - Document file (PDF, DOCX, TXT, XLSX)
- `sourceType` (string) - STANDARD, REGULATION, CUSTOMER, or CHECKLIST
- `name` (string, optional) - Document name
- `code` (string, optional) - Standard/regulation code
- `revision` (string, optional) - Version/revision
- `authority` (string, optional) - Authority (e.g., 'ISO', 'FAA')
- `jurisdiction` (string, optional) - Jurisdiction

**Response:**
```json
{
  "id": "uuid",
  "tenant_id": "uuid",
  "source_type": "STANDARD",
  "name": "ISO 9001:2015",
  "code": "ISO9001",
  "revision": "2015",
  "authority": "ISO",
  "file_path": "/uploads/sources/...",
  "uploaded_at": "2025-01-XX..."
}
```

#### GET /api/sources
List source documents.

**Query Parameters:**
- `sourceType` (optional) - Filter by source type

**Response:**
```json
[
  {
    "id": "uuid",
    "source_type": "STANDARD",
    "name": "ISO 9001:2015",
    ...
  }
]
```

#### GET /api/sources/:id
Get source document by ID.

**Response:**
```json
{
  "id": "uuid",
  "source_type": "STANDARD",
  "name": "ISO 9001:2015",
  ...
}
```

#### POST /api/sources/:id/extract
Extract requirements from source document.

**Response:**
```json
{
  "sourceId": "uuid",
  "requirementsCount": 15,
  "requirements": [
    {
      "id": "uuid",
      "requirement_ref": "7.5.3.2",
      "requirement_text": "...",
      ...
    }
  ]
}
```

### Requirements

#### POST /api/requirements/from-source/:sourceId
Extract and normalize requirements from source document.

**Response:**
```json
[
  {
    "id": "uuid",
    "requirement_ref": "7.5.3.2",
    "requirement_text": "The organization shall retain documented information...",
    "requirement_type": "shall",
    "clause_number": "7.5.3.2",
    "keywords": ["establish", "maintain"],
    "tags": []
  }
]
```

### Audits

#### POST /api/audits
Create a new audit (draft).

**Request:**
```json
{
  "title": "ISO 9001 Compliance Audit",
  "description": "Annual compliance audit",
  "auditType": "STANDARD"
}
```

**Response:**
```json
{
  "id": "uuid",
  "title": "ISO 9001 Compliance Audit",
  "status": "DRAFT",
  "created_at": "2025-01-XX..."
}
```

#### GET /api/audits
List audits with filters.

**Query Parameters:**
- `status` (optional) - Filter by status
- `assigned_to` (optional) - Filter by assigned user (use 'me' for current user)
- `date_from` (optional) - Start date (ISO format)
- `date_to` (optional) - End date (ISO format)
- `limit` (optional) - Result limit
- `offset` (optional) - Result offset

**Response:**
```json
[
  {
    "id": "uuid",
    "title": "ISO 9001 Compliance Audit",
    "status": "IN_PROGRESS",
    "item_count": 25,
    "response_count": 10,
    ...
  }
]
```

#### GET /api/audits/:id
Get audit by ID.

**Response:**
```json
{
  "id": "uuid",
  "title": "ISO 9001 Compliance Audit",
  "status": "IN_PROGRESS",
  "audit_pack_json": { ... },
  ...
}
```

#### PATCH /api/audits/:id
Update audit (title, description, due date, scheduled date).

**Request:**
```json
{
  "title": "Updated Title",
  "due_date": "2025-12-31",
  "scheduled_date": "2025-06-01"
}
```

**Response:**
```json
{
  "id": "uuid",
  "title": "Updated Title",
  ...
}
```

#### POST /api/audits/:id/generate-checklist
Generate checklist from selected sources.

**Request:**
```json
{
  "sourceIds": ["uuid1", "uuid2"],
  "filters": {
    "scope": "Full audit",
    "granularity": "high",
    "evidenceDepth": "standard",
    "clausePrefixes": ["7.", "8."]
  }
}
```

**Response:**
```json
{
  "version": "1.0.0",
  "auditId": "uuid",
  "generatedAt": "2025-01-XX...",
  "sources": [ ... ],
  "items": [ ... ],
  "filters": { ... }
}
```

#### POST /api/audits/:id/assign
Assign auditor to audit (Lead Auditor only).

**Request:**
```json
{
  "assigned_to": "user-uuid",
  "role": "Internal Assessor"
}
```

**Response:**
```json
{
  "id": "uuid",
  "audit_id": "uuid",
  "assigned_to": "user-uuid",
  "role": "Internal Assessor",
  ...
}
```

#### POST /api/audits/:id/submit
Submit audit for review.

**Response:**
```json
{
  "id": "uuid",
  "status": "SUBMITTED",
  ...
}
```

#### POST /api/audits/:id/return
Return audit for revision (Lead Auditor only).

**Request:**
```json
{
  "reason": "Missing evidence for item 7.5.3.2"
}
```

**Response:**
```json
{
  "id": "uuid",
  "status": "RETURNED",
  ...
}
```

#### POST /api/audits/:id/close
Close audit (Lead Auditor only).

**Response:**
```json
{
  "id": "uuid",
  "status": "CLOSED",
  "closed_at": "2025-01-XX...",
  ...
}
```

#### GET /api/audits/:id/history
Get audit state history.

**Response:**
```json
[
  {
    "id": "uuid",
    "from_status": "DRAFT",
    "to_status": "SCHEDULED",
    "changed_by": "user-uuid",
    "changed_by_name": "Lead Auditor",
    "change_reason": "Audit scheduled",
    "changed_at": "2025-01-XX..."
  }
]
```

#### GET /api/audits/:id/items
Get audit items (checklist).

**Response:**
```json
[
  {
    "id": "uuid",
    "source_type": "STANDARD",
    "requirement_ref": "7.5.3.2",
    "requirement_text": "...",
    "question": "Does the organization...",
    "grouping_section": "Section A: Standards",
    ...
  }
]
```

#### POST /api/audits/:id/items/:itemId/response
Submit response to audit item.

**Request:**
```json
{
  "response_text": "Evidence provided in procedure P-710-01",
  "conformance_status": "CONFORMANT"
}
```

**Response:**
```json
{
  "id": "uuid",
  "audit_item_id": "uuid",
  "response_text": "Evidence provided...",
  "conformance_status": "CONFORMANT",
  "responded_at": "2025-01-XX..."
}
```

#### POST /api/audits/:id/items/:itemId/evidence/upload
Upload evidence for audit item.

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Form Data:**
- `file` (file) - Evidence file

**Response:**
```json
{
  "id": "uuid",
  "audit_id": "uuid",
  "audit_item_id": "uuid",
  "file_name": "evidence.pdf",
  "file_path": "/uploads/evidence/...",
  "uploaded_at": "2025-01-XX..."
}
```

#### GET /api/audits/:id/export
Export audit (JSON, XLSX, PDF).

**Query Parameters:**
- `format` (optional) - json, xlsx, or pdf (default: json)

**Response:**
- JSON: Returns JSON object
- XLSX: Returns Excel file (Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)
- PDF: Returns PDF file (Content-Type: application/pdf)

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Error message"
}
```

**Status Codes:**
- `200` - Success
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

## Role-Based Access

- **Lead Auditor**: Can create audits, assign auditors, review, return, and close audits
- **Internal Assessor**: Can execute assigned audits and submit responses
- **Viewer**: Can view audit results and reports
- **Admin**: Full system administration access
