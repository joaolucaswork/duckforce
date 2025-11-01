# AI-Agent-Optimized Markdown Documentation Pattern

---
**Pattern ID**: `ai-agent-docs-v1`  
**Category**: Documentation Standards  
**Framework**: Markdown  
**Tags**: `documentation`, `ai-agent`, `machine-readable`, `structured-format`, `yaml`  
**Applies To**: All markdown documentation files for patterns, solutions, and implementation guides  
**Reference Implementation**: `docs/patterns/skeleton-loading-pattern.md`

---

## AI Agent Quick Reference

### Pattern Detection Rules

```yaml
apply_pattern_when:
  - file_type: "*.md"
  - purpose: ["pattern", "solution", "implementation-guide", "technical-reference"]
  - target_audience: "ai-agent"
  - creating_new_documentation: true

do_not_apply_when:
  - file_type: "README.md"
  - purpose: ["user-facing", "marketing", "changelog"]
  - target_audience: "human-developer"
  - explicit_override: true
```

### Core Template Structure

```markdown
# [Pattern Name]

---
**Pattern ID**: `pattern-id-v1`
**Category**: [Category]
**Framework**: [Framework/Language]
**Tags**: `tag1`, `tag2`, `tag3`
**Applies To**: [When to use]
**Reference Implementation**: `path/to/reference.file`
---

## AI Agent Quick Reference

### Pattern Detection Rules
[YAML rules]

### Core Implementation
[Copy-paste code template]

### Critical Rules
[Numbered list with violation consequences]

---

## Decision Tree
[ASCII tree with if/then logic]

## Code Pattern Matrix
[Tables with ✅/❌/⚠️ markers]

## Anti-Pattern Detection
[Violations with fixes]

## Implementation Checklist
[YAML checklist]

## Pattern Variants
[Concrete code examples]

## Integration Points
[YAML metadata]
```

### Critical Rules (Violation = Incorrect Documentation)

1. MUST include YAML frontmatter with pattern ID, category, tags
2. MUST have "AI Agent Quick Reference" as first section
3. MUST use structured formats (YAML, tables, trees) over narrative
4. MUST include code pattern matrix with status markers
5. MUST provide anti-pattern detection with fixes
6. MUST include implementation checklist in YAML
7. MUST remove human-centric language
8. MUST focus on technical specifications and boolean conditions

---

## Decision Tree

```
START: Creating markdown documentation
│
├─ Is file type *.md?
│  ├─ NO → Pattern not applicable
│  └─ YES → Continue
│
├─ Is purpose pattern/solution/guide?
│  ├─ NO → Check if README or user-facing
│  │  └─ Use standard markdown format
│  └─ YES → Continue
│
├─ Is target audience AI agent?
│  ├─ NO → Use human-readable format
│  └─ YES → APPLY PATTERN
│
└─ APPLY PATTERN
   │
   ├─ Step 1: Add YAML frontmatter
   │  ├─ pattern_id: unique identifier with version
   │  ├─ category: classification
   │  ├─ framework: technology/language
   │  ├─ tags: searchable keywords
   │  ├─ applies_to: usage conditions
   │  └─ reference_implementation: file path
   │
   ├─ Step 2: Create AI Agent Quick Reference
   │  ├─ Pattern detection rules (YAML)
   │  ├─ Core implementation template (code)
   │  └─ Critical rules (numbered list)
   │
   ├─ Step 3: Add Decision Tree
   │  └─ ASCII tree with if/then branching
   │
   ├─ Step 4: Create Code Pattern Matrix
   │  └─ Tables with ✅ REQUIRED/❌ FORBIDDEN/⚠️ SUBOPTIMAL
   │
   ├─ Step 5: Add Anti-Pattern Detection
   │  └─ Violations with code examples and fixes
   │
   ├─ Step 6: Create Implementation Checklist
   │  └─ YAML format with verification steps
   │
   ├─ Step 7: Add Pattern Variants
   │  └─ Concrete code examples for different scenarios
   │
   └─ Step 8: Add Integration Points
      └─ YAML metadata for dependencies and relationships
```

## Documentation Structure Matrix

| Section | Status | Format | Content |
|---------|--------|--------|---------|
| YAML Frontmatter | ✅ REQUIRED | YAML | Pattern metadata |
| AI Agent Quick Reference | ✅ REQUIRED | Mixed | Detection rules, template, critical rules |
| Decision Tree | ✅ REQUIRED | ASCII Tree | If/then branching logic |
| Code Pattern Matrix | ✅ REQUIRED | Table | Required/forbidden patterns |
| Anti-Pattern Detection | ✅ REQUIRED | Code blocks | Violations and fixes |
| Implementation Checklist | ✅ REQUIRED | YAML | Step-by-step verification |
| Pattern Variants | ✅ REQUIRED | Code blocks | Concrete examples |
| Integration Points | ✅ REQUIRED | YAML | Dependencies and relationships |
| Narrative explanations | ❌ FORBIDDEN | Prose | Human-centric text |
| Conceptual overviews | ❌ FORBIDDEN | Prose | Abstract descriptions |
| Tutorial-style content | ❌ FORBIDDEN | Prose | Step-by-step learning |

## Writing Style Matrix

| Element | Status | Example |
|---------|--------|---------|
| Technical specifications | ✅ REQUIRED | "Set variable to false at line N" |
| Boolean conditions | ✅ REQUIRED | "if (condition === true) then action" |
| Code examples | ✅ REQUIRED | Concrete implementation snippets |
| Status markers | ✅ REQUIRED | ✅ REQUIRED, ❌ FORBIDDEN, ⚠️ SUBOPTIMAL |
| YAML structures | ✅ REQUIRED | Structured data in YAML format |
| Tables and matrices | ✅ REQUIRED | Comparison and decision tables |
| Human-centric language | ❌ FORBIDDEN | "user experience", "smooth", "elegant" |
| Subjective descriptions | ❌ FORBIDDEN | "better", "cleaner", "nicer" |
| Narrative prose | ❌ FORBIDDEN | Paragraph-style explanations |
| Conceptual abstractions | ❌ FORBIDDEN | High-level theory without code |

## Anti-Pattern Detection

### ❌ Anti-Pattern 1: Missing YAML Frontmatter

```markdown
<!-- VIOLATION: No metadata -->
# Pattern Name

This pattern does something...

<!-- FIX: Add frontmatter -->
---
**Pattern ID**: `pattern-name-v1`
**Category**: Category
**Tags**: `tag1`, `tag2`
---
```

### ❌ Anti-Pattern 2: Narrative-Style Content

```markdown
<!-- VIOLATION: Human-centric prose -->
This pattern helps developers create better code by providing
a smooth and elegant solution that improves user experience.

<!-- FIX: Technical specifications -->
**Problem**: Component renders initial state before async data loads
**Solution**: Single boolean state controls skeleton visibility
**Implementation**: Set isInitialLoad = false after all async operations
```

### ❌ Anti-Pattern 3: Missing Code Examples

```markdown
<!-- VIOLATION: Conceptual only -->
The pattern uses a loading state to control visibility.

<!-- FIX: Concrete code -->
let isInitialLoad = $state(true);
onMount(async () => {
  await loadData();
  isInitialLoad = false;
});
```

### ❌ Anti-Pattern 4: No Status Markers

```markdown
<!-- VIOLATION: Ambiguous guidance -->
Use single state variable
Don't use multiple states

<!-- FIX: Explicit markers -->
✅ REQUIRED: let isInitialLoad = $state(true);
❌ FORBIDDEN: let isLoading = $state(true); let dataReady = $state(false);
```

### ❌ Anti-Pattern 5: Missing Decision Logic

```markdown
<!-- VIOLATION: No clear conditions -->
Apply this pattern when loading data.

<!-- FIX: Boolean conditions -->
apply_pattern_when:
  - component_has_onMount: true
  - onMount_contains_async_operations: true
  - async_operations_count: >= 1
```

## Implementation Checklist

```yaml
frontmatter:
  - [ ] Add pattern_id with version number
  - [ ] Add category classification
  - [ ] Add framework/technology
  - [ ] Add searchable tags (3-5 tags)
  - [ ] Add applies_to conditions
  - [ ] Add reference_implementation path

ai_quick_reference:
  - [ ] Create pattern detection rules in YAML
  - [ ] Add copy-paste code template
  - [ ] List critical rules with violation consequences
  - [ ] Number rules for reference

decision_tree:
  - [ ] Create ASCII tree structure
  - [ ] Include if/then branching logic
  - [ ] Cover all decision points
  - [ ] Show clear path to pattern application

code_pattern_matrix:
  - [ ] Create table with pattern/status/code columns
  - [ ] Mark required patterns with ✅
  - [ ] Mark forbidden patterns with ❌
  - [ ] Mark suboptimal patterns with ⚠️
  - [ ] Include code examples for each

anti_pattern_detection:
  - [ ] Identify 3-5 common violations
  - [ ] Show violation code example
  - [ ] Explain the bug/issue
  - [ ] Show fix code example
  - [ ] Use consistent format

implementation_checklist:
  - [ ] Structure in YAML format
  - [ ] Group by implementation phase
  - [ ] Include verification steps
  - [ ] Use checkbox format [ ]

pattern_variants:
  - [ ] Provide 2-3 concrete variants
  - [ ] Show complete code examples
  - [ ] Cover common scenarios
  - [ ] Label each variant clearly

integration_points:
  - [ ] List components using pattern
  - [ ] List related components
  - [ ] List related patterns
  - [ ] List framework dependencies
  - [ ] Structure in YAML format

writing_style:
  - [ ] Remove human-centric language
  - [ ] Replace with technical specifications
  - [ ] Use boolean conditions
  - [ ] Focus on code examples
  - [ ] Use status markers consistently
  - [ ] Avoid narrative prose
  - [ ] Avoid subjective descriptions
```

## YAML Frontmatter Template

```yaml
---
pattern_id: "pattern-name-v1"
category: "Category Name"
framework: "Framework/Language"
tags:
  - "tag1"
  - "tag2"
  - "tag3"
applies_to: "Condition when pattern applies"
reference_implementation: "path/to/reference/file.ext"
---
```

## Status Marker Reference

```yaml
status_markers:
  required:
    symbol: "✅"
    text: "REQUIRED"
    meaning: "Must be implemented exactly as specified"
    violation: "Bug or incorrect implementation"

  forbidden:
    symbol: "❌"
    text: "FORBIDDEN"
    meaning: "Must not be used under any circumstances"
    violation: "Bug or anti-pattern"

  suboptimal:
    symbol: "⚠️"
    text: "SUBOPTIMAL"
    meaning: "Works but not recommended"
    violation: "Technical debt or performance issue"

  optional:
    symbol: "ℹ️"
    text: "OPTIONAL"
    meaning: "Can be included based on context"
    violation: "None"
```

## Language Transformation Guide

```yaml
human_centric_to_technical:
  "user experience":
    replace_with: "render timing" | "DOM state transition" | "visual output"

  "smooth transition":
    replace_with: "300ms fade-in animation" | "CSS transition duration"

  "elegant solution":
    replace_with: "single state variable" | "reduced complexity"

  "better approach":
    replace_with: "fewer state variables" | "lower cyclomatic complexity"

  "clean code":
    replace_with: "single responsibility" | "reduced coupling"

  "intuitive":
    replace_with: "follows pattern X" | "matches existing implementation"

  "simple":
    replace_with: "cyclomatic complexity N" | "N lines of code"

  "fast":
    replace_with: "O(n) time complexity" | "N milliseconds execution time"
```

## Section Priority Order

```yaml
section_order:
  1:
    name: "YAML Frontmatter"
    priority: "CRITICAL"
    reason: "Enables AI pattern matching and categorization"

  2:
    name: "AI Agent Quick Reference"
    priority: "CRITICAL"
    reason: "Provides immediate pattern detection and implementation"

  3:
    name: "Decision Tree"
    priority: "HIGH"
    reason: "Enables conditional pattern application"

  4:
    name: "Code Pattern Matrix"
    priority: "HIGH"
    reason: "Provides clear required/forbidden patterns"

  5:
    name: "Anti-Pattern Detection"
    priority: "HIGH"
    reason: "Prevents common mistakes"

  6:
    name: "Implementation Checklist"
    priority: "MEDIUM"
    reason: "Ensures complete implementation"

  7:
    name: "Pattern Variants"
    priority: "MEDIUM"
    reason: "Covers different scenarios"

  8:
    name: "Integration Points"
    priority: "LOW"
    reason: "Provides context and relationships"
```

## Integration Points

```yaml
documentation_files_using_pattern:
  - "docs/patterns/skeleton-loading-pattern.md"
  # Add new files here as pattern is applied

related_patterns:
  code_patterns: "For code implementation patterns"
  api_patterns: "For API design patterns"
  architecture_patterns: "For system architecture patterns"

framework_dependencies:
  markdown_version: "CommonMark"
  yaml_version: "1.2"
  required_tools:
    - "Markdown parser with YAML frontmatter support"
    - "AI agent with structured data parsing"

metadata_schema:
  pattern_id:
    format: "kebab-case-v{version}"
    example: "skeleton-loading-v1"
    required: true

  category:
    format: "Title Case"
    example: "UI State Management"
    required: true

  framework:
    format: "Title Case"
    example: "Svelte 5"
    required: true

  tags:
    format: "kebab-case"
    example: ["loading-state", "async-data"]
    required: true
    min_count: 3
    max_count: 7

  applies_to:
    format: "Natural language condition"
    example: "Components with async data loading in onMount"
    required: true

  reference_implementation:
    format: "Relative file path"
    example: "src/lib/components/Example.svelte"
    required: true
```

---

**Pattern Version**: 1.0.0
**Last Updated**: 2025-01-11
**Maintained By**: AI Agent
**Review Frequency**: On new documentation creation
