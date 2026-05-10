# Project Rules

## Architecture: authcore series are business-neutral

`authcore` (Rust backend) and `authcoreadmin` (Vue admin UI) are authentication/authorization infrastructure. They MUST NOT contain business-domain concepts (teachers, students, courses, etc.).

- User/role/permission management is in scope
- Business-domain features must live in separate projects (e.g., `htyteacher`, `upctl-svc`)
- `authcoreadmin` and `authcore` must never call business-API interfaces in reverse direction
