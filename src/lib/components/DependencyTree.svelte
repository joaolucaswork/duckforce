<script lang="ts">
	import type { SalesforceComponent, Dependency } from '$lib/types/salesforce';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';

	interface Props {
		component: SalesforceComponent;
		allComponents: SalesforceComponent[];
		onComponentClick?: (componentId: string) => void;
	}

	let { component, allComponents, onComponentClick }: Props = $props();

	function getComponentById(id: string): SalesforceComponent | undefined {
		return allComponents.find((c) => c.id === id);
	}

	function getStatusColor(status: string): string {
		switch (status) {
			case 'completed':
				return 'text-green-600';
			case 'in-progress':
				return 'text-blue-600';
			case 'pending':
				return 'text-gray-600';
			case 'blocked':
				return 'text-red-600';
			case 'skipped':
				return 'text-yellow-600';
			default:
				return 'text-gray-600';
		}
	}

	function handleClick(componentId: string) {
		if (onComponentClick) {
			onComponentClick(componentId);
		}
	}
</script>

<div class="space-y-6">
	<!-- Dependencies (What this component needs) -->
	{#if component.dependencies.length > 0}
		<Card.Root>
			<Card.Header>
				<Card.Title>Dependencies</Card.Title>
				<Card.Description>
					Components that {component.name} depends on ({component.dependencies.length})
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="space-y-2">
					{#each component.dependencies as dep}
						{@const depComponent = getComponentById(dep.id)}
						{#if depComponent}
							<button
								onclick={() => handleClick(dep.id)}
								class="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors text-left"
							>
								<div class="flex items-center gap-3">
									<div class="flex flex-col">
										<div class="flex items-center gap-2">
											<Badge variant="outline">{dep.type.toUpperCase()}</Badge>
											{#if dep.required}
												<Badge variant="destructive" class="text-xs">Required</Badge>
											{/if}
										</div>
									</div>
									<div>
										<p class="font-medium">{dep.name}</p>
										<p class="text-sm text-muted-foreground">{depComponent.apiName}</p>
									</div>
								</div>
								<div class="flex items-center gap-2">
									<span class="text-sm {getStatusColor(depComponent.migrationStatus)}">
										{depComponent.migrationStatus}
									</span>
								</div>
							</button>
						{/if}
					{/each}
				</div>
			</Card.Content>
		</Card.Root>
	{:else}
		<Card.Root>
			<Card.Header>
				<Card.Title>Dependencies</Card.Title>
			</Card.Header>
			<Card.Content>
				<p class="text-sm text-muted-foreground">No dependencies</p>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Dependents (What depends on this component) -->
	{#if component.dependents.length > 0}
		<Card.Root>
			<Card.Header>
				<Card.Title>Dependents</Card.Title>
				<Card.Description>
					Components that depend on {component.name} ({component.dependents.length})
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="space-y-2">
					{#each component.dependents as dep}
						{@const depComponent = getComponentById(dep.id)}
						{#if depComponent}
							<button
								onclick={() => handleClick(dep.id)}
								class="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors text-left"
							>
								<div class="flex items-center gap-3">
									<div class="flex flex-col">
										<div class="flex items-center gap-2">
											<Badge variant="outline">{dep.type.toUpperCase()}</Badge>
											{#if dep.required}
												<Badge variant="destructive" class="text-xs">Required</Badge>
											{/if}
										</div>
									</div>
									<div>
										<p class="font-medium">{dep.name}</p>
										<p class="text-sm text-muted-foreground">{depComponent.apiName}</p>
									</div>
								</div>
								<div class="flex items-center gap-2">
									<span class="text-sm {getStatusColor(depComponent.migrationStatus)}">
										{depComponent.migrationStatus}
									</span>
								</div>
							</button>
						{/if}
					{/each}
				</div>
			</Card.Content>
		</Card.Root>
	{:else}
		<Card.Root>
			<Card.Header>
				<Card.Title>Dependents</Card.Title>
			</Card.Header>
			<Card.Content>
				<p class="text-sm text-muted-foreground">No components depend on this</p>
			</Card.Content>
		</Card.Root>
	{/if}
</div>

