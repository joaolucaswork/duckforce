<script lang="ts" generics="T">
	interface Props {
		items: T[];
		itemHeight: number;
		height: number;
		children: (item: T, index: number) => any;
		scrollbarClass?: string;
	}

	let { items, itemHeight, height, children, scrollbarClass = 'scrollbar-custom' }: Props = $props();

	let scrollTop = $state(0);
	let containerRef = $state<HTMLDivElement | null>(null);
	let containerHeight = $state(0);

	// Use container height if height is 0 (auto mode)
	const effectiveHeight = $derived(height > 0 ? height : containerHeight);

	// Calculate visible range
	const visibleRange = $derived(() => {
		if (effectiveHeight === 0) return { start: 0, end: items.length };

		const start = Math.floor(scrollTop / itemHeight);
		const visibleCount = Math.ceil(effectiveHeight / itemHeight);
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

	// Measure container height when in auto mode
	$effect(() => {
		if (height === 0 && containerRef) {
			const resizeObserver = new ResizeObserver((entries) => {
				for (const entry of entries) {
					containerHeight = entry.contentRect.height;
				}
			});
			resizeObserver.observe(containerRef);
			return () => resizeObserver.disconnect();
		}
	});
</script>

<div
	bind:this={containerRef}
	onscroll={handleScroll}
	class="overflow-y-scroll {scrollbarClass} {height === 0 ? 'flex-1 min-h-0' : ''}"
	style="{height > 0 ? `height: ${height}px;` : ''}"
>
	<div style="height: {totalHeight}px; position: relative;">
		<div style="transform: translateY({offsetY}px);">
			{#each visibleItems() as { item, index} (index)}
				{@render children(item, index)}
			{/each}
		</div>
	</div>
</div>

