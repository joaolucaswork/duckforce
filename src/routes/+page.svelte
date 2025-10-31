<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Dialog from '$lib/components/ui/dialog';
	import { mockProject, calculateMigrationStats } from '$lib/data/mock-data';
	import type { MigrationProject, MigrationStats, SalesforceComponent, MigrationStatus } from '$lib/types/salesforce';
	import ComponentDetail from '$lib/components/ComponentDetail.svelte';
	import Logo from '$lib/components/Logo.svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	// Handle email confirmation redirect
	onMount(() => {
		// Safe to use onAuthStateChange on client-side for email confirmation
		// The session is validated server-side via safeGetSession() in hooks.server.ts
		const { data: authListener } = data.supabase.auth.onAuthStateChange(async (event, session) => {
			if (event === 'SIGNED_IN' && session) {
				// User just signed in (via email confirmation or other means)
				console.log('User signed in, redirecting to wizard');
				await goto('/wizard');
			}
		});

		// Cleanup listener on component destroy
		return () => {
			authListener.subscription.unsubscribe();
		};
	});

	let project: MigrationProject = $state(mockProject);
	let stats: MigrationStats = $derived(calculateMigrationStats(project.components));
	let selectedComponent: SalesforceComponent | null = $state(null);
	let dialogOpen = $state(false);

	function getStatusColor(status: string): string {
		switch (status) {
			case 'completed':
				return 'bg-green-500';
			case 'in-progress':
				return 'bg-blue-500';
			case 'pending':
				return 'bg-gray-400';
			case 'blocked':
				return 'bg-red-500';
			case 'skipped':
				return 'bg-yellow-500';
			default:
				return 'bg-gray-400';
		}
	}

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

	function openComponentDetail(componentId: string) {
		const component = project.components.find((c) => c.id === componentId);
		if (component) {
			selectedComponent = component;
			dialogOpen = true;
		}
	}

	function handleStatusChange(componentId: string, newStatus: MigrationStatus) {
		const componentIndex = project.components.findIndex((c) => c.id === componentId);
		if (componentIndex !== -1) {
			project.components[componentIndex].migrationStatus = newStatus;
			if (newStatus === 'completed') {
				project.components[componentIndex].migrationDate = new Date();
			}
			// Trigger reactivity
			project = { ...project };
		}
	}

	function closeDialog() {
		dialogOpen = false;
		selectedComponent = null;
	}
</script>

<main class="min-h-screen bg-background">
	<!-- Header -->
	<header class="border-b">
		<div class="container mx-auto px-6 py-4">
			<div class="flex items-center justify-between">
				<Logo size="lg" />
				<div class="flex items-center gap-4">
					<Button href="/wizard">
						New Migration
					</Button>
					<Badge variant="outline">{project.sourceOrg.name}</Badge>
					<span class="text-muted-foreground">→</span>
					<Badge variant="outline">{project.targetOrg.name}</Badge>
				</div>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<div class="container mx-auto px-6 py-8">
		<div class="space-y-8">
			<!-- Project Overview -->
			<div>
				<h2 class="text-xl font-semibold mb-4">{project.name}</h2>
				<p class="text-muted-foreground">{project.description}</p>
			</div>

			<!-- Progress Overview -->
			<Card.Root>
				<Card.Header>
					<Card.Title>Migration Progress</Card.Title>
					<Card.Description>Overall migration status and statistics</Card.Description>
				</Card.Header>
				<Card.Content>
					<div class="space-y-6">
						<!-- Progress Bar -->
						<div>
							<div class="flex items-center justify-between mb-2">
								<span class="text-sm font-medium">Overall Progress</span>
								<span class="text-sm text-muted-foreground"
									>{stats.completed} / {stats.total} components</span
								>
							</div>
							<div class="h-3 bg-secondary rounded-full overflow-hidden">
								<div
									class="h-full bg-primary transition-all duration-500"
									style="width: {(stats.completed / stats.total) * 100}%"
								></div>
							</div>
							<div class="text-right mt-1">
								<span class="text-2xl font-bold"
									>{Math.round((stats.completed / stats.total) * 100)}%</span
								>
							</div>
						</div>

						<Separator />

						<!-- Status Breakdown -->
						<div class="grid grid-cols-2 md:grid-cols-5 gap-4">
							<div class="space-y-1">
								<div class="flex items-center gap-2">
									<div class="w-3 h-3 rounded-full {getStatusColor('completed')}"></div>
									<span class="text-sm text-muted-foreground">Completed</span>
								</div>
								<p class="text-2xl font-bold">{stats.completed}</p>
							</div>
							<div class="space-y-1">
								<div class="flex items-center gap-2">
									<div class="w-3 h-3 rounded-full {getStatusColor('in-progress')}"></div>
									<span class="text-sm text-muted-foreground">In Progress</span>
								</div>
								<p class="text-2xl font-bold">{stats.inProgress}</p>
							</div>
							<div class="space-y-1">
								<div class="flex items-center gap-2">
									<div class="w-3 h-3 rounded-full {getStatusColor('pending')}"></div>
									<span class="text-sm text-muted-foreground">Pending</span>
								</div>
								<p class="text-2xl font-bold">{stats.pending}</p>
							</div>
							<div class="space-y-1">
								<div class="flex items-center gap-2">
									<div class="w-3 h-3 rounded-full {getStatusColor('blocked')}"></div>
									<span class="text-sm text-muted-foreground">Blocked</span>
								</div>
								<p class="text-2xl font-bold">{stats.blocked}</p>
							</div>
							<div class="space-y-1">
								<div class="flex items-center gap-2">
									<div class="w-3 h-3 rounded-full {getStatusColor('skipped')}"></div>
									<span class="text-sm text-muted-foreground">Skipped</span>
								</div>
								<p class="text-2xl font-bold">{stats.skipped}</p>
							</div>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Component Breakdown -->
			<Tabs.Root value="all" class="w-full">
				<Tabs.List class="grid w-full grid-cols-5">
					<Tabs.Trigger value="all">All ({stats.total})</Tabs.Trigger>
					<Tabs.Trigger value="lwc">LWC ({stats.byType.lwc.total})</Tabs.Trigger>
					<Tabs.Trigger value="apex">Apex ({stats.byType.apex.total})</Tabs.Trigger>
					<Tabs.Trigger value="object">Objects ({stats.byType.object.total})</Tabs.Trigger>
					<Tabs.Trigger value="field">Fields ({stats.byType.field.total})</Tabs.Trigger>
				</Tabs.List>

				<Tabs.Content value="all" class="space-y-4">
					<Card.Root>
						<Card.Header>
							<Card.Title>All Components</Card.Title>
							<Card.Description>Complete list of components in this migration</Card.Description>
						</Card.Header>
						<Card.Content>
							<div class="space-y-2">
								{#each project.components as component}
									<button
										onclick={() => openComponentDetail(component.id)}
										class="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors text-left cursor-pointer"
									>
										<div class="flex items-center gap-3">
											<Badge variant="outline">{component.type.toUpperCase()}</Badge>
											<div>
												<p class="font-medium">{component.name}</p>
												<p class="text-sm text-muted-foreground">{component.apiName}</p>
											</div>
										</div>
										<div class="flex items-center gap-3">
											<span class="text-sm text-muted-foreground"
												>{component.dependencies.length} dependencies</span
											>
											<Badge variant={getStatusBadgeVariant(component.migrationStatus)}>
												{component.migrationStatus}
											</Badge>
										</div>
									</button>
								{/each}
							</div>
						</Card.Content>
					</Card.Root>
				</Tabs.Content>

				<Tabs.Content value="lwc" class="space-y-4">
					<Card.Root>
						<Card.Header>
							<Card.Title>LWC Components</Card.Title>
							<Card.Description>
								{stats.byType.lwc.completed} of {stats.byType.lwc.total} completed
							</Card.Description>
						</Card.Header>
						<Card.Content>
							<div class="space-y-2">
								{#each project.components.filter((c) => c.type === 'lwc') as component}
									<button
										onclick={() => openComponentDetail(component.id)}
										class="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors text-left cursor-pointer"
									>
										<div>
											<p class="font-medium">{component.name}</p>
											<p class="text-sm text-muted-foreground">{component.apiName}</p>
										</div>
										<div class="flex items-center gap-3">
											<span class="text-sm text-muted-foreground"
												>{component.dependencies.length} dependencies</span
											>
											<Badge variant={getStatusBadgeVariant(component.migrationStatus)}>
												{component.migrationStatus}
											</Badge>
										</div>
									</button>
								{/each}
							</div>
						</Card.Content>
					</Card.Root>
				</Tabs.Content>

				<Tabs.Content value="apex" class="space-y-4">
					<Card.Root>
						<Card.Header>
							<Card.Title>Apex Components</Card.Title>
							<Card.Description>
								{stats.byType.apex.completed} of {stats.byType.apex.total} completed
							</Card.Description>
						</Card.Header>
						<Card.Content>
							<div class="space-y-2">
								{#each project.components.filter((c) => c.type === 'apex') as component}
									<div
										class="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
									>
										<div>
											<p class="font-medium">{component.name}</p>
											<p class="text-sm text-muted-foreground">{component.apiName}</p>
										</div>
										<div class="flex items-center gap-3">
											<span class="text-sm text-muted-foreground"
												>{component.dependencies.length} dependencies</span
											>
											<Badge variant={getStatusBadgeVariant(component.migrationStatus)}>
												{component.migrationStatus}
											</Badge>
										</div>
									</div>
								{/each}
							</div>
						</Card.Content>
					</Card.Root>
				</Tabs.Content>

				<Tabs.Content value="object" class="space-y-4">
					<Card.Root>
						<Card.Header>
							<Card.Title>Object Components</Card.Title>
							<Card.Description>
								{stats.byType.object.completed} of {stats.byType.object.total} completed
							</Card.Description>
						</Card.Header>
						<Card.Content>
							<div class="space-y-2">
								{#each project.components.filter((c) => c.type === 'object') as component}
									<div
										class="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
									>
										<div>
											<p class="font-medium">{component.name}</p>
											<p class="text-sm text-muted-foreground">{component.apiName}</p>
										</div>
										<div class="flex items-center gap-3">
											<span class="text-sm text-muted-foreground"
												>{component.dependencies.length} dependencies</span
											>
											<Badge variant={getStatusBadgeVariant(component.migrationStatus)}>
												{component.migrationStatus}
											</Badge>
										</div>
									</div>
								{/each}
							</div>
						</Card.Content>
					</Card.Root>
				</Tabs.Content>

				<Tabs.Content value="field" class="space-y-4">
					<Card.Root>
						<Card.Header>
							<Card.Title>Field Components</Card.Title>
							<Card.Description>
								{stats.byType.field.completed} of {stats.byType.field.total} completed
							</Card.Description>
						</Card.Header>
						<Card.Content>
							<div class="space-y-2">
								{#each project.components.filter((c) => c.type === 'field') as component}
									<div
										class="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
									>
										<div>
											<p class="font-medium">{component.name}</p>
											<p class="text-sm text-muted-foreground">{component.apiName}</p>
										</div>
										<div class="flex items-center gap-3">
											<span class="text-sm text-muted-foreground"
												>{component.dependencies.length} dependencies</span
											>
											<Badge variant={getStatusBadgeVariant(component.migrationStatus)}>
												{component.migrationStatus}
											</Badge>
										</div>
									</div>
								{/each}
							</div>
						</Card.Content>
					</Card.Root>
				</Tabs.Content>
			</Tabs.Root>
		</div>
	</div>

	<!-- Component Detail Dialog -->
	<Dialog.Root bind:open={dialogOpen}>
		<Dialog.Content class="max-w-4xl max-h-[90vh] overflow-y-auto">
			{#if selectedComponent}
				<ComponentDetail
					component={selectedComponent}
					allComponents={project.components}
					onStatusChange={handleStatusChange}
					onComponentClick={openComponentDetail}
					onClose={closeDialog}
				/>
			{/if}
		</Dialog.Content>
	</Dialog.Root>
</main>

