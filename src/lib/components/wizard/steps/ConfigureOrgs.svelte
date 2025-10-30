<script lang="ts">
	import { wizardStore } from '$lib/stores/wizard.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Alert from '$lib/components/ui/alert';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { CheckCircle2, AlertCircle, Loader2, MoreVertical } from '@lucide/svelte';
	import type { SalesforceOrg } from '$lib/types/salesforce';

	// Source Org State
	let sourceOrgName = $state('');
	let sourceInstanceUrl = $state('');
	let sourceOrgType = $state<'production' | 'sandbox' | 'developer' | 'scratch'>('production');
	let sourceApiVersion = $state('60.0');
	let sourceColor = $state('#3b82f6'); // Default blue

	// Target Org State
	let targetOrgName = $state('');
	let targetInstanceUrl = $state('');
	let targetOrgType = $state<'production' | 'sandbox' | 'developer' | 'scratch'>('sandbox');
	let targetApiVersion = $state('60.0');
	let targetColor = $state('#10b981'); // Default green

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
		if (!sourceOrgName || !sourceInstanceUrl) {
			wizardStore.setSourceOrgError('Please fill in all required fields');
			return;
		}

		wizardStore.setSourceOrgConnecting(true);

		// Simulate API call
		await new Promise(resolve => setTimeout(resolve, 1500));

		try {
			const org: SalesforceOrg = {
				id: `org-${Date.now()}`,
				name: sourceOrgName,
				instanceUrl: sourceInstanceUrl,
				orgType: sourceOrgType,
				apiVersion: sourceApiVersion,
				color: sourceColor
			};

			wizardStore.setSourceOrg(org, 'mock-access-token', sourceInstanceUrl);
		} catch (err) {
			wizardStore.setSourceOrgError('Failed to connect to Salesforce org');
		}
	}

	// Mock connection function for target org
	async function handleConnectTarget() {
		if (!targetOrgName || !targetInstanceUrl) {
			wizardStore.setTargetOrgError('Please fill in all required fields');
			return;
		}

		wizardStore.setTargetOrgConnecting(true);

		// Simulate API call
		await new Promise(resolve => setTimeout(resolve, 1500));

		try {
			const org: SalesforceOrg = {
				id: `org-${Date.now()}`,
				name: targetOrgName,
				instanceUrl: targetInstanceUrl,
				orgType: targetOrgType,
				apiVersion: targetApiVersion,
				color: targetColor
			};

			wizardStore.setTargetOrg(org, 'mock-access-token', targetInstanceUrl);
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
		sourceColor = '#3b82f6';
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
		targetColor = '#10b981';
	}
</script>

<div class="space-y-6">
	<!-- Source Organization -->
	<Card.Root>
		<Card.Header>
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="w-4 h-4 rounded-full" style="background-color: {sourceColor}"></div>
					<div>
						<Card.Title>Source Organization</Card.Title>
						<Card.Description>The Salesforce org you want to migrate from</Card.Description>
					</div>
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

						<!-- Org Type Selection -->
						<div class="px-2 py-2">
							<Label class="text-xs text-muted-foreground">Org Type</Label>
						</div>
						<DropdownMenu.RadioGroup bind:value={sourceOrgType}>
							<DropdownMenu.RadioItem value="production" disabled={sourceIsConnecting}>
								Production
							</DropdownMenu.RadioItem>
							<DropdownMenu.RadioItem value="sandbox" disabled={sourceIsConnecting}>
								Sandbox
							</DropdownMenu.RadioItem>
							<DropdownMenu.RadioItem value="developer" disabled={sourceIsConnecting}>
								Developer
							</DropdownMenu.RadioItem>
							<DropdownMenu.RadioItem value="scratch" disabled={sourceIsConnecting}>
								Scratch Org
							</DropdownMenu.RadioItem>
						</DropdownMenu.RadioGroup>

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
						<Label for="source-org-name">Organization Name *</Label>
						<Input
							id="source-org-name"
							bind:value={sourceOrgName}
							placeholder="e.g., Production Org"
							disabled={sourceIsConnecting}
						/>
					</div>

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
						<Label for="source-color">Organization Color</Label>
						<div class="flex items-center gap-3">
							<Input
								id="source-color"
								type="color"
								bind:value={sourceColor}
								disabled={sourceIsConnecting}
								class="w-20 h-9 cursor-pointer"
							/>
							<span class="text-sm text-muted-foreground">{sourceColor}</span>
						</div>
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
						disabled={sourceIsConnecting || !sourceOrgName || !sourceInstanceUrl}
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

	<!-- Target Organization -->
	<Card.Root>
		<Card.Header>
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="w-4 h-4 rounded-full" style="background-color: {targetColor}"></div>
					<div>
						<Card.Title>Destination Organization</Card.Title>
						<Card.Description>The Salesforce org you want to migrate to</Card.Description>
					</div>
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

						<!-- Org Type Selection -->
						<div class="px-2 py-2">
							<Label class="text-xs text-muted-foreground">Org Type</Label>
						</div>
						<DropdownMenu.RadioGroup bind:value={targetOrgType}>
							<DropdownMenu.RadioItem value="production" disabled={targetIsConnecting}>
								Production
							</DropdownMenu.RadioItem>
							<DropdownMenu.RadioItem value="sandbox" disabled={targetIsConnecting}>
								Sandbox
							</DropdownMenu.RadioItem>
							<DropdownMenu.RadioItem value="developer" disabled={targetIsConnecting}>
								Developer
							</DropdownMenu.RadioItem>
							<DropdownMenu.RadioItem value="scratch" disabled={targetIsConnecting}>
								Scratch Org
							</DropdownMenu.RadioItem>
						</DropdownMenu.RadioGroup>

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
						<Label for="target-org-name">Organization Name *</Label>
						<Input
							id="target-org-name"
							bind:value={targetOrgName}
							placeholder="e.g., UAT Sandbox"
							disabled={targetIsConnecting}
						/>
					</div>

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
						<Label for="target-color">Organization Color</Label>
						<div class="flex items-center gap-3">
							<Input
								id="target-color"
								type="color"
								bind:value={targetColor}
								disabled={targetIsConnecting}
								class="w-20 h-9 cursor-pointer"
							/>
							<span class="text-sm text-muted-foreground">{targetColor}</span>
						</div>
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
						disabled={targetIsConnecting || !targetOrgName || !targetInstanceUrl}
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

