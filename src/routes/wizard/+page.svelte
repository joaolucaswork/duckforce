<script lang="ts">
	import { wizardStore } from '$lib/stores/wizard.svelte';
	import WizardShell from '$lib/components/wizard/WizardShell.svelte';
	import ConnectSourceOrg from '$lib/components/wizard/steps/ConnectSourceOrg.svelte';
	import ConnectTargetOrg from '$lib/components/wizard/steps/ConnectTargetOrg.svelte';
	import SelectComponents from '$lib/components/wizard/steps/SelectComponents.svelte';
	import ReviewDependencies from '$lib/components/wizard/steps/ReviewDependencies.svelte';
	import ExecuteMigration from '$lib/components/wizard/steps/ExecuteMigration.svelte';

	const currentStep = $derived(wizardStore.state.currentStep);
</script>

<WizardShell>
	{#if currentStep === 'connect-source'}
		<ConnectSourceOrg />
	{:else if currentStep === 'connect-target'}
		<ConnectTargetOrg />
	{:else if currentStep === 'select-components'}
		<SelectComponents />
	{:else if currentStep === 'review-dependencies'}
		<ReviewDependencies />
	{:else if currentStep === 'execute-migration'}
		<ExecuteMigration />
	{/if}
</WizardShell>

