# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- Refined authentication UI to eliminate redundant headers and footers between AuthShell and Clerk components.
- Styled Clerk components to match the dense, developer-focused design system (Geist font, monospace labels, neutral palette).

### Added
- Added the Agent service as a separate project for repository-wide queries.
- Added a Chat panel with real-time tool execution visibility.
- Added signed credentials for secure, analysis-scoped agent access.
- Added repository-wide tools for the agent (graph walk, route table, transitive neighbors).
- Added Clerk sign in, protected access, and organization selection or creation with validated return paths.
- Added a system, light, or dark theme preference that stays consistent across routes and reloads.
- Added a server side Supabase client that passes the Clerk session token.
- Added repository analysis pipeline including fetching, parsing, and storage.
- Added real-time progress broadcasting from the database via Supabase Broadcast.
- Added coverage statistics tracking for analyzed repositories.
- Implemented "One analysis per repository" constraint.
