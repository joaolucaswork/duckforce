<script lang="ts">
	import { wizardStore } from '$lib/stores/wizard.svelte';
	import WizardShell from '$lib/components/wizard/WizardShell.svelte';
	import ConfigureOrgs from '$lib/components/wizard/steps/ConfigureOrgs.svelte';
	import SelectComponents from '$lib/components/wizard/steps/SelectComponents.svelte';
	import ReviewDependencies from '$lib/components/wizard/steps/ReviewDependencies.svelte';
	import ExecuteMigration from '$lib/components/wizard/steps/ExecuteMigration.svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const currentStep = $derived(wizardStore.state.currentStep);
</script>

<WizardShell user={data.user}>
	{#if currentStep === 'configure-orgs'}
		<ConfigureOrgs />
	{:else if currentStep === 'select-components'}
		<SelectComponents />
	{:else if currentStep === 'review-dependencies'}
		<ReviewDependencies />
	{:else if currentStep === 'execute-migration'}
		<ExecuteMigration />
	{/if}
</WizardShell>

