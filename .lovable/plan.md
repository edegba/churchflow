ChurchFlow is a church management platform for pastors and staff. First version will focus on a warm, modern landing page and a member directory with a clean dashboard. Lovable Cloud will provide the backend for member data and authentication.

## Goals
- Replace the placeholder homepage with a branded ChurchFlow landing page.
- Add an admin dashboard shell for future modules (members, services, giving, teams).
- Build a member directory page with a searchable, filterable list.
- Set up Lovable Cloud for auth and database.
- Establish a warm, modern design system using semantic tokens.

## Non-goals
- Full service planning, finance tracking, or team scheduling in this version.
- Public member sign-up or self-service profiles.

## Scope
- Design system: warm earth-tone palette in `src/styles.css`.
- Homepage: hero, feature cards, CTA.
- Dashboard layout: sidebar + header + outlet for nested modules.
- Member directory: table/grid, search, status filter.
- Cloud: enable Lovable Cloud, create members table with RLS + grants.

## Technical approach
- Use TanStack Router: `src/routes/index.tsx` for landing, `src/routes/dashboard.tsx` layout, `src/routes/dashboard/members.tsx` for directory.
- Use `createServerFn` for server-side reads.
- Store member data in a Supabase table via Lovable Cloud.
- Use shadcn/ui components for tables, cards, inputs, and buttons.

## Visual direction
- Warm modern palette: cream background, sage green, terracotta accent, dark charcoal text.
- Soft rounded corners, clean typography, generous whitespace.
