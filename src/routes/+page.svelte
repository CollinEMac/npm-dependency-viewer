<script lang="js">
// @ts-nocheck

  import { Button } from "$lib/components/ui/button";
  import * as Collapsible from "$lib/components/ui/collapsible";
  import { Input } from "$lib/components/ui/input";
  import * as Select from "$lib/components/ui/select";

  import { enhance } from '$app/forms';

  export let form;
  $: history = [];

  	/** 
     * @param {string} name
     * @param {string} version
     */
	async function getSubDeps(name, version) {
    version = version.substring(1); // Remove leading '^'

    // Update history
    if (history.length == 0) {
      if ("version" in form) {
        history.push(form.name + " @ " + form.version);
      } else {
        history.push(form.name);
      }
    }
    history.push(name + " @ " + version);
    history = history;

    const response = await fetch(
      `https://registry.npmjs.org/${name}/${version}`,
    );
    form = await response.json();
	}

  	/** 
     * @param {string} name
     */
  async function getParentDep(name) {
    name = name.split(" @ ")[0];
    history=[];

    const response = await fetch(
      `https://registry.npmjs.org/${name}`,
    )
    form = await response.json();
  }
</script>

<body class="flex flex-col justify-center items-center text-center pt-3 bg-slate-200">
  <form method="POST" use:enhance>
    <div>
      <Input
        class="text-center bg-slate-50 w-[180px]"
        type="text"
        name="package-name"
        value={form?.name ?? ""}
        placeholder="package name"
      />
    </div>
    <div class="pt-3">
      {#if form?.versions}
      <Select.Root>
        <Select.Trigger class="w-[180px] bg-slate-50">
          <Select.Value placeholder="Select a version" />
        </Select.Trigger>
        <Select.Content class="overflow-y-auto max-h-[300px]">
          <Select.Group>
            <Select.Label for="package-version">The exact version of your npm package (optional)</Select.Label>
            {#each Object.entries(form.versions) as [version, versionObject]}
              <Select.Item name="package-version" value={version} label={version}
                >{version}</Select.Item
              >
            {/each}
          </Select.Group>
        </Select.Content>
        <Select.Input name="package-version" />
      </Select.Root>
      {/if}
    </div>
    <div class="pt-3">
      <Button type="submit">Submit</Button>
    </div>
  </form>

  <div class="pt-3">
    {#if form}
      {#if history.length > 0}
        {#each history as historyItem, index}
          <Button on:click={getParentDep(historyItem)}><h2>{historyItem}</h2></Button>
          {#if index == history.length-1}
            <br>
          {:else}
            ->
          {/if}
        {/each}
      {:else}
        {#if form.name}
          {#if form.version}
            <h1 class="text-xl">{`${form.name} @ ${form.version}: `}</h1>
          {:else}
            <h1 class="text-xl">{`${form.name}: `}</h1>
          {/if}
        {:else}
          <h1 class="text-xl">Couldn't find that package...</h1>
          <h3 class="pt-3">Try looking at available packages at <a
            class="no-underline hover:underline text-sky-600" target="#" href="https://www.npmjs.com"
            >https://www.npmjs.com</a>
          </h3>
        {/if}
      {/if}
      {#if !!form.versions}
        {#each Object.entries(form.versions) as [version, versionObject]}
          <Collapsible.Root class="w-[350px] space-y-2 pt-3">
            <div class="flex items-center justify-between space-x-4 px-4">
              <h4 class="text-sm font-semibold">{version}</h4>
              {#if versionObject.dependencies && Object.keys(versionObject.dependencies).length !== 0}
                <Collapsible.Trigger asChild let:builder>
                  <Button builders={[builder]} variant="outline" size="lg" class="w-9 p-0">
                    ↕
                  </Button>
                </Collapsible.Trigger>
              {:else}
                <span class="opacity-50">No subdependencies</span>
              {/if}
            </div>
            {#if versionObject.dependencies && Object.keys(versionObject.dependencies).length !== 0}
              {#each Object.entries(versionObject.dependencies) as [dependency, depVersion]}
                <Collapsible.Content class="space-y-2 pt-2">
                  <div>
                    {dependency}: {depVersion}
                    <Button on:click={getSubDeps(dependency, depVersion)}> Get Sub Dependencies</Button>
                  </div>
                </Collapsible.Content>
              {/each}
            {/if}
          </Collapsible.Root>
        {/each}
      {:else}
        {#if form.dependencies && Object.keys(form.dependencies).length !== 0}
          {#each Object.entries(form.dependencies) as [dependency, depVersion]}
            <div class="pt-2">
              {dependency}: {depVersion}
              <Button on:click={getSubDeps(dependency, depVersion)}> Get Sub Dependencies</Button>
            </div>
          {/each}
        {:else}
          <h3 class="pt-3">No dependencies...</h3>
        {/if}
      {/if}
    {/if}
  </div>
</body>
