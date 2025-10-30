<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		class?: string;
		size?: 'sm' | 'md' | 'lg' | 'xl';
		showText?: boolean;
	}

	let { class: className, size = 'md', showText = true }: Props = $props();

	const sizeClasses = {
		sm: 'h-6',
		md: 'h-8',
		lg: 'h-10',
		xl: 'h-12'
	};

	const textSizeClasses = {
		sm: 'text-lg',
		md: 'text-xl',
		lg: 'text-2xl',
		xl: 'text-3xl'
	};
</script>

<div class={cn('flex items-center gap-3', className)}>
	<img src="/salesduck.svg" alt="SalesDuck Logo" class={cn(sizeClasses[size], 'w-auto')} />
	{#if showText}
		<span class={cn('font-bold tracking-tight', textSizeClasses[size])}>SalesDuck</span>
	{/if}
</div>

