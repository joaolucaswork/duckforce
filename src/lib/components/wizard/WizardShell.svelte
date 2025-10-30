<script lang="ts">
	import { wizardStore } from '$lib/stores/wizard.svelte';
	import { WIZARD_STEPS } from '$lib/types/wizard';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Check } from '@lucide/svelte';

	interface Props {
		children: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	const currentStepIndex = $derived(
		WIZARD_STEPS.findIndex(s => s.id === wizardStore.state.currentStep)
	);

	const currentStepConfig = $derived(WIZARD_STEPS[currentStepIndex]);

	const canGoNext = $derived(wizardStore.canProceed());
	const canGoPrevious = $derived(currentStepIndex > 0);
	const isLastStep = $derived(currentStepIndex === WIZARD_STEPS.length - 1);

	function handleNext() {
		if (canGoNext) {
			wizardStore.nextStep();
		}
	}

	function handlePrevious() {
		if (canGoPrevious) {
			wizardStore.previousStep();
		}
	}

	function handleStepClick(stepId: string) {
		const stepIndex = WIZARD_STEPS.findIndex(s => s.id === stepId);
		// Only allow clicking on completed steps or the current step
		if (stepIndex <= currentStepIndex || wizardStore.isStepComplete(stepId as any)) {
			wizardStore.goToStep(stepId as any);
		}
	}
</script>

<div class="min-h-screen bg-background">
	<!-- Header -->
	<header class="border-b">
		<div class="container mx-auto px-6 py-4">
			<div class="flex items-center justify-between">
				<div>
					<h1 class="text-2xl font-bold tracking-tight">SalesDuck</h1>
					<p class="text-sm text-muted-foreground">Migration Wizard</p>
				</div>
				<Button variant="outline" href="/">
					Back to Dashboard
				</Button>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<div class="container mx-auto px-6 py-8">
		<div class="max-w-6xl mx-auto space-y-8">
			<!-- Progress Steps -->
			<Card.Root>
				<Card.Content class="pt-6">
					<div class="flex items-center justify-between">
						{#each WIZARD_STEPS as step, index}
							{@const isComplete = wizardStore.isStepComplete(step.id)}
							{@const isCurrent = step.id === wizardStore.state.currentStep}
							{@const isClickable = index <= currentStepIndex || isComplete}
							
							<div class="flex items-center flex-1">
								<!-- Step Circle -->
								<button
									onclick={() => handleStepClick(step.id)}
									disabled={!isClickable}
									class="flex flex-col items-center gap-2 group {isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}"
								>
									<div
										class="w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all
											{isCurrent
												? 'border-primary bg-primary text-primary-foreground'
												: isComplete
													? 'border-primary bg-primary text-primary-foreground'
													: 'border-muted bg-background text-muted-foreground'}
											{isClickable && !isCurrent ? 'group-hover:border-primary/50' : ''}"
									>
										{#if isComplete}
											<Check class="w-5 h-5" />
										{:else}
											<span class="text-sm font-medium">{step.order}</span>
										{/if}
									</div>
									<div class="text-center max-w-[120px]">
										<p class="text-xs font-medium {isCurrent ? 'text-foreground' : 'text-muted-foreground'}">
											{step.title}
										</p>
									</div>
								</button>

								<!-- Connector Line -->
								{#if index < WIZARD_STEPS.length - 1}
									<div
										class="flex-1 h-0.5 mx-2 transition-colors
											{isComplete ? 'bg-primary' : 'bg-muted'}"
									></div>
								{/if}
							</div>
						{/each}
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Current Step Content -->
			<Card.Root>
				<Card.Header>
					<div class="flex items-center justify-between">
						<div>
							<Card.Title>{currentStepConfig.title}</Card.Title>
							<Card.Description>{currentStepConfig.description}</Card.Description>
						</div>
						<Badge variant="outline">
							Step {currentStepConfig.order} of {WIZARD_STEPS.length}
						</Badge>
					</div>
				</Card.Header>
				<Card.Content>
					<!-- Step Content Slot -->
					{@render children()}
				</Card.Content>
				<Card.Footer class="flex justify-between">
					<Button
						variant="outline"
						onclick={handlePrevious}
						disabled={!canGoPrevious}
					>
						Previous
					</Button>
					<Button
						onclick={handleNext}
						disabled={!canGoNext}
					>
						{isLastStep ? 'Finish' : 'Next'}
					</Button>
				</Card.Footer>
			</Card.Root>
		</div>
	</div>
</div>

