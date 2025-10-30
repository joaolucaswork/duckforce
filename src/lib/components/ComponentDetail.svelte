<script lang="ts">
	import type { SalesforceComponent, MigrationStatus } from '$lib/types/salesforce';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import DependencyTree from './DependencyTree.svelte';

	interface Props {
		component: SalesforceComponent;
		allComponents: SalesforceComponent[];
		onStatusChange?: (componentId: string, newStatus: MigrationStatus) => void;
		onComponentClick?: (componentId: string) => void;
		onClose?: () => void;
	}

	let { component, allComponents, onStatusChange, onComponentClick, onClose }: Props = $props();

	function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'outline' | 'destructive' {
		switch (status) {
			case 'completed':
				return 'default';
			case 'in-progress':
				return 'secondary';
			case 'blocked':
				return 'destructive';
			default:
				return 'outline';
		}
	}

	function handleStatusChange(newStatus: MigrationStatus) {
		if (onStatusChange) {
			onStatusChange(component.id, newStatus);
		}
	}

	function formatDate(date?: Date): string {
		if (!date) return 'Not migrated';
		return new Date(date).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-start justify-between">
		<div class="space-y-2">
			<div class="flex items-center gap-3">
				<Badge variant="outline" class="text-sm">{component.type.toUpperCase()}</Badge>
				<Badge variant={getStatusBadgeVariant(component.migrationStatus)}>
					{component.migrationStatus}
				</Badge>
			</div>
			<h2 class="text-3xl font-bold tracking-tight">{component.name}</h2>
			<p class="text-muted-foreground">{component.apiName}</p>
			{#if component.description}
				<p class="text-sm text-muted-foreground">{component.description}</p>
			{/if}
		</div>
		{#if onClose}
			<Button variant="outline" onclick={onClose}>Close</Button>
		{/if}
	</div>

	<Separator />

	<!-- Component Details -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Component Information</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="grid grid-cols-2 gap-4">
				<div>
					<p class="text-sm text-muted-foreground">Type</p>
					<p class="font-medium">{component.type.toUpperCase()}</p>
				</div>
				<div>
					<p class="text-sm text-muted-foreground">API Name</p>
					<p class="font-medium">{component.apiName}</p>
				</div>
				<div>
					<p class="text-sm text-muted-foreground">Migration Status</p>
					<p class="font-medium">{component.migrationStatus}</p>
				</div>
				<div>
					<p class="text-sm text-muted-foreground">Migration Date</p>
					<p class="font-medium">{formatDate(component.migrationDate)}</p>
				</div>
				{#if component.namespace}
					<div>
						<p class="text-sm text-muted-foreground">Namespace</p>
						<p class="font-medium">{component.namespace}</p>
					</div>
				{/if}
			</div>

			{#if component.migrationNotes}
				<div class="mt-4">
					<p class="text-sm text-muted-foreground mb-1">Migration Notes</p>
					<p class="text-sm">{component.migrationNotes}</p>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Migration Actions -->
	{#if onStatusChange}
		<Card.Root>
			<Card.Header>
				<Card.Title>Update Migration Status</Card.Title>
				<Card.Description>Change the migration status of this component</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="flex flex-wrap gap-2">
					<Button
						variant={component.migrationStatus === 'pending' ? 'default' : 'outline'}
						onclick={() => handleStatusChange('pending')}
					>
						Pending
					</Button>
					<Button
						variant={component.migrationStatus === 'in-progress' ? 'default' : 'outline'}
						onclick={() => handleStatusChange('in-progress')}
					>
						In Progress
					</Button>
					<Button
						variant={component.migrationStatus === 'completed' ? 'default' : 'outline'}
						onclick={() => handleStatusChange('completed')}
					>
						Completed
					</Button>
					<Button
						variant={component.migrationStatus === 'blocked' ? 'destructive' : 'outline'}
						onclick={() => handleStatusChange('blocked')}
					>
						Blocked
					</Button>
					<Button
						variant={component.migrationStatus === 'skipped' ? 'default' : 'outline'}
						onclick={() => handleStatusChange('skipped')}
					>
						Skipped
					</Button>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Dependencies -->
	<DependencyTree {component} {allComponents} {onComponentClick} />
</div>

