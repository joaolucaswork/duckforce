<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Skeleton } from '$lib/components/ui/skeleton';
</script>

<Card.Root class="relative overflow-hidden">
	<!-- Color accent bar skeleton -->
	<div class="absolute left-0 top-0 bottom-0 w-1 bg-muted"></div>
	
	<Card.Header class="pl-6">
		<div class="flex items-start justify-between">
			<div class="flex items-center gap-3">
				<!-- Icon skeleton -->
				<Skeleton class="h-12 w-12 rounded-lg" />
				
				<!-- Org info skeleton -->
				<div class="space-y-2">
					<div class="flex items-center gap-2">
						<!-- Org name skeleton -->
						<Skeleton class="h-5 w-32" />
						<!-- Active badge skeleton (sometimes visible) -->
						<Skeleton class="h-5 w-14 rounded-full" />
					</div>
					<!-- Instance URL skeleton -->
					<Skeleton class="h-4 w-48" />
				</div>
			</div>

			<!-- Actions menu skeleton -->
			<Skeleton class="h-8 w-8 rounded-md" />
		</div>
	</Card.Header>

	<Card.Content class="pl-6">
		<div class="space-y-3">
			<!-- Badges skeleton -->
			<div class="flex flex-wrap gap-2">
				<Skeleton class="h-5 w-20 rounded-full" />
				<Skeleton class="h-5 w-28 rounded-full" />
			</div>

			<!-- Last synced skeleton -->
			<Skeleton class="h-4 w-40" />

			<!-- Component counts skeleton -->
			<div class="grid grid-cols-2 gap-2">
				<Skeleton class="h-4 w-16" />
				<Skeleton class="h-4 w-16" />
				<Skeleton class="h-4 w-20" />
				<Skeleton class="h-4 w-20" />
			</div>
		</div>
	</Card.Content>
</Card.Root>

