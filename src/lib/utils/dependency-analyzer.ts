import type {
	SalesforceComponent,
	Dependency,
	DependencyGraph,
	DependencyNode,
	DependencyEdge,
	LWCComponent,
	FieldComponent,
	ObjectComponent,
	ApexComponent
} from '$lib/types/salesforce';

/**
 * Analyzes dependencies between Salesforce components
 */
export class DependencyAnalyzer {
	private components: Map<string, SalesforceComponent>;

	constructor(components: SalesforceComponent[]) {
		this.components = new Map(components.map((c) => [c.id, c]));
	}

	/**
	 * Build a dependency graph from all components
	 */
	buildDependencyGraph(): DependencyGraph {
		const nodes: DependencyNode[] = [];
		const edges: DependencyEdge[] = [];

		// Create nodes
		for (const component of this.components.values()) {
			nodes.push({
				id: component.id,
				component
			});

			// Create edges for dependencies
			for (const dep of component.dependencies) {
				edges.push({
					source: component.id,
					target: dep.id,
					required: dep.required
				});
			}
		}

		return { nodes, edges };
	}

	/**
	 * Get all dependencies for a component (recursive)
	 */
	getAllDependencies(componentId: string, visited = new Set<string>()): SalesforceComponent[] {
		if (visited.has(componentId)) {
			return [];
		}

		visited.add(componentId);
		const component = this.components.get(componentId);
		if (!component) {
			return [];
		}

		const dependencies: SalesforceComponent[] = [];

		for (const dep of component.dependencies) {
			const depComponent = this.components.get(dep.id);
			if (depComponent) {
				dependencies.push(depComponent);
				dependencies.push(...this.getAllDependencies(dep.id, visited));
			}
		}

		return dependencies;
	}

	/**
	 * Get all components that depend on this component (recursive)
	 */
	getAllDependents(componentId: string, visited = new Set<string>()): SalesforceComponent[] {
		if (visited.has(componentId)) {
			return [];
		}

		visited.add(componentId);
		const component = this.components.get(componentId);
		if (!component) {
			return [];
		}

		const dependents: SalesforceComponent[] = [];

		for (const dep of component.dependents) {
			const depComponent = this.components.get(dep.id);
			if (depComponent) {
				dependents.push(depComponent);
				dependents.push(...this.getAllDependents(dep.id, visited));
			}
		}

		return dependents;
	}

	/**
	 * Find circular dependencies
	 */
	findCircularDependencies(): string[][] {
		const cycles: string[][] = [];
		const visited = new Set<string>();
		const recursionStack = new Set<string>();

		const dfs = (componentId: string, path: string[]): void => {
			visited.add(componentId);
			recursionStack.add(componentId);
			path.push(componentId);

			const component = this.components.get(componentId);
			if (component) {
				for (const dep of component.dependencies) {
					if (!visited.has(dep.id)) {
						dfs(dep.id, [...path]);
					} else if (recursionStack.has(dep.id)) {
						// Found a cycle
						const cycleStart = path.indexOf(dep.id);
						cycles.push([...path.slice(cycleStart), dep.id]);
					}
				}
			}

			recursionStack.delete(componentId);
		};

		for (const componentId of this.components.keys()) {
			if (!visited.has(componentId)) {
				dfs(componentId, []);
			}
		}

		return cycles;
	}

	/**
	 * Get migration order based on dependencies
	 * Returns components in the order they should be migrated
	 */
	getMigrationOrder(): SalesforceComponent[] {
		const order: SalesforceComponent[] = [];
		const visited = new Set<string>();
		const temp = new Set<string>();

		const visit = (componentId: string): void => {
			if (visited.has(componentId)) {
				return;
			}

			if (temp.has(componentId)) {
				// Circular dependency detected, skip
				return;
			}

			temp.add(componentId);

			const component = this.components.get(componentId);
			if (component) {
				// Visit all dependencies first
				for (const dep of component.dependencies) {
					visit(dep.id);
				}

				temp.delete(componentId);
				visited.add(componentId);
				order.push(component);
			}
		};

		for (const componentId of this.components.keys()) {
			visit(componentId);
		}

		return order;
	}

	/**
	 * Check if a component can be migrated (all dependencies are completed)
	 */
	canMigrate(componentId: string): boolean {
		const component = this.components.get(componentId);
		if (!component) {
			return false;
		}

		// Check if all required dependencies are completed
		for (const dep of component.dependencies) {
			if (dep.required) {
				const depComponent = this.components.get(dep.id);
				if (!depComponent || depComponent.migrationStatus !== 'completed') {
					return false;
				}
			}
		}

		return true;
	}

	/**
	 * Get components that are blocked (cannot be migrated due to dependencies)
	 */
	getBlockedComponents(): SalesforceComponent[] {
		const blocked: SalesforceComponent[] = [];

		for (const component of this.components.values()) {
			if (
				component.migrationStatus === 'pending' ||
				component.migrationStatus === 'in-progress'
			) {
				if (!this.canMigrate(component.id)) {
					blocked.push(component);
				}
			}
		}

		return blocked;
	}

	/**
	 * Get components that are ready to migrate
	 */
	getReadyToMigrate(): SalesforceComponent[] {
		const ready: SalesforceComponent[] = [];

		for (const component of this.components.values()) {
			if (component.migrationStatus === 'pending' && this.canMigrate(component.id)) {
				ready.push(component);
			}
		}

		return ready;
	}
}

/**
 * Parse LWC dependencies from JavaScript file content
 */
export function parseLWCDependencies(jsContent: string): string[] {
	const dependencies: string[] = [];

	// Match import statements
	const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
	let match;

	while ((match = importRegex.exec(jsContent)) !== null) {
		const importPath = match[1];

		// Check if it's a Lightning component import
		if (importPath.startsWith('c/') || importPath.startsWith('lightning/')) {
			dependencies.push(importPath);
		}
	}

	return dependencies;
}

/**
 * Parse Apex dependencies from class content
 */
export function parseApexDependencies(apexContent: string): string[] {
	const dependencies: string[] = [];

	// Match class references (simplified)
	const classRefRegex = /\b([A-Z][a-zA-Z0-9_]*)\s+\w+\s*=/g;
	let match;

	while ((match = classRefRegex.exec(apexContent)) !== null) {
		const className = match[1];
		if (className !== 'String' && className !== 'Integer' && className !== 'Boolean') {
			dependencies.push(className);
		}
	}

	return [...new Set(dependencies)]; // Remove duplicates
}

