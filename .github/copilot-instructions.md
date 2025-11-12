# ChatWise AI Development Guide

This guide provides essential context for AI agents working with the ChatWise AI codebase.

## Project Architecture

- **Next.js App Router**: Modern React application using the App Router pattern
- **Convex Backend**: Real-time backend with built-in sync and data subscriptions
- **Clerk Auth**: Authentication and user management
- **TailwindCSS**: Styling with custom theme configuration
- **Dark Mode Support**: Using next-themes with system preference detection

## Key Components & Data Flow

1. **Frontend (src/app/)**
   - App Router pages in `src/app/*`
   - Shared UI components in `src/components/ui/*`
   - Client-side utilities in `src/lib/utils.ts`

2. **Backend (convex/)**
   - Database queries and mutations in Convex functions
   - Real-time data sync with client via Convex hooks
   - See `convex/README.md` for function patterns

## Development Workflow

```bash
# Start development server
npm run dev

# Lint code
npm run lint

# Build for production
npm run build
```

## Project Conventions

1. **Component Structure**
   - Use Tailwind for styling with clsx/cva for variants
   - Dark mode classes with `dark:` prefix
   - Responsive design with `sm:`, `md:` breakpoints

2. **Data Fetching**
   ```typescript
   // Use Convex hooks for data
   const data = useQuery(api.myFunctions.myQueryFunction, args);
   const mutation = useMutation(api.myFunctions.myMutationFunction);
   ```

3. **Authentication**
   - All protected routes should use Clerk middleware
   - User context available via useAuth() hook

## Common Patterns

1. **UI Components**
   - Located in `src/components/ui/`
   - Follow Radix UI + Tailwind patterns
   - Use class-variance-authority for variants

2. **Theme Handling**
   ```typescript
   // Dark mode toggle example
   const { theme, setTheme } = useTheme();
   ```

## Integration Points

1. **OpenAI Integration**
   - API calls configured via environment variables
   - Use server-side endpoints for AI operations

2. **Clerk Authentication**
   - Protected API routes in `src/app/api/*`
   - User session management via Clerk hooks

## Common Tasks

1. **Adding New Features**
   - Add page component in `src/app/`
   - Create corresponding Convex functions if needed
   - Update navigation and auth rules

2. **Styling Updates**
   - Modify `tailwind.config.ts` for theme changes
   - Use CSS variables for dynamic values

Need help? Check the documentation links in `src/app/page.tsx` or the Convex guides in `convex/README.md`.