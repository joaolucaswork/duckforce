<script lang="ts">
	import { wizardStore } from '$lib/stores/wizard.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Alert from '$lib/components/ui/alert';
	import * as Card from '$lib/components/ui/card';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Select from '$lib/components/ui/select';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import * as Tabs from '$lib/components/ui/tabs';
	import {
		AlertCircle,
		Loader2,
		MoreVertical,
		Info,
		Building2,
		Cloud,
		Database,
		Rocket,
		Zap,
		Star,
		Heart,
		Briefcase,
		Globe,
		Shield,
		Target,
		TrendingUp,
		ChevronRight,
		ChevronLeft,
		Pencil
	} from '@lucide/svelte';
	import type { SalesforceOrg } from '$lib/types/salesforce';
	import type { Component } from 'svelte';
	import duckforceArrow from '$lib/assets/duckforce-arrow.png';
	import { onMount } from 'svelte';

	// Preset Color Palette - Professional, muted tones with better contrast
	const COLOR_PALETTE = [
		{ name: 'Blue', value: '#2563eb' },      // Tailwind blue-600 (darker)
		{ name: 'Emerald', value: '#059669' },   // Tailwind emerald-600 (darker)
		{ name: 'Violet', value: '#7c3aed' },    // Tailwind violet-600 (darker)
		{ name: 'Amber', value: '#d97706' },     // Tailwind amber-600 (darker)
		{ name: 'Rose', value: '#e11d48' },      // Tailwind rose-600 (darker)
		{ name: 'Cyan', value: '#0891b2' }       // Tailwind cyan-600 (darker)
	];

	// Curated icon palette for organizations
	const ICON_PALETTE: Array<{ name: string; component: Component }> = [
		{ name: 'building-2', component: Building2 },
		{ name: 'cloud', component: Cloud },
		{ name: 'database', component: Database },
		{ name: 'rocket', component: Rocket },
		{ name: 'zap', component: Zap },
		{ name: 'star', component: Star },
		{ name: 'heart', component: Heart },
		{ name: 'briefcase', component: Briefcase },
		{ name: 'globe', component: Globe },
		{ name: 'shield', component: Shield },
		{ name: 'target', component: Target },
		{ name: 'trending-up', component: TrendingUp }
	];

	// Source Org State
	let sourceOrgName = $state('');
	let sourceInstanceUrl = $state('');
	let sourceOrgType = $state<'production' | 'sandbox' | 'developer' | 'scratch'>('production');
	let sourceApiVersion = $state('60.0');
	let sourceColor = $state('#2563eb'); // Default blue-600
	let sourceIcon = $state('building-2'); // Default icon
	let sourceCustomizationTab = $state('color'); // 'color' or 'icon'
	let sourceNameEditing = $state(false);
	let sourceOrgNameManuallyEdited = $state(false); // Track if user manually edited the name
	let sourceIconScrollContainer: HTMLDivElement | undefined = $state();
	let sourceShowLeftArrow = $state(false);
	let sourceShowRightArrow = $state(true);

	// Target Org State
	let targetOrgName = $state('');
	let targetInstanceUrl = $state('');
	let targetOrgType = $state<'production' | 'sandbox' | 'developer' | 'scratch'>('sandbox');
	let targetApiVersion = $state('60.0');
	let targetColor = $state('#059669'); // Default emerald-600
	let targetIcon = $state('cloud'); // Default icon
	let targetCustomizationTab = $state('color'); // 'color' or 'icon'
	let targetNameEditing = $state(false);
	let targetOrgNameManuallyEdited = $state(false); // Track if user manually edited the name
	let targetIconScrollContainer: HTMLDivElement | undefined = $state();
	let targetShowLeftArrow = $state(false);
	let targetShowRightArrow = $state(true);

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
		// Only auto-fill if the name hasn't been manually edited
		if (!sourceOrgNameManuallyEdited && sourceInstanceUrl) {
			const extractedName = extractOrgNameFromUrl(sourceInstanceUrl);
			if (extractedName) {
				sourceOrgName = extractedName;
			} else {
				// Clear the name if URL is invalid or empty
				sourceOrgName = '';
			}
		}
	});

	// Auto-extract target org name from URL
	$effect(() => {
		// Only auto-fill if the name hasn't been manually edited
		if (!targetOrgNameManuallyEdited && targetInstanceUrl) {
			const extractedName = extractOrgNameFromUrl(targetInstanceUrl);
			if (extractedName) {
				targetOrgName = extractedName;
			} else {
				// Clear the name if URL is invalid or empty
				targetOrgName = '';
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

	// Helper function to get icon component by name
	function getIconComponent(iconName?: string) {
		if (!iconName) return Building2; // Default icon
		const icon = ICON_PALETTE.find(i => i.name === iconName);
		return icon?.component || Building2;
	}

	// Function to update arrow visibility based on scroll position
	function updateSourceArrowVisibility() {
		if (!sourceIconScrollContainer) return;
		const { scrollLeft, scrollWidth, clientWidth } = sourceIconScrollContainer;
		sourceShowLeftArrow = scrollLeft > 0;
		sourceShowRightArrow = scrollLeft < scrollWidth - clientWidth - 1;
	}

	function updateTargetArrowVisibility() {
		if (!targetIconScrollContainer) return;
		const { scrollLeft, scrollWidth, clientWidth } = targetIconScrollContainer;
		targetShowLeftArrow = scrollLeft > 0;
		targetShowRightArrow = scrollLeft < scrollWidth - clientWidth - 1;
	}

	// Scroll functions
	function scrollSourceLeft() {
		sourceIconScrollContainer?.scrollBy({ left: -200, behavior: 'smooth' });
		setTimeout(updateSourceArrowVisibility, 300);
	}

	function scrollSourceRight() {
		sourceIconScrollContainer?.scrollBy({ left: 200, behavior: 'smooth' });
		setTimeout(updateSourceArrowVisibility, 300);
	}

	function scrollTargetLeft() {
		targetIconScrollContainer?.scrollBy({ left: -200, behavior: 'smooth' });
		setTimeout(updateTargetArrowVisibility, 300);
	}

	function scrollTargetRight() {
		targetIconScrollContainer?.scrollBy({ left: 200, behavior: 'smooth' });
		setTimeout(updateTargetArrowVisibility, 300);
	}

	// Real OAuth connection function for source org
	function handleConnectSource() {
		// Build login URL with customization parameters
		const params = new URLSearchParams({
			org: 'source',
			orgType: sourceOrgType,
			...(sourceOrgName && { orgName: sourceOrgName }),
			color: sourceColor,
			icon: sourceIcon,
			// Add timestamp to prevent browser caching
			t: Date.now().toString()
		});
		window.location.href = `/api/auth/salesforce/login?${params.toString()}`;
	}

	// Real OAuth connection function for target org
	function handleConnectTarget() {
		// Build login URL with customization parameters
		const params = new URLSearchParams({
			org: 'target',
			orgType: targetOrgType,
			...(targetOrgName && { orgName: targetOrgName }),
			color: targetColor,
			icon: targetIcon,
			// Add timestamp to prevent browser caching
			t: Date.now().toString()
		});
		window.location.href = `/api/auth/salesforce/login?${params.toString()}`;
	}

	// Clear temporary OAuth cookies (useful after server restart)
	async function handleClearTempCookies() {
		try {
			const response = await fetch('/api/auth/salesforce/clear-temp', {
				method: 'POST'
			});

			if (!response.ok) {
				throw new Error('Failed to clear cookies');
			}

			console.log('Temporary OAuth cookies cleared successfully');
		} catch (err) {
			console.error('Clear cookies error:', err);
		}
	}

	async function handleDisconnectSource() {
		try {
			// Call logout endpoint
			const response = await fetch('/api/auth/salesforce/logout?org=source', {
				method: 'POST'
			});

			if (!response.ok) {
				throw new Error('Logout failed');
			}

			// Clear local state
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
			sourceColor = '#2563eb'; // Default blue-600
			sourceIcon = 'building-2'; // Default icon
			sourceCustomizationTab = 'color'; // Reset to color tab
			sourceOrgNameManuallyEdited = false; // Reset manual edit flag
		} catch (err) {
			console.error('Disconnect error:', err);
			wizardStore.setSourceOrgError('Failed to disconnect');
		}
	}

	async function handleDisconnectTarget() {
		try {
			// Call logout endpoint
			const response = await fetch('/api/auth/salesforce/logout?org=target', {
				method: 'POST'
			});

			if (!response.ok) {
				throw new Error('Logout failed');
			}

			// Clear local state
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
			targetColor = '#059669'; // Default emerald-600
			targetIcon = 'cloud'; // Default icon
			targetCustomizationTab = 'color'; // Reset to color tab
			targetOrgNameManuallyEdited = false; // Reset manual edit flag
		} catch (err) {
			console.error('Disconnect error:', err);
			wizardStore.setTargetOrgError('Failed to disconnect');
		}
	}

	// Check connection status on mount and handle OAuth callbacks
	onMount(async () => {
		// Handle OAuth callback query parameters
		const urlParams = new URLSearchParams(window.location.search);
		const connectedOrg = urlParams.get('connected');
		const error = urlParams.get('error');

		if (error) {
			// Show error message
			const errorMsg = decodeURIComponent(error);
			// Determine which org failed based on recent activity
			// For now, we'll show a general error
			console.error('OAuth error:', errorMsg);
		}

		if (connectedOrg) {
			// Clear the query parameter from URL
			const url = new URL(window.location.href);
			url.searchParams.delete('connected');
			url.searchParams.delete('error');
			window.history.replaceState({}, '', url.toString());
		}

		// Check current connection status
		try {
			const response = await fetch('/api/auth/salesforce/status');
			if (!response.ok) {
				throw new Error('Failed to fetch status');
			}

			const status = await response.json();

			// Update source org if connected
			if (status.source?.isConnected && status.source.instanceUrl) {
				// Use server-provided metadata if available, otherwise use local state
				const orgName = status.source.orgName || sourceOrgName || extractOrgNameFromUrl(status.source.instanceUrl) || 'Source Organization';
				const orgType = (status.source.orgType as 'production' | 'sandbox' | 'developer' | 'scratch') || sourceOrgType;
				const color = status.source.color || sourceColor;
				const icon = status.source.icon || sourceIcon;

				const org: SalesforceOrg = {
					id: status.source.orgId || `org-source-${Date.now()}`,
					name: orgName,
					instanceUrl: status.source.instanceUrl,
					orgType,
					apiVersion: sourceApiVersion,
					color,
					icon
				};
				// Don't pass tokens to the store - they stay server-side only
				wizardStore.setSourceOrg(org);
				sourceInstanceUrl = status.source.instanceUrl;
				if (!sourceOrgNameManuallyEdited && status.source.orgName) {
					sourceOrgName = status.source.orgName;
				}
				// Update UI state from server metadata
				if (status.source.orgType) sourceOrgType = orgType;
				if (status.source.color) sourceColor = color;
				if (status.source.icon) sourceIcon = icon;
			}

			// Update target org if connected
			if (status.target?.isConnected && status.target.instanceUrl) {
				// Use server-provided metadata if available, otherwise use local state
				const orgName = status.target.orgName || targetOrgName || extractOrgNameFromUrl(status.target.instanceUrl) || 'Target Organization';
				const orgType = (status.target.orgType as 'production' | 'sandbox' | 'developer' | 'scratch') || targetOrgType;
				const color = status.target.color || targetColor;
				const icon = status.target.icon || targetIcon;

				const org: SalesforceOrg = {
					id: status.target.orgId || `org-target-${Date.now()}`,
					name: orgName,
					instanceUrl: status.target.instanceUrl,
					orgType,
					apiVersion: targetApiVersion,
					color,
					icon
				};
				// Don't pass tokens to the store - they stay server-side only
				wizardStore.setTargetOrg(org);
				targetInstanceUrl = status.target.instanceUrl;
				if (!targetOrgNameManuallyEdited && status.target.orgName) {
					targetOrgName = status.target.orgName;
				}
				// Update UI state from server metadata
				if (status.target.orgType) targetOrgType = orgType;
				if (status.target.color) targetColor = color;
				if (status.target.icon) targetIcon = icon;
			}
		} catch (err) {
			console.error('Failed to check connection status:', err);
		}
	});
</script>

<!-- Debug: Clear OAuth cookies button (only in development) -->
{#if import.meta.env.DEV}
	<div class="mb-4">
		<Alert.Root variant="default" class="bg-yellow-50 border-yellow-200">
			<Info class="h-4 w-4 text-yellow-600" />
			<Alert.Title class="text-yellow-800">Modo de Desenvolvimento</Alert.Title>
			<Alert.Description class="text-yellow-700 flex items-center justify-between">
				<span>Se você reiniciou o servidor e está tendo erros de OAuth, clique aqui para limpar cookies temporários:</span>
				<Button onclick={handleClearTempCookies} variant="outline" size="sm" class="ml-4 border-yellow-300 hover:bg-yellow-100">
					Limpar Cookies OAuth
				</Button>
			</Alert.Description>
		</Alert.Root>
	</div>
{/if}

<div class="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-6 items-center">
	<!-- Source Organization -->
	<div class="space-y-0">
		<!-- Source Label Container -->
		{#snippet sourceLabelHeader()}
			{@const SourceIconComponent = getIconComponent(sourceIcon)}
			<div class="bg-card px-6 py-4 border-b-2 rounded-t-xl flex items-center justify-between" style="border-color: {sourceColor};">
				<div class="flex items-center gap-3 flex-1 min-w-0">
					<div class="flex items-center gap-2 flex-shrink-0">
						<div class="flex items-center justify-center w-6 h-6 rounded" style="background-color: {sourceColor};">
							<SourceIconComponent class="w-4 h-4 text-white" />
						</div>
						<p class="text-sm font-medium text-muted-foreground">Source</p>
					</div>

					<!-- Editable Org Name -->
					{#if sourceOrgName}
						<div class="flex-1 min-w-0">
							{#if sourceNameEditing}
								<Input
									bind:value={sourceOrgName}
									placeholder="Enter organization name"
									class="text-sm font-semibold h-auto px-2 py-1 border focus-visible:ring-1"
									oninput={() => {
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
								<Tooltip.Root>
									<Tooltip.Trigger>
										{#snippet child({ props })}
											<button
												{...props}
												onclick={() => sourceNameEditing = true}
												class="group text-sm font-semibold text-left hover:text-muted-foreground transition-colors truncate max-w-full flex items-center gap-1.5"
											>
												<span class="truncate">{sourceOrgName}</span>
												<Pencil class="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
											</button>
										{/snippet}
									</Tooltip.Trigger>
									<Tooltip.Content side="bottom" class="max-w-xs">
										<div class="space-y-1 text-xs">
											<p class="font-medium">Change Organization Name</p>
											<p class="text-muted-foreground">This is just a label for your reference. It won't affect the migration.</p>
										</div>
									</Tooltip.Content>
								</Tooltip.Root>
							{/if}
						</div>
					{/if}
				</div>

				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Button {...props} variant="ghost" size="icon" class="h-8 w-8 flex-shrink-0">
								<MoreVertical class="h-4 w-4" />
								<span class="sr-only">Source options</span>
							</Button>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="end" class="w-56">
						<DropdownMenu.Label>Advanced Options</DropdownMenu.Label>
						<DropdownMenu.Separator />

						<!-- API Version -->
						<div class="px-2 py-2">
							<Label for="source-api-version-header" class="text-xs text-muted-foreground">API Version</Label>
							<Input
								id="source-api-version-header"
								bind:value={sourceApiVersion}
								placeholder="60.0"
								disabled={sourceIsConnecting}
								class="mt-1.5 h-8"
							/>
						</div>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</div>
		{/snippet}
		{@render sourceLabelHeader()}
		<Card.Root class="shadow-none rounded-t-none border-t-0">
		<Card.Content>
			{#if sourceIsConnected && sourceConnectedOrg}
				<!-- Connected State -->
				<div class="space-y-6">
					<!-- Header Section with Org Info (integrated with card) -->
					{#snippet sourceOrgHeader()}
						<div
							class="-mx-6 -mt-6 px-6 py-5 flex items-start justify-between text-white"
							style="background-color: {sourceColor};"
						>
							<div class="flex-1 flex items-start gap-3">
								<div class="flex-1 space-y-1">
									<!-- Org Name -->
									<h2 class="text-xl font-semibold tracking-tight">
										{sourceConnectedOrg.name}
									</h2>
									<!-- Org Type -->
									<p class="text-sm opacity-90 capitalize">
										{sourceConnectedOrg.orgType}
									</p>
								</div>
							</div>

							<!-- Actions -->
							<div class="flex items-center gap-1">
								<!-- Info Icon with Tooltip -->
								<Tooltip.Root>
									<Tooltip.Trigger>
										<div class="p-1.5 hover:bg-white/10 rounded-md transition-colors">
											<Info class="h-4 w-4 opacity-90" />
										</div>
									</Tooltip.Trigger>
									<Tooltip.Content side="left" class="max-w-xs">
										<div class="space-y-2 text-xs">
											<div><strong>Instance URL:</strong><br/>{sourceConnectedOrg.instanceUrl}</div>
											<div><strong>API Version:</strong> {sourceConnectedOrg.apiVersion}</div>
										</div>
									</Tooltip.Content>
								</Tooltip.Root>

								<!-- More Options Menu -->
								<DropdownMenu.Root>
									<DropdownMenu.Trigger>
										{#snippet child({ props })}
											<Button {...props} variant="ghost" size="icon" class="h-8 w-8 text-white hover:bg-white/10">
												<MoreVertical class="h-4 w-4" />
												<span class="sr-only">More options</span>
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
												class="mt-1.5 h-8"
											/>
										</div>

										<DropdownMenu.Separator />
										<DropdownMenu.Item class="text-destructive" onclick={handleDisconnectSource}>
											Disconnect
										</DropdownMenu.Item>
									</DropdownMenu.Content>
								</DropdownMenu.Root>
							</div>
						</div>
					{/snippet}

					{@render sourceOrgHeader()}

					<!-- Action Buttons -->
					<div class="flex gap-3">
						<Button variant="secondary" class="flex-1">
							View Details
						</Button>
						<Button variant="outline" onclick={handleDisconnectSource}>
							Disconnect
						</Button>
					</div>
				</div>
			{:else}
				<!-- Connection Form -->
				<div class="space-y-6">
					<div class="space-y-3">
						<Label for="source-instance-url">Instance URL *</Label>
						<Input
							id="source-instance-url"
							bind:value={sourceInstanceUrl}
							placeholder="e.g., https://mycompany.my.salesforce.com"
							disabled={sourceIsConnecting}
						/>
					</div>

					<div class="space-y-3">
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

					<!-- Customization Tabs -->
					<div class="space-y-3">
						<Label class="sr-only">Organization Appearance</Label>
						<Tabs.Root bind:value={sourceCustomizationTab}>
							<Tabs.List class="grid w-full grid-cols-2">
								<Tabs.Trigger value="color">Color</Tabs.Trigger>
								<Tabs.Trigger value="icon">Icon</Tabs.Trigger>
							</Tabs.List>

							<div class="mt-4 w-fit">
								<Tabs.Content value="color">
									<div class="flex gap-2">
										{#each COLOR_PALETTE as color}
											<button
												type="button"
												onclick={() => sourceColor = color.value}
												disabled={sourceIsConnecting}
												class="w-12 h-12 rounded-md border-2 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
												class:border-foreground={sourceColor === color.value}
												class:border-transparent={sourceColor !== color.value}
												style="background-color: {color.value};"
												title={color.name}
											>
												<span class="sr-only">{color.name}</span>
											</button>
										{/each}
									</div>
								</Tabs.Content>

								<Tabs.Content value="icon">
									<div class="relative w-fit">
										<div
											class="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth max-w-[320px]"
											bind:this={sourceIconScrollContainer}
											onscroll={updateSourceArrowVisibility}
										>
											{#each ICON_PALETTE as icon}
												{@const IconComponent = icon.component}
												<button
													type="button"
													onclick={() => sourceIcon = icon.name}
													disabled={sourceIsConnecting}
													class="w-12 h-12 rounded-lg border-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0"
													class:border-foreground={sourceIcon === icon.name}
													class:border-transparent={sourceIcon !== icon.name}
													class:bg-muted={sourceIcon === icon.name}
													title={icon.name}
												>
													<IconComponent class="h-5 w-5" />
													<span class="sr-only">{icon.name}</span>
												</button>
											{/each}
										</div>
										{#if sourceShowLeftArrow}
											<button
												type="button"
												onclick={scrollSourceLeft}
												class="absolute left-0 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm border rounded-full p-1 hover:bg-muted transition-colors"
												title="Scroll left"
											>
												<ChevronLeft class="h-4 w-4" />
											</button>
										{/if}
										{#if sourceShowRightArrow}
											<button
												type="button"
												onclick={scrollSourceRight}
												class="absolute right-0 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm border rounded-full p-1 hover:bg-muted transition-colors"
												title="Scroll right"
											>
												<ChevronRight class="h-4 w-4" />
											</button>
										{/if}
									</div>
								</Tabs.Content>
							</div>
						</Tabs.Root>
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
	</div>

	<!-- Arrow Separator -->
	<div class="hidden lg:flex items-center justify-center">
		<Tooltip.Root>
			<Tooltip.Trigger asChild>
				{#snippet child({ props })}
					<div {...props} class="flex items-center justify-center w-16 h-16 cursor-help">
						<img src={duckforceArrow} alt="Data flow arrow" class="w-full h-full object-contain" />
					</div>
				{/snippet}
			</Tooltip.Trigger>
			<Tooltip.Content>
				<div class="text-center space-y-1">
					<p class="font-semibold">Quack! 🦆</p>
					<p class="text-xs">Source org (left) → Target org (right)</p>
				</div>
			</Tooltip.Content>
		</Tooltip.Root>
	</div>

	<!-- Destination Organization -->
	<div class="space-y-0">
		<!-- Destination Label Container -->
		{#snippet targetLabelHeader()}
			{@const TargetIconComponent = getIconComponent(targetIcon)}
			<div class="bg-card px-6 py-4 border-b-2 rounded-t-xl flex items-center justify-between" style="border-color: {targetColor};">
				<div class="flex items-center gap-3 flex-1 min-w-0">
					<div class="flex items-center gap-2 flex-shrink-0">
						<div class="flex items-center justify-center w-6 h-6 rounded" style="background-color: {targetColor};">
							<TargetIconComponent class="w-4 h-4 text-white" />
						</div>
						<p class="text-sm font-medium text-muted-foreground">Destination</p>
					</div>

					<!-- Editable Org Name -->
					{#if targetOrgName}
						<div class="flex-1 min-w-0">
							{#if targetNameEditing}
								<Input
									bind:value={targetOrgName}
									placeholder="Enter organization name"
									class="text-sm font-semibold h-auto px-2 py-1 border focus-visible:ring-1"
									oninput={() => {
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
								<Tooltip.Root>
									<Tooltip.Trigger>
										{#snippet child({ props })}
											<button
												{...props}
												onclick={() => targetNameEditing = true}
												class="group text-sm font-semibold text-left hover:text-muted-foreground transition-colors truncate max-w-full flex items-center gap-1.5"
											>
												<span class="truncate">{targetOrgName}</span>
												<Pencil class="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
											</button>
										{/snippet}
									</Tooltip.Trigger>
									<Tooltip.Content side="bottom" class="max-w-xs">
										<div class="space-y-1 text-xs">
											<p class="font-medium">Change Organization Name</p>
											<p class="text-muted-foreground">This is just a label for your reference. It won't affect the migration.</p>
										</div>
									</Tooltip.Content>
								</Tooltip.Root>
							{/if}
						</div>
					{/if}
				</div>

				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Button {...props} variant="ghost" size="icon" class="h-8 w-8 flex-shrink-0">
								<MoreVertical class="h-4 w-4" />
								<span class="sr-only">Destination options</span>
							</Button>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="end" class="w-56">
						<DropdownMenu.Label>Advanced Options</DropdownMenu.Label>
						<DropdownMenu.Separator />

						<!-- API Version -->
						<div class="px-2 py-2">
							<Label for="target-api-version-header" class="text-xs text-muted-foreground">API Version</Label>
							<Input
								id="target-api-version-header"
								bind:value={targetApiVersion}
								placeholder="60.0"
								disabled={targetIsConnecting}
								class="mt-1.5 h-8"
							/>
						</div>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</div>
		{/snippet}
		{@render targetLabelHeader()}
		<Card.Root class="shadow-none rounded-t-none border-t-0">
		<Card.Content>
			{#if targetIsConnected && targetConnectedOrg}
				<!-- Connected State -->
				<div class="space-y-6">
					<!-- Header Section with Org Info (integrated with card) -->
					{#snippet targetOrgHeader()}
						<div
							class="-mx-6 -mt-6 px-6 py-5 flex items-start justify-between text-white"
							style="background-color: {targetColor};"
						>
							<div class="flex-1 flex items-start gap-3">
								<div class="flex-1 space-y-1">
									<!-- Org Name -->
									<h2 class="text-xl font-semibold tracking-tight">
										{targetConnectedOrg.name}
									</h2>
									<!-- Org Type -->
									<p class="text-sm opacity-90 capitalize">
										{targetConnectedOrg.orgType}
									</p>
								</div>
							</div>

							<!-- Actions -->
							<div class="flex items-center gap-1">
								<!-- Info Icon with Tooltip -->
								<Tooltip.Root>
									<Tooltip.Trigger>
										<div class="p-1.5 hover:bg-white/10 rounded-md transition-colors">
											<Info class="h-4 w-4 opacity-90" />
										</div>
									</Tooltip.Trigger>
									<Tooltip.Content side="left" class="max-w-xs">
										<div class="space-y-2 text-xs">
											<div><strong>Instance URL:</strong><br/>{targetConnectedOrg.instanceUrl}</div>
											<div><strong>API Version:</strong> {targetConnectedOrg.apiVersion}</div>
										</div>
									</Tooltip.Content>
								</Tooltip.Root>

								<!-- More Options Menu -->
								<DropdownMenu.Root>
									<DropdownMenu.Trigger>
										{#snippet child({ props })}
											<Button {...props} variant="ghost" size="icon" class="h-8 w-8 text-white hover:bg-white/10">
												<MoreVertical class="h-4 w-4" />
												<span class="sr-only">More options</span>
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
												class="mt-1.5 h-8"
											/>
										</div>

										<DropdownMenu.Separator />
										<DropdownMenu.Item class="text-destructive" onclick={handleDisconnectTarget}>
											Disconnect
										</DropdownMenu.Item>
									</DropdownMenu.Content>
								</DropdownMenu.Root>
							</div>
						</div>
					{/snippet}

					{@render targetOrgHeader()}

					<!-- Action Buttons -->
					<div class="flex gap-3">
						<Button variant="secondary" class="flex-1">
							View Details
						</Button>
						<Button variant="outline" onclick={handleDisconnectTarget}>
							Disconnect
						</Button>
					</div>
				</div>
			{:else}
				<!-- Connection Form -->
				<div class="space-y-6">
					<div class="space-y-3">
						<Label for="target-instance-url">Instance URL *</Label>
						<Input
							id="target-instance-url"
							bind:value={targetInstanceUrl}
							placeholder="e.g., https://mycompany--uat.sandbox.my.salesforce.com"
							disabled={targetIsConnecting}
						/>
					</div>

					<div class="space-y-3">
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

					<!-- Customization Tabs -->
					<div class="space-y-3">
						<Label class="sr-only">Organization Appearance</Label>
						<Tabs.Root bind:value={targetCustomizationTab}>
							<Tabs.List class="grid w-full grid-cols-2">
								<Tabs.Trigger value="color">Color</Tabs.Trigger>
								<Tabs.Trigger value="icon">Icon</Tabs.Trigger>
							</Tabs.List>

							<div class="mt-4 w-fit">
								<Tabs.Content value="color">
									<div class="flex gap-2">
										{#each COLOR_PALETTE as color}
											<button
												type="button"
												onclick={() => targetColor = color.value}
												disabled={targetIsConnecting}
												class="w-12 h-12 rounded-md border-2 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
												class:border-foreground={targetColor === color.value}
												class:border-transparent={targetColor !== color.value}
												style="background-color: {color.value};"
												title={color.name}
											>
												<span class="sr-only">{color.name}</span>
											</button>
										{/each}
									</div>
								</Tabs.Content>

								<Tabs.Content value="icon">
									<div class="relative w-fit">
										<div
											class="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth max-w-[320px]"
											bind:this={targetIconScrollContainer}
											onscroll={updateTargetArrowVisibility}
										>
											{#each ICON_PALETTE as icon}
												{@const IconComponent = icon.component}
												<button
													type="button"
													onclick={() => targetIcon = icon.name}
													disabled={targetIsConnecting}
													class="w-12 h-12 rounded-lg border-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0"
													class:border-foreground={targetIcon === icon.name}
													class:border-transparent={targetIcon !== icon.name}
													class:bg-muted={targetIcon === icon.name}
													title={icon.name}
												>
													<IconComponent class="h-5 w-5" />
													<span class="sr-only">{icon.name}</span>
												</button>
											{/each}
										</div>
										{#if targetShowLeftArrow}
											<button
												type="button"
												onclick={scrollTargetLeft}
												class="absolute left-0 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm border rounded-full p-1 hover:bg-muted transition-colors"
												title="Scroll left"
											>
												<ChevronLeft class="h-4 w-4" />
											</button>
										{/if}
										{#if targetShowRightArrow}
											<button
												type="button"
												onclick={scrollTargetRight}
												class="absolute right-0 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm border rounded-full p-1 hover:bg-muted transition-colors"
												title="Scroll right"
											>
												<ChevronRight class="h-4 w-4" />
											</button>
										{/if}
									</div>
								</Tabs.Content>
							</div>
						</Tabs.Root>
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
</div>

