<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		length?: number;
		onComplete?: (code: string) => void;
		disabled?: boolean;
	}

	let { length = 6, onComplete, disabled = false }: Props = $props();

	let inputs: HTMLInputElement[] = [];
	let values = $state<string[]>(Array(length).fill(''));

	function handleInput(index: number, event: Event) {
		const target = event.target as HTMLInputElement;
		const value = target.value;

		// Only allow single digit
		if (value.length > 1) {
			target.value = value.slice(-1);
		}

		// Update values array
		values[index] = target.value;

		// Auto-focus next input
		if (target.value && index < length - 1) {
			inputs[index + 1]?.focus();
		}

		// Check if all inputs are filled
		if (values.every((v) => v !== '')) {
			const code = values.join('');
			onComplete?.(code);
		}
	}

	function handleKeyDown(index: number, event: KeyboardEvent) {
		// Handle backspace
		if (event.key === 'Backspace' && !values[index] && index > 0) {
			inputs[index - 1]?.focus();
		}

		// Handle arrow keys
		if (event.key === 'ArrowLeft' && index > 0) {
			inputs[index - 1]?.focus();
		}
		if (event.key === 'ArrowRight' && index < length - 1) {
			inputs[index + 1]?.focus();
		}
	}

	function handlePaste(event: ClipboardEvent) {
		event.preventDefault();
		const pastedData = event.clipboardData?.getData('text');
		if (!pastedData) return;

		// Extract only digits
		const digits = pastedData.replace(/\D/g, '').slice(0, length);

		// Fill inputs with pasted digits
		digits.split('').forEach((digit, index) => {
			if (index < length) {
				values[index] = digit;
				if (inputs[index]) {
					inputs[index].value = digit;
				}
			}
		});

		// Focus last filled input or first empty
		const lastFilledIndex = Math.min(digits.length - 1, length - 1);
		inputs[lastFilledIndex]?.focus();

		// Check if complete
		if (digits.length === length) {
			onComplete?.(digits);
		}
	}

	export function clear() {
		values = Array(length).fill('');
		inputs.forEach((input) => {
			if (input) input.value = '';
		});
		inputs[0]?.focus();
	}

	onMount(() => {
		// Focus first input on mount
		inputs[0]?.focus();
	});
</script>

<div class="flex gap-2 justify-center">
	{#each Array(length) as _, index}
		<input
			bind:this={inputs[index]}
			type="text"
			inputmode="numeric"
			pattern="[0-9]"
			maxlength="1"
			class="w-12 h-14 text-center text-2xl font-semibold border-2 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-background"
			oninput={(e) => handleInput(index, e)}
			onkeydown={(e) => handleKeyDown(index, e)}
			onpaste={handlePaste}
			{disabled}
			aria-label={`Digit ${index + 1}`}
		/>
	{/each}
</div>

