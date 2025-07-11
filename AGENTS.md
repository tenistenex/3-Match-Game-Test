Match-3 Puzzle Game
Overview
This is a customizable match-3 puzzle web game built with React and TypeScript. Similar to Candy Crush, players eliminate connected same-colored blocks by clicking to swap adjacent pieces. The game features adjustable difficulty settings including customizable color count (default 4), controllable block falling speed, elimination speed, and board dimensions. The game eliminates 3+ connected same-colored blocks, with automatic block falling and random redistribution when no matches are possible.

User Preferences
Preferred communication style: Simple, everyday language.

System Architecture
The application follows a modern full-stack architecture with clear separation between frontend, backend, and database layers:

Frontend: React with TypeScript, using Vite for development and building
Backend: Express.js server with TypeScript
Database: PostgreSQL with Drizzle ORM for schema management
Build System: ESBuild for server bundling, Vite for client bundling
UI Framework: Radix UI components with Tailwind CSS for styling
Key Components
Frontend Architecture
React 18 with TypeScript for type safety
Vite as the build tool and development server
Radix UI component library for accessible, unstyled UI primitives
Tailwind CSS for utility-first styling with custom design system
TanStack Query for server state management and caching
Zustand for client-side state management (data, audio, game states)
Chart.js for data visualization capabilities
React Three Fiber for 3D visualizations and graphics
GLSL shader support for advanced visual effects
Backend Architecture
Express.js server with middleware for JSON parsing and CORS
TypeScript for type safety across the entire backend
RESTful API design with route handlers in /server/routes.ts
In-memory storage with abstraction layer for future database integration
AI service integration for data analysis and insights generation
Development/production environment handling with Vite integration
Database Schema
Using Drizzle ORM with PostgreSQL:

Users table: Basic user management with username/password
Datasets table: Stores uploaded data with JSON columns for headers and data rows
Analyses table: Stores AI-generated analysis results linked to datasets
State Management
useData store: Manages datasets, current selection, and data operations
useGame store: Handles game/interaction states (ready, playing, ended)
useAudio store: Controls audio playback and muting functionality
Data Flow
Data Upload: Users upload CSV files through the DataUpload component
Data Processing: CSV data is parsed, cleaned, and validated on the frontend
Storage: Processed datasets are sent to the backend and stored in PostgreSQL
Visualization: Users can create various chart types using the DataVisualization component
AI Analysis: The AIInsights component sends data to the AI service for analysis
Dashboard: InsightsDashboard aggregates metrics and key insights for overview
External Dependencies
Core Framework Dependencies
React ecosystem: React, React DOM, React Three Fiber for 3D graphics
Radix UI: Complete set of accessible UI primitives
Drizzle: Type-safe ORM for PostgreSQL database operations
Neon Database: Serverless PostgreSQL database hosting
Development Dependencies
Vite: Frontend build tool and development server
ESBuild: Fast JavaScript/TypeScript bundler for production
TypeScript: Static type checking across the entire application
Tailwind CSS: Utility-first CSS framework
Optional Integrations
OpenAI API: For AI-powered data analysis (fallback to rule-based analysis)
Chart.js: For creating interactive data visualizations
Three.js: For 3D graphics and advanced visualizations
Deployment Strategy
Development Environment
Frontend: Vite dev server with HMR (Hot Module Replacement)
Backend: TSX for running TypeScript directly with auto-reload
Database: Neon serverless PostgreSQL with connection pooling
Production Build
Frontend: Vite builds to dist/public directory
Backend: ESBuild bundles server code to dist/index.js
Static serving: Express serves built frontend files in production
Environment variables: DATABASE_URL for database connection, OPENAI_API_KEY for AI features
Database Management
Schema migrations: Drizzle Kit handles database schema changes
Connection: Uses @neondatabase/serverless for optimized serverless connections
Type safety: Schema definitions generate TypeScript types automatically
The application is designed to be easily deployable to platforms like Vercel, Netlify, or Railway, with the database hosted on Neon's serverless PostgreSQL platform.Match-3 Puzzle Game
Overview
This is a customizable match-3 puzzle web game built with React and TypeScript. Similar to Candy Crush, players eliminate connected same-colored blocks by clicking to swap adjacent pieces. The game features adjustable difficulty settings including customizable color count (default 4), controllable block falling speed, elimination speed, and board dimensions. The game eliminates 3+ connected same-colored blocks, with automatic block falling and random redistribution when no matches are possible.

User Preferences
Preferred communication style: Simple, everyday language.

System Architecture
The application follows a modern full-stack architecture with clear separation between frontend, backend, and database layers:

Frontend: React with TypeScript, using Vite for development and building
Backend: Express.js server with TypeScript
Database: PostgreSQL with Drizzle ORM for schema management
Build System: ESBuild for server bundling, Vite for client bundling
UI Framework: Radix UI components with Tailwind CSS for styling
Key Components
Frontend Architecture
React 18 with TypeScript for type safety
Vite as the build tool and development server
Radix UI component library for accessible, unstyled UI primitives
Tailwind CSS for utility-first styling with custom design system
TanStack Query for server state management and caching
Zustand for client-side state management (data, audio, game states)
Chart.js for data visualization capabilities
React Three Fiber for 3D visualizations and graphics
GLSL shader support for advanced visual effects
Backend Architecture
Express.js server with middleware for JSON parsing and CORS
TypeScript for type safety across the entire backend
RESTful API design with route handlers in /server/routes.ts
In-memory storage with abstraction layer for future database integration
AI service integration for data analysis and insights generation
Development/production environment handling with Vite integration
Database Schema
Using Drizzle ORM with PostgreSQL:

Users table: Basic user management with username/password
Datasets table: Stores uploaded data with JSON columns for headers and data rows
Analyses table: Stores AI-generated analysis results linked to datasets
State Management
useData store: Manages datasets, current selection, and data operations
useGame store: Handles game/interaction states (ready, playing, ended)
useAudio store: Controls audio playback and muting functionality
Data Flow
Data Upload: Users upload CSV files through the DataUpload component
Data Processing: CSV data is parsed, cleaned, and validated on the frontend
Storage: Processed datasets are sent to the backend and stored in PostgreSQL
Visualization: Users can create various chart types using the DataVisualization component
AI Analysis: The AIInsights component sends data to the AI service for analysis
Dashboard: InsightsDashboard aggregates metrics and key insights for overview
External Dependencies
Core Framework Dependencies
React ecosystem: React, React DOM, React Three Fiber for 3D graphics
Radix UI: Complete set of accessible UI primitives
Drizzle: Type-safe ORM for PostgreSQL database operations
Neon Database: Serverless PostgreSQL database hosting
Development Dependencies
Vite: Frontend build tool and development server
ESBuild: Fast JavaScript/TypeScript bundler for production
TypeScript: Static type checking across the entire application
Tailwind CSS: Utility-first CSS framework
Optional Integrations
OpenAI API: For AI-powered data analysis (fallback to rule-based analysis)
Chart.js: For creating interactive data visualizations
Three.js: For 3D graphics and advanced visualizations
Deployment Strategy
Development Environment
Frontend: Vite dev server with HMR (Hot Module Replacement)
Backend: TSX for running TypeScript directly with auto-reload
Database: Neon serverless PostgreSQL with connection pooling
Production Build
Frontend: Vite builds to dist/public directory
Backend: ESBuild bundles server code to dist/index.js
Static serving: Express serves built frontend files in production
Environment variables: DATABASE_URL for database connection, OPENAI_API_KEY for AI features
Database Management
Schema migrations: Drizzle Kit handles database schema changes
Connection: Uses @neondatabase/serverless for optimized serverless connections
Type safety: Schema definitions generate TypeScript types automatically
The application is designed to be easily deployable to platforms like Vercel, Netlify, or Railway, with the database hosted on Neon's serverless PostgreSQL platform.
