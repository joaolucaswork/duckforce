<script lang="ts" generics="T">
	interface Props {
		items: T[];
		itemHeight: number;
		height: number;
		children: (item: T, index: number) => any;
	}

	let { items, itemHeight, height, children }: Props = $props();

	let scrollTop = $state(0);

	// Calculate visible range
	const visibleRange = $derived(() => {
		const start = Math.floor(scrollTop / itemHeight);
		const visibleCount = Math.ceil(height / itemHeight);
		const end = Math.min(start + visibleCount + 5, items.length); // +5 for buffer
		const actualStart = Math.max(0, start - 5); // -5 for buffer above
		
		return { start: actualStart, end };
	});

	const visibleItems = $derived(() => {
		const { start, end } = visibleRange();
		return items.slice(start, end).map((item, i) => ({
			item,
			index: start + i
		}));
	});

	const totalHeight = $derived(items.length * itemHeight);
	const offsetY = $derived(visibleRange().start * itemHeight);

	function handleScroll(e: Event) {
		const target = e.target as HTMLDivElement;
		scrollTop = target.scrollTop;
	}
</script>

<div
	onscroll={handleScroll}
	class="overflow-y-auto"
	style="height: {height}px;"
>
	<div style="height: {totalHeight}px; position: relative;">
		<div style="transform: translateY({offsetY}px);">
			{#each visibleItems() as { item, index } (index)}
				{@render children(item, index)}
			{/each}
		</div>
	</div>
</div>

