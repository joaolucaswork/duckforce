# Skeleton Loading Pattern

---
**Pattern ID**: `skeleton-loading-v1`
**Category**: UI State Management
**Framework**: Svelte 5
**Tags**: `loading-state`, `async-data`, `onMount`, `skeleton-ui`, `visual-flash-prevention`
**Applies To**: Components with async data loading in `onMount`
**Reference Implementation**: `src/lib/components/wizard/steps/ConfigureOrgs.svelte`

---

## AI Agent Quick Reference

### Pattern Detection Rules
```yaml
apply_pattern_when:
  - component_has_onMount: true
  - onMount_contains_async_operations: true
  - async_operations_count: >= 1
  - component_renders_data_dependent_content: true
  - initial_state_differs_from_loaded_state: true

do_not_apply_when:
  - data_load_time: < 50ms
  - loading_triggered_by: user_action  # Use loading buttons instead
  - content_is: static
  - component_visibility: not_on_initial_render
```

### Core Implementation (Copy-Paste Template)

```typescript
// STATE: Single boolean, initialized to true
let isInitialLoad = $state(true);

// LIFECYCLE: Set to false ONLY at end of onMount
onMount(async () => {
  try {
    await asyncOperation1();
    await asyncOperation2();
    await asyncOperationN();
    await new Promise(resolve => setTimeout(resolve, 100));
    isInitialLoad = false;  // CRITICAL: Must be last statement
  } catch (err) {
    console.error(err);
    await new Promise(resolve => setTimeout(resolve, 100));
    isInitialLoad = false;  // CRITICAL: Also in error path
  }
});
```

```svelte
<!-- TEMPLATE: Conditional with animation -->
{#if isInitialLoad}
  <Skeleton class="h-10 w-full" />
{:else}
  <div class="animate-in fade-in duration-300">
    <!-- content -->
  </div>
{/if}
```

### Critical Rules (Violation = Bug)
1. `isInitialLoad = false` MUST be last statement in `onMount`
2. MUST use single boolean state (not multiple flags)
3. MUST include in both try and catch blocks
4. MUST wait for ALL async operations before setting false
5. MUST apply `animate-in fade-in duration-300` to content container

---

## Technical Problem Definition

**Issue**: Component renders with initial state values before async data loads, causing visible DOM state transition.

**Timing Sequence**:
```
T0: Component mount → state = initial values
T1: First render → DOM shows initial state
T2: onMount fires → async operations start
T3: Data arrives → state updates
T4: Re-render → DOM shows loaded state
Problem: T1-T4 transition is visible
```

**Root Cause**: Svelte reactivity renders initial state before `onMount` async operations complete.

## Decision Tree

```
START: Implementing component with async data loading
│
├─ Does onMount contain async operations?
│  ├─ NO → Pattern not applicable
│  └─ YES → Continue
│
├─ Do async operations take < 50ms?
│  ├─ YES → Pattern not applicable (overhead not justified)
│  └─ NO → Continue
│
├─ Does initial state differ from loaded state?
│  ├─ NO → Pattern not applicable
│  └─ YES → Continue
│
└─ APPLY PATTERN
   │
   ├─ Step 1: Add state
   │  └─ let isInitialLoad = $state(true);
   │
   ├─ Step 2: Modify onMount
   │  ├─ Move all async operations into try block
   │  ├─ Add 100ms delay after last operation
   │  ├─ Set isInitialLoad = false as LAST statement in try
   │  └─ Set isInitialLoad = false as LAST statement in catch
   │
   ├─ Step 3: Update template
   │  ├─ Wrap in {#if isInitialLoad} ... {:else} ... {/if}
   │  ├─ Add skeleton components in if block
   │  └─ Add "animate-in fade-in duration-300" to content container
   │
   └─ Step 4: Verify
      ├─ isInitialLoad = false appears exactly twice (try and catch)
      ├─ Both occurrences are last statements in their blocks
      ├─ All async operations complete before setting false
      └─ Animation classes applied to content container
```

## Code Pattern Matrix

### State Declaration

| Pattern | Status | Code |
|---------|--------|------|
| Single boolean | ✅ REQUIRED | `let isInitialLoad = $state(true);` |
| Multiple flags | ❌ FORBIDDEN | `let isLoading = $state(true); let dataReady = $state(false);` |
| Derived state | ❌ FORBIDDEN | `let showContent = $derived(!isLoading && dataReady);` |

### onMount Structure

| Pattern | Status | Code |
|---------|--------|------|
| Set false at end | ✅ REQUIRED | See template above |
| Set false after first async | ❌ FORBIDDEN | `await load(); isInitialLoad = false; await check();` |
| Set false without delay | ⚠️ SUBOPTIMAL | Missing `await new Promise(resolve => setTimeout(resolve, 100));` |
| Missing error path | ❌ FORBIDDEN | No `isInitialLoad = false` in catch block |

### Template Conditional

| Pattern | Status | Code |
|---------|--------|------|
| Simple if/else | ✅ REQUIRED | `{#if isInitialLoad} <Skeleton /> {:else} <Content /> {/if}` |
| Class binding | ❌ FORBIDDEN | `class:hidden={!isInitialLoad}` |
| Opacity transition | ❌ FORBIDDEN | `class:opacity-0={!isInitialLoad}` |

### Animation Classes

| Pattern | Status | Classes |
|---------|--------|---------|
| Tailwind animate-in | ✅ REQUIRED | `animate-in fade-in duration-300` |
| Manual CSS transition | ❌ FORBIDDEN | `style="transition: opacity 500ms"` |
| Class binding animation | ❌ FORBIDDEN | `class:opacity-100={showContent}` |

## Anti-Pattern Detection

### ❌ Anti-Pattern 1: Early State Update

```typescript
// VIOLATION: isInitialLoad set before all operations complete
onMount(async () => {
  await loadData();
  isInitialLoad = false; // ❌ BUG: More operations follow
  await checkStatus();   // This will cause flash
  updateState();
});

// FIX: Move to end
onMount(async () => {
  await loadData();
  await checkStatus();
  updateState();
  await new Promise(resolve => setTimeout(resolve, 100));
  isInitialLoad = false; // ✅ CORRECT: Last statement
});
```

### ❌ Anti-Pattern 2: Multiple Loading States

```typescript
// VIOLATION: Overcomplicated state management
let isLoading = $state(true);
let dataReady = $state(false);
let showContent = $state(false);

// FIX: Single state
let isInitialLoad = $state(true);
```

### ❌ Anti-Pattern 3: Manual CSS Transitions

```svelte
<!-- VIOLATION: Manual opacity management -->
<div
  class:opacity-0={!showContent}
  class:opacity-100={showContent}
  style="transition: opacity 500ms;"
>

<!-- FIX: Tailwind animations -->
<div class="animate-in fade-in duration-300">
```

### ❌ Anti-Pattern 4: Missing Error Path

```typescript
// VIOLATION: No isInitialLoad = false in catch
onMount(async () => {
  try {
    await loadData();
    isInitialLoad = false;
  } catch (err) {
    console.error(err);
    // ❌ BUG: Skeleton stays forever on error
  }
});

// FIX: Include in catch
onMount(async () => {
  try {
    await loadData();
    await new Promise(resolve => setTimeout(resolve, 100));
    isInitialLoad = false;
  } catch (err) {
    console.error(err);
    await new Promise(resolve => setTimeout(resolve, 100));
    isInitialLoad = false; // ✅ CORRECT
  }
});
```

### ❌ Anti-Pattern 5: Excessive Delay

```typescript
// VIOLATION: Delay too long
await new Promise(resolve => setTimeout(resolve, 600)); // ❌ Too slow

// FIX: Standard delay
await new Promise(resolve => setTimeout(resolve, 100)); // ✅ CORRECT
```

## Implementation Checklist

```yaml
pre_implementation:
  - [ ] Verify component has async operations in onMount
  - [ ] Confirm initial state differs from loaded state
  - [ ] Identify all async operations that must complete

state_declaration:
  - [ ] Add: let isInitialLoad = $state(true);
  - [ ] Remove any existing multiple loading states

onMount_modification:
  - [ ] Wrap all async operations in try block
  - [ ] Add await new Promise(resolve => setTimeout(resolve, 100)); before setting false
  - [ ] Add isInitialLoad = false; as last statement in try block
  - [ ] Add catch block with error logging
  - [ ] Add await new Promise(resolve => setTimeout(resolve, 100)); in catch
  - [ ] Add isInitialLoad = false; as last statement in catch block

template_update:
  - [ ] Add {#if isInitialLoad} conditional
  - [ ] Add skeleton components in if block
  - [ ] Add {:else} block
  - [ ] Add animate-in fade-in duration-300 to content container
  - [ ] Close {/if} block

verification:
  - [ ] isInitialLoad = false appears exactly twice
  - [ ] Both occurrences are last statements in their blocks
  - [ ] 100ms delay precedes both occurrences
  - [ ] All async operations complete before setting false
  - [ ] Skeleton structure matches content layout
  - [ ] Animation classes applied to content container
  - [ ] No manual CSS transitions used
  - [ ] No multiple loading state variables
```

## Pattern Variants

### Variant A: Single Async Operation

```typescript
onMount(async () => {
  try {
    await fetch('/api/data').then(r => r.json());
    await new Promise(resolve => setTimeout(resolve, 100));
    isInitialLoad = false;
  } catch (err) {
    console.error(err);
    await new Promise(resolve => setTimeout(resolve, 100));
    isInitialLoad = false;
  }
});
```

### Variant B: Multiple Sequential Operations

```typescript
onMount(async () => {
  try {
    await loadCachedData();
    await checkConnectionStatus();
    await validatePermissions();
    await new Promise(resolve => setTimeout(resolve, 100));
    isInitialLoad = false;
  } catch (err) {
    console.error(err);
    await new Promise(resolve => setTimeout(resolve, 100));
    isInitialLoad = false;
  }
});
```

### Variant C: Parallel Operations

```typescript
onMount(async () => {
  try {
    await Promise.all([
      loadCachedData(),
      checkConnectionStatus(),
      validatePermissions()
    ]);
    await new Promise(resolve => setTimeout(resolve, 100));
    isInitialLoad = false;
  } catch (err) {
    console.error(err);
    await new Promise(resolve => setTimeout(resolve, 100));
    isInitialLoad = false;
  }
});
```

## Tailwind Animation Reference

```yaml
required_classes:
  base: "animate-in"
  effect: "fade-in"
  duration: "duration-300"

full_class_string: "animate-in fade-in duration-300"

alternative_effects:
  - "slide-in-from-top"
  - "slide-in-from-bottom"
  - "slide-in-from-left"
  - "slide-in-from-right"
  - "zoom-in"

alternative_durations:
  - "duration-150"  # 150ms
  - "duration-300"  # 300ms (recommended)
  - "duration-500"  # 500ms
  - "duration-700"  # 700ms
  - "duration-1000" # 1000ms

forbidden:
  - manual_css_transitions
  - class_binding_for_opacity
  - inline_style_transitions
```

## Integration Points

```yaml
components_using_pattern:
  - "src/lib/components/wizard/steps/ConfigureOrgs.svelte"
  # Add new components here as pattern is applied

related_components:
  skeleton_ui: "src/lib/components/ui/skeleton"

related_patterns:
  loading_buttons: "For user-action-triggered loading"
  optimistic_ui: "For immediate feedback patterns"
  progressive_loading: "For staged content loading"

framework_dependencies:
  svelte_version: "5.x"
  tailwind_version: "3.x"
  required_imports:
    - "{ onMount } from 'svelte'"
    - "{ Skeleton } from '$lib/components/ui/skeleton'"
```

---

**Pattern Version**: 1.0.0
**Last Updated**: 2025-01-11
**Maintained By**: AI Agent
**Review Frequency**: On pattern violation detection
