<script lang="ts">
	import { wizardStore } from '$lib/stores/wizard.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Alert from '$lib/components/ui/alert';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Select from '$lib/components/ui/select';
	import { CheckCircle2, AlertCircle, Loader2, MoreVertical, ArrowRight } from '@lucide/svelte';
	import type { SalesforceOrg } from '$lib/types/salesforce';

	// Source Org State
	let sourceOrgName = $state('');
	let sourceInstanceUrl = $state('');
	let sourceOrgType = $state<'production' | 'sandbox' | 'developer' | 'scratch'>('production');
	let sourceApiVersion = $state('60.0');
	let sourceColor = $state('#3b82f6'); // Default blue
	let sourceNameEditing = $state(false);
	let sourceOrgNameManuallyEdited = $state(false); // Track if user manually edited the name

	// Target Org State
	let targetOrgName = $state('');
	let targetInstanceUrl = $state('');
	let targetOrgType = $state<'production' | 'sandbox' | 'developer' | 'scratch'>('sandbox');
	let targetApiVersion = $state('60.0');
	let targetColor = $state('#10b981'); // Default green
	let targetNameEditing = $state(false);
	let targetOrgNameManuallyEdited = $state(false); // Track if user manually edited the name

	/**
	 * Extract organization name from a Salesforce instance URL
	 * Handles various URL formats:
	 * - https://mycompany.my.salesforce.com -> mycompany
	 * - https://mycompany--uat.sandbox.my.salesforce.com -> mycompany--uat
	 * - mycompany.my.salesforce.com -> mycompany
	 * - www.mycompany.salesforce.com -> mycompany
	 */
	function extractOrgNameFromUrl(url: string): string {
		if (!url || url.trim() === '') return '';

		try {
			// Remove protocol if present
			let cleanUrl = url.trim().replace(/^https?:\/\//, '');

			// Remove www. if present
			cleanUrl = cleanUrl.replace(/^www\./, '');

			// Split by dots to get the first segment
			const parts = cleanUrl.split('.');

			if (parts.length > 0 && parts[0]) {
				// Return the first segment (subdomain/org name)
				return parts[0];
			}
		} catch (error) {
			// If parsing fails, return empty string
			console.error('Error extracting org name from URL:', error);
		}

		return '';
	}

	// Auto-extract source org name from URL
	$effect(() => {
		// Only auto-fill if the name hasn't been manually edited and is currently empty
		if (!sourceOrgNameManuallyEdited && sourceInstanceUrl && !sourceOrgName) {
			const extractedName = extractOrgNameFromUrl(sourceInstanceUrl);
			if (extractedName) {
				sourceOrgName = extractedName;
			}
		}
	});

	// Auto-extract target org name from URL
	$effect(() => {
		// Only auto-fill if the name hasn't been manually edited and is currently empty
		if (!targetOrgNameManuallyEdited && targetInstanceUrl && !targetOrgName) {
			const extractedName = extractOrgNameFromUrl(targetInstanceUrl);
			if (extractedName) {
				targetOrgName = extractedName;
			}
		}
	});

	const sourceIsConnected = $derived(wizardStore.state.sourceOrg.isConnected);
	const sourceIsConnecting = $derived(wizardStore.state.sourceOrg.isConnecting);
	const sourceError = $derived(wizardStore.state.sourceOrg.error);
	const sourceConnectedOrg = $derived(wizardStore.state.sourceOrg.org);

	const targetIsConnected = $derived(wizardStore.state.targetOrg.isConnected);
	const targetIsConnecting = $derived(wizardStore.state.targetOrg.isConnecting);
	const targetError = $derived(wizardStore.state.targetOrg.error);
	const targetConnectedOrg = $derived(wizardStore.state.targetOrg.org);

	// Mock connection function for source org
	async function handleConnectSource() {
		if (!sourceInstanceUrl) {
			wizardStore.setSourceOrgError('Please fill in all required fields');
			return;
		}

		// Use a default name if not provided
		const orgName = sourceOrgName || 'Source Organization';

		wizardStore.setSourceOrgConnecting(true);

		// Simulate API call
		await new Promise(resolve => setTimeout(resolve, 1500));

		try {
			const org: SalesforceOrg = {
				id: `org-${Date.now()}`,
				name: orgName,
				instanceUrl: sourceInstanceUrl,
				orgType: sourceOrgType,
				apiVersion: sourceApiVersion,
				color: sourceColor
			};

			wizardStore.setSourceOrg(org, 'mock-access-token', sourceInstanceUrl);
			// Update the local name if it was empty
			if (!sourceOrgName) {
				sourceOrgName = orgName;
			}
		} catch (err) {
			wizardStore.setSourceOrgError('Failed to connect to Salesforce org');
		}
	}

	// Mock connection function for target org
	async function handleConnectTarget() {
		if (!targetInstanceUrl) {
			wizardStore.setTargetOrgError('Please fill in all required fields');
			return;
		}

		// Use a default name if not provided
		const orgName = targetOrgName || 'Destination Organization';

		wizardStore.setTargetOrgConnecting(true);

		// Simulate API call
		await new Promise(resolve => setTimeout(resolve, 1500));

		try {
			const org: SalesforceOrg = {
				id: `org-${Date.now()}`,
				name: orgName,
				instanceUrl: targetInstanceUrl,
				orgType: targetOrgType,
				apiVersion: targetApiVersion,
				color: targetColor
			};

			wizardStore.setTargetOrg(org, 'mock-access-token', targetInstanceUrl);
			// Update the local name if it was empty
			if (!targetOrgName) {
				targetOrgName = orgName;
			}
		} catch (err) {
			wizardStore.setTargetOrgError('Failed to connect to Salesforce org');
		}
	}

	function handleDisconnectSource() {
		wizardStore.setSourceOrgConnecting(false);
		wizardStore.state.sourceOrg = {
			org: null,
			isConnected: false,
			isConnecting: false,
			error: null
		};
		sourceOrgName = '';
		sourceInstanceUrl = '';
		sourceOrgType = 'production';
		sourceApiVersion = '60.0';
		sourceColor = '#3b82f6'; // Default blue
		sourceOrgNameManuallyEdited = false; // Reset manual edit flag
	}

	function handleDisconnectTarget() {
		wizardStore.setTargetOrgConnecting(false);
		wizardStore.state.targetOrg = {
			org: null,
			isConnected: false,
			isConnecting: false,
			error: null
		};
		targetOrgName = '';
		targetInstanceUrl = '';
		targetOrgType = 'sandbox';
		targetApiVersion = '60.0';
		targetColor = '#10b981'; // Default green
		targetOrgNameManuallyEdited = false; // Reset manual edit flag
	}
</script>

<div class="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-6 items-center">
	<!-- Source Organization -->
	<Card.Root class="shadow-none">
		<Card.Header>
			<div class="flex items-center justify-between">
				<div class="flex-1">
					{#if sourceIsConnected && sourceConnectedOrg}
						<Card.Title>{sourceConnectedOrg.name}</Card.Title>
						<Card.Description>Source</Card.Description>
					{:else if sourceOrgName}
						{#if sourceNameEditing}
							<Input
								bind:value={sourceOrgName}
								placeholder="Enter organization name"
								class="text-lg font-semibold h-auto px-0 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
								oninput={() => {
									// Mark as manually edited when user types
									sourceOrgNameManuallyEdited = true;
								}}
								onkeydown={(e) => {
									if (e.key === 'Enter') {
										sourceNameEditing = false;
									}
								}}
								onblur={() => sourceNameEditing = false}
								autofocus
							/>
						{:else}
							<button
								onclick={() => sourceNameEditing = true}
								class="text-lg font-semibold text-left hover:text-muted-foreground transition-colors"
							>
								{sourceOrgName}
							</button>
							<Card.Description>Source</Card.Description>
						{/if}
					{:else}
						<Card.Description>Source</Card.Description>
					{/if}
				</div>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Button {...props} variant="ghost" size="icon" class="h-8 w-8">
								<MoreVertical class="h-4 w-4" />
								<span class="sr-only">Open menu</span>
							</Button>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="end" class="w-56">
						<DropdownMenu.Label>Advanced Options</DropdownMenu.Label>
						<DropdownMenu.Separator />

						<!-- API Version -->
						<div class="px-2 py-2">
							<Label for="source-api-version-menu" class="text-xs text-muted-foreground">API Version</Label>
							<Input
								id="source-api-version-menu"
								bind:value={sourceApiVersion}
								placeholder="60.0"
								disabled={sourceIsConnecting}
								class="mt-1.5 h-8"
							/>
						</div>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</div>
		</Card.Header>
		<Card.Content>
			{#if sourceIsConnected && sourceConnectedOrg}
				<!-- Connected State -->
				<Alert.Root class="border-green-200 bg-green-50 mb-4">
					<CheckCircle2 class="h-4 w-4 text-green-600" />
					<Alert.Title class="text-green-900">Connected Successfully</Alert.Title>
					<Alert.Description class="text-green-800">
						You are connected to <strong>{sourceConnectedOrg.name}</strong>
					</Alert.Description>
				</Alert.Root>

				<div class="rounded-lg border p-4 space-y-3">
					<div class="flex items-center justify-between">
						<h3 class="font-semibold">Source Org Details</h3>
						<Badge variant="outline">{sourceConnectedOrg.orgType}</Badge>
					</div>
					<div class="grid grid-cols-2 gap-4 text-sm">
						<div>
							<p class="text-muted-foreground">Org Name</p>
							<p class="font-medium">{sourceConnectedOrg.name}</p>
						</div>
						<div>
							<p class="text-muted-foreground">Instance URL</p>
							<p class="font-medium truncate">{sourceConnectedOrg.instanceUrl}</p>
						</div>
						<div>
							<p class="text-muted-foreground">Org Type</p>
							<p class="font-medium capitalize">{sourceConnectedOrg.orgType}</p>
						</div>
						<div>
							<p class="text-muted-foreground">API Version</p>
							<p class="font-medium">{sourceConnectedOrg.apiVersion}</p>
						</div>
					</div>
					<div class="pt-2">
						<Button variant="outline" size="sm" onclick={handleDisconnectSource}>
							Disconnect
						</Button>
					</div>
				</div>
			{:else}
				<!-- Connection Form -->
				<div class="space-y-4">
					<div class="space-y-2">
						<Label for="source-instance-url">Instance URL *</Label>
						<Input
							id="source-instance-url"
							bind:value={sourceInstanceUrl}
							placeholder="e.g., https://mycompany.my.salesforce.com"
							disabled={sourceIsConnecting}
						/>
					</div>

					<div class="space-y-2">
						<Label for="source-org-type">Organization Type</Label>
						<Select.Root
							type="single"
							bind:value={sourceOrgType}
							disabled={sourceIsConnecting}
							onValueChange={(v) => {
								if (v) sourceOrgType = v as 'production' | 'sandbox' | 'developer' | 'scratch';
							}}
						>
							<Select.Trigger id="source-org-type" class="w-full">
								{sourceOrgType ? sourceOrgType.charAt(0).toUpperCase() + sourceOrgType.slice(1) : 'Select org type'}
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="production">Production</Select.Item>
								<Select.Item value="sandbox">Sandbox</Select.Item>
								<Select.Item value="developer">Developer</Select.Item>
								<Select.Item value="scratch">Scratch Org</Select.Item>
							</Select.Content>
						</Select.Root>
					</div>

					<div class="space-y-2">
						<Label for="source-color">Organization Color</Label>
						<input
							id="source-color"
							type="color"
							value={sourceColor || '#3b82f6'}
							oninput={(e) => {
								const target = e.target as HTMLInputElement;
								sourceColor = target.value;
							}}
							disabled={sourceIsConnecting}
							class="w-8 h-8 rounded-full cursor-pointer border-0 p-0 overflow-hidden"
							style="appearance: none; -webkit-appearance: none; -moz-appearance: none;"
						/>
					</div>

					{#if sourceError}
						<Alert.Root variant="destructive">
							<AlertCircle class="h-4 w-4" />
							<Alert.Title>Connection Failed</Alert.Title>
							<Alert.Description>{sourceError}</Alert.Description>
						</Alert.Root>
					{/if}

					<Button
						onclick={handleConnectSource}
						disabled={sourceIsConnecting || !sourceInstanceUrl}
						class="w-full"
					>
						{#if sourceIsConnecting}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
							Connecting...
						{:else}
							Connect Source Org
						{/if}
					</Button>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Arrow Separator -->
	<div class="hidden lg:flex items-center justify-center">
		<div class="flex items-center justify-center w-12 h-12 rounded-full bg-muted text-muted-foreground">
			<ArrowRight class="h-6 w-6" />
		</div>
	</div>

	<!-- Destination Organization -->
	<Card.Root class="shadow-none">
		<Card.Header>
			<div class="flex items-center justify-between">
				<div class="flex-1">
					{#if targetIsConnected && targetConnectedOrg}
						<Card.Title>{targetConnectedOrg.name}</Card.Title>
						<Card.Description>Destination</Card.Description>
					{:else if targetOrgName}
						{#if targetNameEditing}
							<Input
								bind:value={targetOrgName}
								placeholder="Enter organization name"
								class="text-lg font-semibold h-auto px-0 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
								oninput={() => {
									// Mark as manually edited when user types
									targetOrgNameManuallyEdited = true;
								}}
								onkeydown={(e) => {
									if (e.key === 'Enter') {
										targetNameEditing = false;
									}
								}}
								onblur={() => targetNameEditing = false}
								autofocus
							/>
						{:else}
							<button
								onclick={() => targetNameEditing = true}
								class="text-lg font-semibold text-left hover:text-muted-foreground transition-colors"
							>
								{targetOrgName}
							</button>
							<Card.Description>Destination</Card.Description>
						{/if}
					{:else}
						<Card.Description>Destination</Card.Description>
					{/if}
				</div>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Button {...props} variant="ghost" size="icon" class="h-8 w-8">
								<MoreVertical class="h-4 w-4" />
								<span class="sr-only">Open menu</span>
							</Button>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="end" class="w-56">
						<DropdownMenu.Label>Advanced Options</DropdownMenu.Label>
						<DropdownMenu.Separator />

						<!-- API Version -->
						<div class="px-2 py-2">
							<Label for="target-api-version-menu" class="text-xs text-muted-foreground">API Version</Label>
							<Input
								id="target-api-version-menu"
								bind:value={targetApiVersion}
								placeholder="60.0"
								disabled={targetIsConnecting}
								class="mt-1.5 h-8"
							/>
						</div>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</div>
		</Card.Header>
		<Card.Content>
			{#if targetIsConnected && targetConnectedOrg}
				<!-- Connected State -->
				<Alert.Root class="border-green-200 bg-green-50 mb-4">
					<CheckCircle2 class="h-4 w-4 text-green-600" />
					<Alert.Title class="text-green-900">Connected Successfully</Alert.Title>
					<Alert.Description class="text-green-800">
						You are connected to <strong>{targetConnectedOrg.name}</strong>
					</Alert.Description>
				</Alert.Root>

				<div class="rounded-lg border p-4 space-y-3">
					<div class="flex items-center justify-between">
						<h3 class="font-semibold">Destination Org Details</h3>
						<Badge variant="outline">{targetConnectedOrg.orgType}</Badge>
					</div>
					<div class="grid grid-cols-2 gap-4 text-sm">
						<div>
							<p class="text-muted-foreground">Org Name</p>
							<p class="font-medium">{targetConnectedOrg.name}</p>
						</div>
						<div>
							<p class="text-muted-foreground">Instance URL</p>
							<p class="font-medium truncate">{targetConnectedOrg.instanceUrl}</p>
						</div>
						<div>
							<p class="text-muted-foreground">Org Type</p>
							<p class="font-medium capitalize">{targetConnectedOrg.orgType}</p>
						</div>
						<div>
							<p class="text-muted-foreground">API Version</p>
							<p class="font-medium">{targetConnectedOrg.apiVersion}</p>
						</div>
					</div>
					<div class="pt-2">
						<Button variant="outline" size="sm" onclick={handleDisconnectTarget}>
							Disconnect
						</Button>
					</div>
				</div>
			{:else}
				<!-- Connection Form -->
				<div class="space-y-4">
					<div class="space-y-2">
						<Label for="target-instance-url">Instance URL *</Label>
						<Input
							id="target-instance-url"
							bind:value={targetInstanceUrl}
							placeholder="e.g., https://mycompany--uat.sandbox.my.salesforce.com"
							disabled={targetIsConnecting}
						/>
					</div>

					<div class="space-y-2">
						<Label for="target-org-type">Organization Type</Label>
						<Select.Root
							type="single"
							bind:value={targetOrgType}
							disabled={targetIsConnecting}
							onValueChange={(v) => {
								if (v) targetOrgType = v as 'production' | 'sandbox' | 'developer' | 'scratch';
							}}
						>
							<Select.Trigger id="target-org-type" class="w-full">
								{targetOrgType ? targetOrgType.charAt(0).toUpperCase() + targetOrgType.slice(1) : 'Select org type'}
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="production">Production</Select.Item>
								<Select.Item value="sandbox">Sandbox</Select.Item>
								<Select.Item value="developer">Developer</Select.Item>
								<Select.Item value="scratch">Scratch Org</Select.Item>
							</Select.Content>
						</Select.Root>
					</div>

					<div class="space-y-2">
						<Label for="target-color">Organization Color</Label>
						<input
							id="target-color"
							type="color"
							value={targetColor || '#10b981'}
							oninput={(e) => {
								const target = e.target as HTMLInputElement;
								targetColor = target.value;
							}}
							disabled={targetIsConnecting}
							class="w-8 h-8 rounded-full cursor-pointer border-0 p-0 overflow-hidden"
							style="appearance: none; -webkit-appearance: none; -moz-appearance: none;"
						/>
					</div>

					{#if targetError}
						<Alert.Root variant="destructive">
							<AlertCircle class="h-4 w-4" />
							<Alert.Title>Connection Failed</Alert.Title>
							<Alert.Description>{targetError}</Alert.Description>
						</Alert.Root>
					{/if}

					<Button
						onclick={handleConnectTarget}
						disabled={targetIsConnecting || !targetInstanceUrl}
						class="w-full"
					>
						{#if targetIsConnecting}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
							Connecting...
						{:else}
							Connect Destination Org
						{/if}
					</Button>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
</div>

<style>
	input[type="color"] {
		-webkit-appearance: none;
		-moz-appearance: none;
		appearance: none;
		background-color: transparent;
	}

	input[type="color"]::-webkit-color-swatch-wrapper {
		padding: 0;
		border-radius: 9999px;
		overflow: hidden;
	}

	input[type="color"]::-webkit-color-swatch {
		border: none;
		border-radius: 9999px;
	}

	input[type="color"]::-moz-color-swatch {
		border: none;
		border-radius: 9999px;
	}
</style>

