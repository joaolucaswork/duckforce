<script lang="ts">
	import type { ComponentNoteData } from '$lib/types/wizard';
	import * as Sheet from '$lib/components/ui/sheet';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Accordion from '$lib/components/ui/accordion';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Save, X, EllipsisVertical, Check, CircleAlert, Plus } from '@lucide/svelte';
	import { formatDistanceToNow } from 'date-fns';
	import { ptBR } from 'date-fns/locale';

	interface Props {
		open: boolean;
		onOpenChange: (open: boolean) => void;
		componentName: string;
		componentId: string;
		noteData: ComponentNoteData | undefined;
		noteHistory: ComponentNoteData[];
		onSaveNote: (content: string, isTodo: boolean, archiveAndCreateNew: boolean) => Promise<void>;
		onLoadHistory: () => Promise<void>;
	}

	let { open, onOpenChange, componentName, componentId, noteData, noteHistory, onSaveNote, onLoadHistory }: Props = $props();

	let localContent = $state('');
	let localIsTodo = $state(false);
	let isTyping = $state(false);
	let showThreeDotMenu = $state(false);
	let dropdownOpen = $state(false);
	let isSaving = $state(false);
	let typingTimeout: ReturnType<typeof setTimeout> | null = null;
	let autoSaveTimeout: ReturnType<typeof setTimeout> | null = null;
	let textareaFocused = $state(false);
	let saveStatus = $state<'idle' | 'saving' | 'saved' | 'error'>('idle');
	let lastSavedAt = $state<Date | null>(null);
	let saveStatusTimeout: ReturnType<typeof setTimeout> | null = null;

	let hasChanges = $derived(
		localContent !== (noteData?.content || '') || localIsTodo !== (noteData?.isTodo || false)
	);

	// Load history when sheet opens
	$effect(() => {
		if (open) {
			onLoadHistory();
		}
	});

	// Update local state when noteData prop changes
	$effect(() => {
		localContent = noteData?.content || '';
		localIsTodo = noteData?.isTodo || false;
		isTyping = false;
		showThreeDotMenu = false;
		saveStatus = 'idle';
	});

	// Auto-save effect when content changes
	$effect(() => {
		// Only auto-save if there are changes and we're not currently saving
		if (hasChanges && !isSaving && localContent.trim()) {
			// Clear existing auto-save timeout
			if (autoSaveTimeout) {
				clearTimeout(autoSaveTimeout);
			}

			// Set new auto-save timeout (2.5 seconds after user stops typing)
			autoSaveTimeout = setTimeout(() => {
				handleAutoSave();
			}, 2500);
		}

		return () => {
			if (autoSaveTimeout) {
				clearTimeout(autoSaveTimeout);
			}
		};
	});

	function handleInput() {
		isTyping = true;
		if (typingTimeout) {
			clearTimeout(typingTimeout);
		}
		typingTimeout = setTimeout(() => {
			isTyping = false;
		}, 500);
	}

	function handleFocus() {
		textareaFocused = true;
		showThreeDotMenu = true;
	}

	function handleBlur() {
		textareaFocused = false;
		// Delay hiding menu to allow clicking on it
		// Longer delay to ensure dropdown has time to open
		setTimeout(() => {
			if (!textareaFocused && !dropdownOpen) {
				showThreeDotMenu = false;
			}
		}, 300);
	}

	async function handleAutoSave() {
		if (!hasChanges || isSaving) return;

		isSaving = true;
		saveStatus = 'saving';

		try {
			await onSaveNote(localContent, localIsTodo, false);
			saveStatus = 'saved';
			lastSavedAt = new Date();

			// Clear save status after 3 seconds
			if (saveStatusTimeout) {
				clearTimeout(saveStatusTimeout);
			}
			saveStatusTimeout = setTimeout(() => {
				saveStatus = 'idle';
			}, 3000);
		} catch (error) {
			console.error('Error auto-saving note:', error);
			saveStatus = 'error';

			// Clear error status after 5 seconds
			if (saveStatusTimeout) {
				clearTimeout(saveStatusTimeout);
			}
			saveStatusTimeout = setTimeout(() => {
				saveStatus = 'idle';
			}, 5000);
		} finally {
			isSaving = false;
		}
		// Note: Auto-save does NOT close the sheet
	}

	async function handleSave() {
		if (!hasChanges) return;

		isSaving = true;
		saveStatus = 'saving';

		try {
			await onSaveNote(localContent, localIsTodo, false);
			saveStatus = 'saved';
			lastSavedAt = new Date();
			onOpenChange(false);
		} catch (error) {
			console.error('Error saving note:', error);
			saveStatus = 'error';
		} finally {
			isSaving = false;
		}
	}

	async function handleArchiveAndCreateNew() {
		if (!localContent.trim()) return;

		isSaving = true;
		saveStatus = 'saving';

		try {
			await onSaveNote(localContent, localIsTodo, true);

			// Clear the textarea for new note
			localContent = '';
			localIsTodo = false;
			saveStatus = 'saved';
			lastSavedAt = new Date();

			// Clear save status after 3 seconds
			if (saveStatusTimeout) {
				clearTimeout(saveStatusTimeout);
			}
			saveStatusTimeout = setTimeout(() => {
				saveStatus = 'idle';
			}, 3000);
		} catch (error) {
			console.error('Error archiving note:', error);
			saveStatus = 'error';
		} finally {
			isSaving = false;
		}
	}

	function handleCancel() {
		localContent = noteData?.content || '';
		localIsTodo = noteData?.isTodo || false;
		onOpenChange(false);
	}

	function formatTimestamp(timestamp: string): string {
		try {
			return formatDistanceToNow(new Date(timestamp), {
				addSuffix: true,
				locale: ptBR
			});
		} catch {
			return timestamp;
		}
	}

	function formatSaveTime(date: Date): string {
		const hours = date.getHours().toString().padStart(2, '0');
		const minutes = date.getMinutes().toString().padStart(2, '0');
		return `${hours}:${minutes}`;
	}
</script>

<Sheet.Root {open} onOpenChange={onOpenChange}>
	<Sheet.Content side="right" class="w-full sm:max-w-md flex flex-col p-0 h-full">
		<Sheet.Header class="p-6 pb-4 flex-shrink-0 border-b">
			<Sheet.Title>Nota do Componente</Sheet.Title>
			<Sheet.Description>
				{componentName}
			</Sheet.Description>
		</Sheet.Header>

		<!-- Note Content -->
		<div class="flex-1 p-6 overflow-y-auto">
			<div class="relative">
				<Textarea
					bind:value={localContent}
					oninput={handleInput}
					onfocus={handleFocus}
					onblur={handleBlur}
					placeholder="Adicione uma nota sobre este componente..."
					class="min-h-[200px] resize-none"
				/>

				<!-- Three-dot menu button -->
				{#if showThreeDotMenu && !isTyping && localContent.trim()}
					<div class="absolute top-2 right-2">
						<DropdownMenu.Root bind:open={dropdownOpen}>
							<DropdownMenu.Trigger>
								{#snippet child({ props })}
									<Button {...props} variant="ghost" size="icon" class="h-8 w-8">
										<EllipsisVertical class="h-4 w-4" />
									</Button>
								{/snippet}
							</DropdownMenu.Trigger>
							<DropdownMenu.Content align="end">
								<DropdownMenu.CheckboxItem
									bind:checked={localIsTodo}
								>
									Converter para To-Do
								</DropdownMenu.CheckboxItem>
							</DropdownMenu.Content>
						</DropdownMenu.Root>
					</div>
				{/if}
			</div>

			<!-- Save Status Indicator -->
			{#if saveStatus !== 'idle'}
				<div class="mt-2 flex items-center gap-2 text-sm transition-opacity duration-300">
					{#if saveStatus === 'saving'}
						<div class="flex items-center gap-2 text-muted-foreground">
							<div class="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
							<span>Salvando...</span>
						</div>
					{:else if saveStatus === 'saved'}
						<div class="flex items-center gap-2 text-green-600 dark:text-green-500">
							<Check class="h-4 w-4" />
							<span>
								Salvo
								{#if lastSavedAt}
									às {formatSaveTime(lastSavedAt)}
								{/if}
							</span>
						</div>
					{:else if saveStatus === 'error'}
						<div class="flex items-center gap-2 text-destructive">
							<CircleAlert class="h-4 w-4" />
							<span>Erro ao salvar</span>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Archived Notes (Collapsible Accordion) -->
			{#if noteHistory.length > 0}
				<div class="mt-4">
					<Accordion.Root type="single" class="w-full">
						<Accordion.Item value="archived-notes">
							<Accordion.Trigger class="text-sm font-semibold">
								Notas Arquivadas ({noteHistory.length})
							</Accordion.Trigger>
							<Accordion.Content>
								<div class="space-y-3 pt-2">
									{#each noteHistory as historicalNote}
										<div class="p-4 rounded-lg border bg-muted/30">
											<p class="text-sm whitespace-pre-wrap mb-2">{historicalNote.content}</p>
											<div class="flex items-center justify-between text-xs text-muted-foreground">
												<span>
													{formatTimestamp(historicalNote.createdAt)}
													{#if historicalNote.userName}
														por {historicalNote.userName}
													{:else}
														por {historicalNote.userEmail}
													{/if}
												</span>
												{#if historicalNote.isTodo}
													<span class="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs">
														To-Do
													</span>
												{/if}
											</div>
										</div>
									{/each}
								</div>
							</Accordion.Content>
						</Accordion.Item>
					</Accordion.Root>
				</div>
			{/if}

			<!-- Archive and Create New Button -->
			{#if localContent.trim()}
				<div class="mt-4">
					<Button
						variant="outline"
						size="lg"
						class="w-full"
						onclick={handleArchiveAndCreateNew}
						disabled={isSaving}
					>
						<Plus class="h-5 w-5 mr-2" />
						Adicionar Nova Nota
					</Button>
				</div>
			{/if}

			<!-- Metadata footer -->
			{#if noteData}
				<div class="mt-4 pt-4 border-t text-xs text-muted-foreground">
					<p>
						Atualizado {formatTimestamp(noteData.updatedAt)}
						{#if noteData.userName}
							por {noteData.userName}
						{:else}
							por {noteData.userEmail}
						{/if}
					</p>
				</div>
			{/if}
		</div>

		<!-- Footer -->
		<Sheet.Footer class="border-t p-6 pt-4 flex-shrink-0 bg-background">
			<div class="flex gap-2 w-full justify-end">
				<Button variant="outline" onclick={handleCancel}>
					<X class="w-4 h-4 mr-2" />
					Cancelar
				</Button>
				<Button onclick={handleSave} disabled={!hasChanges || isSaving}>
					<Save class="w-4 h-4 mr-2" />
					{isSaving ? 'Salvando...' : 'Salvar Notas'}
				</Button>
			</div>
		</Sheet.Footer>
	</Sheet.Content>
</Sheet.Root>

