<script>
	import '../app.pcss';
	import { browser } from '$app/environment';
</script>

{#if browser}
	<slot />
{/if}
