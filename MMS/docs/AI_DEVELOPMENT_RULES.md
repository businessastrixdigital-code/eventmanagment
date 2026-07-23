# AI Development Rules

## Purpose

This project is developed incrementally using AI-assisted development.

These rules are the **single source of truth** for every future implementation.

Before writing any code, always read this document.

---

# Project Status

This is an EXISTING project.

The backend foundation is already completed.

Do NOT recreate existing architecture.

Do NOT regenerate working code.

Always enhance the existing implementation.

---

# Technology Stack

Frontend

- Next.js 15
- React 19
- TypeScript
- TailwindCSS
- Shadcn UI

Backend

- Node.js
- Express.js
- TypeScript
- Drizzle ORM
- Turso Database
- JWT Authentication
- Cloudinary
- Multer
- Zod

Realtime

- Socket.io

Storage

- Cloudinary

Database

- Turso (libSQL)

---

# Architecture

Always follow:

Route

↓

Controller

↓

Service

↓

Repository

↓

Database

Controllers must never contain business logic.

Services contain business logic.

Repositories contain database queries.

---

# Existing Project Rules

Always inspect the project before writing code.

Reuse existing:

- Models
- Services
- Controllers
- Routes
- Repositories
- Validators
- Middleware
- Utilities
- Components

Never recreate them.

---

# File Creation Rules

Always prefer

Modify Existing File

instead of

Create New File

Create a new file only when absolutely necessary.

---

# API Rules

Reuse existing APIs whenever possible.

Do not create duplicate endpoints.

Follow existing API versioning.

Example

/api/v1/

Keep response structure consistent.

Success

{
    "success": true,
    "message": "",
    "data": {}
}

Error

{
    "success": false,
    "message": "",
    "errors": []
}

---

# Database Rules

Reuse existing Drizzle schema.

Do not create duplicate tables.

If schema changes are required

Generate a proper migration.

Never remove production data.

---

# Validation Rules

Reuse existing Zod validators.

Extend existing schemas.

Do not duplicate validation logic.

---

# Authentication

Reuse existing JWT middleware.

Reuse existing RBAC.

Do not create another authentication system.

---

# Upload Rules

Reuse existing Multer middleware.

Reuse existing Cloudinary service.

Never create another upload implementation.

Supported uploads

- Images
- Videos
- PDFs

Always upload directly to Cloudinary.

Never store binary files inside the database.

Store only

- URL
- Public ID
- Metadata

---

# Cloudinary Folder Structure

Aurelius/

Functions/

{functionId}/

Gallery/

Invitations/

Slider/

Family/

Documents/

Guests/

Profile/

---

# Business Rules

Everything belongs to one Function.

Function contains

- Bride Family
- Groom Family
- Events
- Guests
- Invitations
- Gallery
- Photographer
- Album Requests
- Analytics
- Settings

Never create unrelated global modules.

---

# UI Rules

Reuse existing components.

Follow existing design system.

Never create duplicate components.

Maintain visual consistency.

---

# Naming Rules

Use meaningful names.

Avoid

temp

new

v2

copy

test

demo

Never create files like

guest.service.new.ts

guest.service.v2.ts

If enhancement is required

modify the existing file.

---

# Code Quality

Follow SOLID principles.

Keep files small.

Keep functions focused.

Avoid code duplication.

Use dependency injection where appropriate.

Prefer reusable utilities.

---

# Cleanup Rules

Whenever implementing a feature

Identify

- dead code
- duplicate logic
- unused imports
- unused APIs
- unused components
- obsolete utilities

Remove them safely.

Do not leave unused code.

---

# Security

Always

Validate input

Authorize requests

Sanitize user input

Hash passwords

Verify ownership

Never trust client input.

---

# Logging

Reuse existing logger.

Do not use console.log in production code.

---

# Error Handling

Use centralized error handling.

Never expose stack traces.

Return meaningful error messages.

---

# Performance

Reuse database queries.

Avoid duplicate queries.

Avoid unnecessary API calls.

Use pagination.

Optimize uploads.

---

# Documentation

Whenever implementing a sprint

Update documentation if necessary.

---

# Deliverables

After every implementation return

1. Files Modified

2. Files Created

3. Database Changes

4. Migration Required

5. API Changes

6. UI Changes

7. Cleanup Performed

8. Risks

9. Backward Compatibility

10. Future Recommendations

---

# Most Important Rule

This project already exists.

Never rebuild.

Never replace working architecture.

Always extend the existing implementation.

Keep the project clean, scalable, maintainable and production ready.

Before implementing any feature

Understand the existing codebase first.

Then modify only the necessary files.
