<script lang="ts">
	import type { SalesforceComponent } from '$lib/types/salesforce';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Calendar, Tag, Code, FileText, GitBranch, Info, Clock } from '@lucide/svelte';

	interface Props {
		component: SalesforceComponent | null;
		open: boolean;
		onOpenChange: (open: boolean) => void;
	}

	let { component, open, onOpenChange }: Props = $props();

	// Format date for display
	function formatDate(dateString: string | undefined): string {
		if (!dateString) return 'Unknown';

		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		});
	}

	// Capitalize first letter
	function capitalizeFirst(str: string): string {
		return str.charAt(0).toUpperCase() + str.slice(1);
	}
</script>

<Dialog.Root {open} onOpenChange={onOpenChange}>
	<Dialog.Content class="max-w-3xl max-h-[85vh] overflow-y-auto">
		{#if component}
			<Dialog.Header class="space-y-3">
				<div class="flex items-start gap-3">
					<Badge variant="outline" class="text-xs font-mono flex-shrink-0 mt-0.5">
						{component.type.toUpperCase()}
					</Badge>
					<div class="flex-1 min-w-0">
						<Dialog.Title class="text-xl font-semibold font-mono break-words">
							{component.name}
						</Dialog.Title>
						<Dialog.Description class="font-mono text-xs text-muted-foreground mt-1 break-all">
							{component.apiName}
						</Dialog.Description>
					</div>
				</div>
			</Dialog.Header>

			<div class="space-y-5 mt-6">
				<!-- Metadata - Most Important -->
				<div class="bg-muted/30 rounded-lg p-4 space-y-3">
					<div class="flex items-center gap-2 text-sm font-semibold text-foreground">
						<Clock class="h-4 w-4" />
						<span>Timeline</span>
					</div>
					<div class="grid grid-cols-2 gap-4">
						<div class="flex items-start gap-2">
							<Calendar class="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
							<div class="min-w-0 flex-1">
								<p class="text-xs text-muted-foreground">Created</p>
								<p class="font-medium text-sm break-words">
									{formatDate(component.metadata?.created_date)}
								</p>
							</div>
						</div>
						<div class="flex items-start gap-2">
							<Calendar class="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
							<div class="min-w-0 flex-1">
								<p class="text-xs text-muted-foreground">Last Modified</p>
								<p class="font-medium text-sm break-words">
									{formatDate(component.metadata?.last_modified_date)}
								</p>
							</div>
						</div>
					</div>
				</div>

				<!-- Basic Information -->
				<div class="space-y-3">
					<div class="flex items-center gap-2 text-sm font-semibold text-foreground">
						<Info class="h-4 w-4" />
						<span>Details</span>
					</div>
					<div class="space-y-3 pl-6">
						<div class="flex items-start gap-2">
							<Tag class="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
							<div class="min-w-0 flex-1">
								<p class="text-xs text-muted-foreground">Type</p>
								<Badge variant="secondary" class="font-mono text-xs mt-1">
									{capitalizeFirst(component.type)}
								</Badge>
							</div>
						</div>
						<div class="flex items-start gap-2">
							<Code class="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
							<div class="min-w-0 flex-1">
								<p class="text-xs text-muted-foreground">API Name</p>
								<p class="font-medium font-mono text-sm break-all mt-1">{component.apiName}</p>
							</div>
						</div>
						{#if component.namespace}
							<div class="flex items-start gap-2">
								<Code class="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
								<div class="min-w-0 flex-1">
									<p class="text-xs text-muted-foreground">Namespace</p>
									<p class="font-medium font-mono text-sm break-all mt-1">{component.namespace}</p>
								</div>
							</div>
						{/if}
						{#if component.description}
							<div class="flex items-start gap-2">
								<FileText class="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
								<div class="min-w-0 flex-1">
									<p class="text-xs text-muted-foreground">Description</p>
									<p class="text-sm break-words mt-1">{component.description}</p>
								</div>
							</div>
						{/if}
					</div>
				</div>

				<!-- Dependencies Section -->
				{#if component.dependencies && component.dependencies.length > 0}
					<Separator />
					<div class="space-y-3">
						<div class="flex items-center gap-2 text-sm font-semibold text-foreground">
							<GitBranch class="h-4 w-4" />
							<span>Dependencies</span>
							<Badge variant="secondary" class="text-xs ml-auto">
								{component.dependencies.length}
							</Badge>
						</div>
						<p class="text-xs text-muted-foreground pl-6">
							Components that this {component.type} depends on
						</p>
						<div class="space-y-2 pl-6">
							{#each component.dependencies as dep}
								<div class="flex items-center justify-between p-2.5 rounded-md border bg-card hover:bg-accent/50 transition-colors">
									<div class="flex items-center gap-2 min-w-0 flex-1">
										<Badge variant="outline" class="text-xs font-mono flex-shrink-0">
											{dep.type.toUpperCase()}
										</Badge>
										<span class="text-sm font-mono truncate">{dep.name}</span>
									</div>
									{#if dep.required}
										<Badge variant="destructive" class="text-xs flex-shrink-0 ml-2">Required</Badge>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Dependents Section -->
				{#if component.dependents && component.dependents.length > 0}
					<Separator />
					<div class="space-y-3">
						<div class="flex items-center gap-2 text-sm font-semibold text-foreground">
							<GitBranch class="h-4 w-4 rotate-180" />
							<span>Dependents</span>
							<Badge variant="secondary" class="text-xs ml-auto">
								{component.dependents.length}
							</Badge>
						</div>
						<p class="text-xs text-muted-foreground pl-6">
							Components that depend on this {component.type}
						</p>
						<div class="space-y-2 pl-6">
							{#each component.dependents as dep}
								<div class="flex items-center justify-between p-2.5 rounded-md border bg-card hover:bg-accent/50 transition-colors">
									<div class="flex items-center gap-2 min-w-0 flex-1">
										<Badge variant="outline" class="text-xs font-mono flex-shrink-0">
											{dep.type.toUpperCase()}
										</Badge>
										<span class="text-sm font-mono truncate">{dep.name}</span>
									</div>
									{#if dep.required}
										<Badge variant="destructive" class="text-xs flex-shrink-0 ml-2">Required</Badge>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Type-specific Information -->
				{#if component.type === 'apex'}
					<Separator />
					<div class="space-y-3">
						<div class="flex items-center gap-2 text-sm font-semibold text-foreground">
							<Code class="h-4 w-4" />
							<span>Apex Class Details</span>
						</div>
						<div class="grid grid-cols-2 gap-4 pl-6">
							{#if component.metadata?.apiversion}
								<div class="flex items-start gap-2">
									<Tag class="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
									<div class="min-w-0 flex-1">
										<p class="text-xs text-muted-foreground">API Version</p>
										<p class="font-medium text-sm mt-1">{component.metadata.apiversion}</p>
									</div>
								</div>
							{/if}
							{#if component.metadata?.status}
								<div class="flex items-start gap-2">
									<Info class="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
									<div class="min-w-0 flex-1">
										<p class="text-xs text-muted-foreground">Status</p>
										<Badge variant="secondary" class="text-xs mt-1">{component.metadata.status}</Badge>
									</div>
								</div>
							{/if}
							{#if component.metadata?.isvalid !== undefined}
								<div class="flex items-start gap-2">
									<Info class="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
									<div class="min-w-0 flex-1">
										<p class="text-xs text-muted-foreground">Valid</p>
										<Badge variant={component.metadata.isvalid ? 'default' : 'destructive'} class="text-xs mt-1">
											{component.metadata.isvalid ? 'Yes' : 'No'}
										</Badge>
									</div>
								</div>
							{/if}
							{#if component.metadata?.lengthwithoutcomments}
								<div class="flex items-start gap-2">
									<FileText class="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
									<div class="min-w-0 flex-1">
										<p class="text-xs text-muted-foreground">Lines of Code</p>
										<p class="font-medium text-sm mt-1">{component.metadata.lengthwithoutcomments}</p>
									</div>
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		{:else}
			<!-- Loading state -->
			<div class="space-y-4">
				<Skeleton class="h-8 w-3/4" />
				<Skeleton class="h-4 w-1/2" />
				<Separator />
				<Skeleton class="h-32 w-full" />
			</div>
		{/if}
	</Dialog.Content>
</Dialog.Root>
