<script lang="ts">
	import { wizardStore } from '$lib/stores/wizard.svelte';
	import { WIZARD_STEPS } from '$lib/types/wizard';
	import { Button } from '$lib/components/ui/button';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { Check, ChevronRight, X, Info } from '@lucide/svelte';

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

<Sidebar.Provider>
	<Sidebar.Root collapsible="offcanvas">
		<!-- Sidebar Header -->
		<Sidebar.Header>
			<div class="px-2 py-2">
				<h2 class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
					Order Steps
				</h2>
			</div>
		</Sidebar.Header>

		<!-- Sidebar Content -->
		<Sidebar.Content>
			<Sidebar.Group>
				<Sidebar.GroupContent>
					<Sidebar.Menu>
						{#each WIZARD_STEPS as step, index}
							{@const isComplete = wizardStore.isStepComplete(step.id)}
							{@const isCurrent = step.id === wizardStore.state.currentStep}
							{@const isClickable = index <= currentStepIndex || isComplete}

							<Sidebar.MenuItem>
								<Sidebar.MenuButton
									onclick={() => handleStepClick(step.id)}
									disabled={!isClickable}
									class="w-full {isCurrent ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''}"
								>
									<!-- Step Indicator -->
									<div class="flex-shrink-0">
										{#if isComplete}
											<div class="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
												<Check class="w-4 h-4 text-white" />
											</div>
										{:else if isCurrent}
											<div class="w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center">
												<span class="text-xs font-semibold">{step.order}</span>
											</div>
										{:else}
											<div class="w-6 h-6 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center">
												<span class="text-xs font-medium">{step.order}</span>
											</div>
										{/if}
									</div>

									<!-- Step Title -->
									<span class="text-sm font-medium flex-1">
										{step.title || `Step ${step.order}`}
									</span>

									<!-- Current Step Indicator -->
									{#if isCurrent}
										<ChevronRight class="w-4 h-4 flex-shrink-0" />
									{/if}
								</Sidebar.MenuButton>
							</Sidebar.MenuItem>
						{/each}
					</Sidebar.Menu>
				</Sidebar.GroupContent>
			</Sidebar.Group>
		</Sidebar.Content>
	</Sidebar.Root>

	<!-- Main Content Area -->
	<Sidebar.Inset>
		<div class="flex flex-col min-h-screen">
			<!-- Top Header -->
			<header class="border-b bg-background sticky top-0 z-10">
				<div class="px-8 py-6 flex items-center justify-between">
					<div class="flex items-center gap-4">
						<Sidebar.Trigger class="md:hidden" />

						<!-- Step Title and Description -->
						<div class="flex flex-col">
							<div class="flex items-center gap-2">
								<h1 class="text-2xl font-bold tracking-tight text-foreground">
									{currentStepConfig.title}
								</h1>

								<!-- Info Tooltip -->
								<Tooltip.Root>
									<Tooltip.Trigger>
										<div class="p-1 hover:bg-muted rounded-md transition-colors">
											<Info class="h-4 w-4 text-muted-foreground" />
										</div>
									</Tooltip.Trigger>
									<Tooltip.Content class="max-w-sm">
										<div class="space-y-1">
											<div class="font-semibold">Step {currentStepConfig.order} of {WIZARD_STEPS.length}</div>
											<p class="opacity-70 leading-relaxed">{currentStepConfig.description}</p>
										</div>
									</Tooltip.Content>
								</Tooltip.Root>
							</div>

							{#if currentStepConfig.description}
								<p class="text-sm text-muted-foreground mt-0.5">
									{currentStepConfig.description}
								</p>
							{/if}
						</div>
					</div>

					<Button variant="ghost" size="icon" href="/">
						<X class="w-5 h-5" />
					</Button>
				</div>
			</header>

			<!-- Main Content -->
			<main class="flex-1 overflow-auto flex items-center">
				<div class="max-w-4xl mx-auto px-8 py-8 w-full">
					<!-- Step Header: Exibe o número do passo, título e descrição de forma centralizada -->
					<!-- <div class="mb-10 text-center"> -->
						<!-- Indicador numérico do passo atual (círculo com número) -->
						<!-- <div class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-foreground text-background mb-4">
							<span class="text-sm font-bold">{currentStepConfig.order}</span>
						</div> -->
						<!-- Título do passo (ex: "Configure Organizations") -->
						<!-- {#if currentStepConfig.title}
							<h2 class="text-xl font-bold tracking-tight mb-2">{currentStepConfig.title}</h2>
						{/if} -->
						<!-- Descrição do passo (ex: "Connect your source and target Salesforce organizations") -->
						<!-- {#if currentStepConfig.description}
							<p class="text-muted-foreground text-sm">{currentStepConfig.description}</p>
						{/if} -->
					<!-- </div> -->

					<!-- Step Content -->
					<div class="space-y-6">
						{@render children()}
					</div>

					<!-- Navigation Footer -->
					<div class="mt-12 pt-6 border-t flex items-center justify-between">
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
					</div>
				</div>
			</main>
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>

