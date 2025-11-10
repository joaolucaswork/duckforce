<script lang="ts">
	import type { SalesforceComponent } from '$lib/types/salesforce';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { GripVertical, MessageSquare } from '@lucide/svelte';

	interface Props {
		component: SalesforceComponent;
		note: string | undefined;
		isDragging: boolean;
		onOpenNoteSheet: () => void;
	}

	let { component, note, isDragging, onOpenNoteSheet }: Props = $props();

	const typeColors: Record<string, string> = {
		ApexClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
		ApexTrigger: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
		LightningComponentBundle: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
		CustomObject: 'bg-green-500/10 text-green-700 dark:text-green-400',
		CustomField: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400',
		Flow: 'bg-pink-500/10 text-pink-700 dark:text-pink-400',
		VisualforcePage: 'bg-orange-500/10 text-orange-700 dark:text-orange-400'
	};

	const typeColor = typeColors[component.type] || 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
</script>

<Card.Root class="transition-all py-3 gap-2 {isDragging ? 'opacity-50 cursor-grabbing' : 'cursor-grab hover:shadow-md'}">
	<Card.Header class="pb-0 px-3 gap-0.5">
		<div class="flex items-start justify-between gap-1.5">
			<div class="flex-1 min-w-0">
				<Badge class="{typeColor} text-xs px-2 py-0.5" variant="secondary">
					{component.type}
				</Badge>
				<h4 class="font-medium text-sm mt-1.5 truncate overflow-hidden whitespace-nowrap text-ellipsis" title={component.name}>
					{component.name}
				</h4>
			</div>
			<div class="flex items-center gap-1 flex-shrink-0">
				<Button
					variant="ghost"
					size="icon-sm"
					class="h-6 w-6 {note ? 'text-primary' : 'text-muted-foreground'}"
					onclick={(e) => {
						e.stopPropagation();
						onOpenNoteSheet();
					}}
					title={note ? 'Ver/Editar Nota' : 'Adicionar Nota'}
				>
					<MessageSquare class="w-3.5 h-3.5" />
				</Button>
				<GripVertical class="w-4 h-4 text-muted-foreground" />
			</div>
		</div>
	</Card.Header>
	<Card.Content class="pb-3 px-3">
		<p class="text-xs text-muted-foreground truncate overflow-hidden whitespace-nowrap text-ellipsis" title={component.apiName}>
			{component.apiName}
		</p>
		{#if component.description}
			<p class="text-xs text-muted-foreground mt-1.5 line-clamp-2">
				{component.description}
			</p>
		{/if}
	</Card.Content>
</Card.Root>

