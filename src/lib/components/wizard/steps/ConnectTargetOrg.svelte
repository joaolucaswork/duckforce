<script lang="ts">
	import { wizardStore } from '$lib/stores/wizard.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import * as Alert from '$lib/components/ui/alert';
	import { Badge } from '$lib/components/ui/badge';
	import { CheckCircle2, AlertCircle, Loader2 } from '@lucide/svelte';
	import type { SalesforceOrg } from '$lib/types/salesforce';

	let orgName = $state('');
	let instanceUrl = $state('');
	let orgType = $state<'production' | 'sandbox' | 'developer' | 'scratch'>('sandbox');
	let apiVersion = $state('60.0');

	const isConnected = $derived(wizardStore.state.targetOrg.isConnected);
	const isConnecting = $derived(wizardStore.state.targetOrg.isConnecting);
	const error = $derived(wizardStore.state.targetOrg.error);
	const connectedOrg = $derived(wizardStore.state.targetOrg.org);

	// Mock connection function
	async function handleConnect() {
		if (!orgName || !instanceUrl) {
			wizardStore.setTargetOrgError('Please fill in all required fields');
			return;
		}

		wizardStore.setTargetOrgConnecting(true);

		// Simulate API call
		await new Promise(resolve => setTimeout(resolve, 1500));

		try {
			const org: SalesforceOrg = {
				id: `org-${Date.now()}`,
				name: orgName,
				instanceUrl: instanceUrl,
				orgType: orgType,
				apiVersion: apiVersion
			};

			wizardStore.setTargetOrg(org, 'mock-access-token', instanceUrl);
		} catch (err) {
			wizardStore.setTargetOrgError('Failed to connect to Salesforce org');
		}
	}

	function handleDisconnect() {
		wizardStore.setTargetOrgConnecting(false);
		wizardStore.state.targetOrg = {
			org: null,
			isConnected: false,
			isConnecting: false,
			error: null
		};
		orgName = '';
		instanceUrl = '';
		orgType = 'sandbox';
		apiVersion = '60.0';
	}
</script>

<div class="space-y-6">
	{#if isConnected && connectedOrg}
		<!-- Connected State -->
		<Alert.Root class="border-green-200 bg-green-50">
			<CheckCircle2 class="h-4 w-4 text-green-600" />
			<Alert.Title class="text-green-900">Connected Successfully</Alert.Title>
			<Alert.Description class="text-green-800">
				You are connected to <strong>{connectedOrg.name}</strong>
			</Alert.Description>
		</Alert.Root>

		<div class="rounded-lg border p-4 space-y-3">
			<div class="flex items-center justify-between">
				<h3 class="font-semibold">Target Org Details</h3>
				<Badge variant="outline">{connectedOrg.orgType}</Badge>
			</div>
			<div class="grid grid-cols-2 gap-4 text-sm">
				<div>
					<p class="text-muted-foreground">Org Name</p>
					<p class="font-medium">{connectedOrg.name}</p>
				</div>
				<div>
					<p class="text-muted-foreground">Instance URL</p>
					<p class="font-medium truncate">{connectedOrg.instanceUrl}</p>
				</div>
				<div>
					<p class="text-muted-foreground">Org Type</p>
					<p class="font-medium capitalize">{connectedOrg.orgType}</p>
				</div>
				<div>
					<p class="text-muted-foreground">API Version</p>
					<p class="font-medium">{connectedOrg.apiVersion}</p>
				</div>
			</div>
			<div class="pt-2">
				<Button variant="outline" size="sm" onclick={handleDisconnect}>
					Disconnect
				</Button>
			</div>
		</div>
	{:else}
		<!-- Connection Form -->
		<div class="space-y-4">
			<div class="space-y-2">
				<Label for="org-name">Organization Name *</Label>
				<Input
					id="org-name"
					bind:value={orgName}
					placeholder="e.g., UAT Sandbox"
					disabled={isConnecting}
				/>
			</div>

			<div class="space-y-2">
				<Label for="instance-url">Instance URL *</Label>
				<Input
					id="instance-url"
					bind:value={instanceUrl}
					placeholder="e.g., https://mycompany--uat.sandbox.my.salesforce.com"
					disabled={isConnecting}
				/>
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2">
					<Label for="org-type">Org Type</Label>
					<Select.Root
						selected={{ value: orgType, label: orgType.charAt(0).toUpperCase() + orgType.slice(1) }}
						onSelectedChange={(v) => v && (orgType = v.value as any)}
					>
						<Select.Trigger id="org-type" disabled={isConnecting}>
							{orgType.charAt(0).toUpperCase() + orgType.slice(1)}
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
					<Label for="api-version">API Version</Label>
					<Input
						id="api-version"
						bind:value={apiVersion}
						placeholder="60.0"
						disabled={isConnecting}
					/>
				</div>
			</div>

			{#if error}
				<Alert.Root variant="destructive">
					<AlertCircle class="h-4 w-4" />
					<Alert.Title>Connection Failed</Alert.Title>
					<Alert.Description>{error}</Alert.Description>
				</Alert.Root>
			{/if}

			<div class="pt-4">
				<Button
					onclick={handleConnect}
					disabled={isConnecting || !orgName || !instanceUrl}
					class="w-full"
				>
					{#if isConnecting}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						Connecting...
					{:else}
						Connect to Salesforce
					{/if}
				</Button>
			</div>

			<div class="text-sm text-muted-foreground">
				<p>
					<strong>Note:</strong> This is typically a sandbox or developer org where you want to
					deploy your components.
				</p>
			</div>
		</div>
	{/if}
</div>

