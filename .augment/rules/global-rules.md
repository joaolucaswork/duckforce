---
type: "always_apply"
description: "Global rules that apply to all augment tasks."
---

# Global Augment Rules

## Design Pattern and Component Preference Memory Rule

**When to Save:** Whenever the user demonstrates, describes, or expresses a preference for any of the following:

- UI/UX design patterns (e.g., layout preferences, interaction patterns, visual hierarchies)
- Component architecture patterns (e.g., composition patterns, state management approaches)
- Code structure patterns (e.g., file organization, naming conventions, API design)
- Specific component requests or requirements (e.g., "I prefer side-by-side views for comparisons", "use dedicated components for multi-org displays")
- Technology or library preferences (e.g., "don't use Konva", "prefer existing visualization approach")
- Workflow or feature implementation preferences

**What to Save:** Capture the following details:

- The specific pattern, preference, or requirement described
- The context in which it applies (e.g., which feature, component type, or scenario)
- Any constraints or conditions mentioned
- The rationale if provided by the user

**How to Save:**

1. Use the `remember` tool to save to Augment's internal memory system
2. Use the `add-memory_mem0-memory` tool to save to the mem0 MCP memory system
3. Format the memory as a concise, actionable statement that can be referenced in future interactions
4. Include enough context to make the memory useful without requiring the original conversation

**Example Scenarios:**

- User says "I prefer a side-by-side comparison view" → Save this UI pattern preference
- User shows a specific component structure they like → Save the architectural pattern
- User rejects a suggested library or approach → Save the technology preference
- User describes how they want data to be organized → Save the data structure pattern

This ensures consistent application of user preferences across all future development work.


## Development Server Management Rules

**CRITICAL: Never start the development server automatically.**

Do NOT execute any of the following commands unless explicitly requested by the user:

- `pnpm run dev`
- `pnpm dev`
- `npm run dev`
- `npm dev`
- `yarn dev`
- Any other development server start commands (e.g., `next dev`, `vite`, `npm start` for dev servers)

**Default Assumption:** Always assume the development server is already running in a separate terminal session.

**Exception:** Only start a development server if the user explicitly asks you to do so with clear language such as:

- "Start the dev server"
- "Run the development server"
- "Launch the app"
- "Start the application"

**Rationale:** The user manages the development server separately and does not want it restarted during normal development tasks, as this would interrupt their workflow and cause unnecessary delays.
