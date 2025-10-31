<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Progress } from '$lib/components/ui/progress';
	import * as Icons from 'lucide-svelte';

	interface Props {
		open: boolean;
		orgName: string;
		currentStep?: string;
		progress?: number;
		onClose?: () => void;
	}

	let { 
		open = $bindable(), 
		orgName, 
		currentStep = 'Initializing...', 
		progress = 0,
		onClose
	}: Props = $props();

	function handleClose() {
		if (onClose) {
			onClose();
		} else {
			open = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Syncing Organization</Dialog.Title>
			<Dialog.Description>
				Fetching components from {orgName}
			</Dialog.Description>
		</Dialog.Header>
		
		<div class="space-y-4 py-4">
			<!-- Progress bar -->
			<div class="space-y-2">
				<div class="flex items-center justify-between text-sm">
					<span class="text-muted-foreground">{currentStep}</span>
					<span class="font-medium">{Math.round(progress)}%</span>
				</div>
				<Progress value={progress} class="h-2" />
			</div>

			<!-- Loading animation -->
			<div class="flex items-center justify-center py-4">
				<Icons.RefreshCw class="h-8 w-8 animate-spin text-primary" />
			</div>

			<!-- Status message -->
			<p class="text-center text-sm text-muted-foreground">
				This may take a few moments depending on the size of your organization.
			</p>
		</div>
	</Dialog.Content>
</Dialog.Root>

