<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import * as Tabs from '$lib/components/ui/tabs';

	let count = $state(0);

	function increment() {
		count += 1;
	}
</script>

<main class="container mx-auto p-8 max-w-4xl">
	<div class="space-y-8">
		<div class="text-center space-y-4">
			<h1 class="text-4xl font-bold tracking-tight">Welcome to SalesDuck</h1>
			<p class="text-muted-foreground">
				A modern SvelteKit application with shadcn-svelte components
			</p>
			<div class="flex gap-2 justify-center">
				<Badge>Svelte 5</Badge>
				<Badge variant="secondary">Tailwind v4</Badge>
				<Badge variant="outline">shadcn-svelte</Badge>
			</div>
		</div>

		<Separator />

		<Card.Root>
			<Card.Header>
				<Card.Title>Counter Example</Card.Title>
				<Card.Description>
					A simple counter to demonstrate Svelte 5 reactivity with shadcn-svelte components
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="flex flex-col items-center gap-4">
					<p class="text-6xl font-bold tabular-nums">{count}</p>
					<Button onclick={increment}>Increment</Button>
				</div>
			</Card.Content>
		</Card.Root>

		<Tabs.Root value="overview" class="w-full">
			<Tabs.List class="grid w-full grid-cols-3">
				<Tabs.Trigger value="overview">Overview</Tabs.Trigger>
				<Tabs.Trigger value="components">Components</Tabs.Trigger>
				<Tabs.Trigger value="docs">Documentation</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Content value="overview" class="space-y-4">
				<Card.Root>
					<Card.Header>
						<Card.Title>Project Overview</Card.Title>
					</Card.Header>
					<Card.Content>
						<p class="text-sm text-muted-foreground">
							This is a SvelteKit project configured with the latest technologies:
						</p>
						<ul class="mt-4 space-y-2 text-sm">
							<li>✓ Svelte 5 with runes</li>
							<li>✓ Tailwind CSS v4</li>
							<li>✓ shadcn-svelte components</li>
							<li>✓ TypeScript</li>
							<li>✓ Vite 6</li>
						</ul>
					</Card.Content>
				</Card.Root>
			</Tabs.Content>
			<Tabs.Content value="components" class="space-y-4">
				<Card.Root>
					<Card.Header>
						<Card.Title>Available Components</Card.Title>
					</Card.Header>
					<Card.Content>
						<p class="text-sm text-muted-foreground mb-4">
							The following shadcn-svelte components are installed:
						</p>
						<div class="flex flex-wrap gap-2">
							<Badge>Button</Badge>
							<Badge>Card</Badge>
							<Badge>Badge</Badge>
							<Badge>Separator</Badge>
							<Badge>Tabs</Badge>
						</div>
					</Card.Content>
				</Card.Root>
			</Tabs.Content>
			<Tabs.Content value="docs" class="space-y-4">
				<Card.Root>
					<Card.Header>
						<Card.Title>Documentation</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-4">
						<div>
							<h3 class="font-semibold mb-2">Getting Started</h3>
							<p class="text-sm text-muted-foreground">
								Run <code class="bg-muted px-1 py-0.5 rounded">pnpm dev</code> to start the
								development server.
							</p>
						</div>
						<div>
							<h3 class="font-semibold mb-2">Add Components</h3>
							<p class="text-sm text-muted-foreground">
								Use <code class="bg-muted px-1 py-0.5 rounded"
									>pnpm dlx shadcn-svelte@latest add [component]</code
								> to add more components.
							</p>
						</div>
					</Card.Content>
				</Card.Root>
			</Tabs.Content>
		</Tabs.Root>
	</div>
</main>

