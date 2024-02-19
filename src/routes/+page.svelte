<script lang="js">
// @ts-nocheck

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

<body>
  <form method="POST">
    <div>
      <label for="package-name">The exact name of your npm package
        <input type="text" name="package-name" value={form?.name ?? ""}/>
      </label>
    </div>
    <div>
      <label for="package-version">The exact version of your npm package (optional)
        <input type="text" name="package-version" value={form?.version ?? ""}/>
      </label>
    </div>
    <button type="submit">Submit</button>
  </form>

  <div class="package-name">
    {#if form}
      {#if history.length > 0}
        {#each history as historyItem, index}
          <button on:click={getParentDep(historyItem)}><h2>{historyItem}</h2></button>
          {#if index == history.length-1}
            <br>
          {:else}
            ->
          {/if}
        {/each}
      {:else}
        {#if form.version}
          <h2>{`${form.name} @ ${form.version}: `}</h2>
        {:else}
          <h2>{`${form.name}: `}</h2>
        {/if}
      {/if}
      {#if !!form.versions}
        {#each Object.entries(form.versions) as [version, versionObject]}
          <details>
            <summary>{version}</summary>
            {#if versionObject.dependencies && Object.keys(versionObject.dependencies).length !== 0}
              {#each Object.entries(versionObject.dependencies) as [dependency, depVersion]}
                <div>
                  {dependency}: {depVersion}
                  <button on:click={getSubDeps(dependency, depVersion)}> Get Sub Dependencies</button>
                </div>
              {/each}
            {:else}
              No dependencies
            {/if}
          </details>
        {/each}
      {:else}
        {#if form.dependencies && Object.keys(form.dependencies).length !== 0}
          {#each Object.entries(form.dependencies) as [dependency, depVersion]}
            <div>
              {dependency}: {depVersion}
              <button on:click={getSubDeps(dependency, depVersion)}> Get Sub Dependencies</button>
            </div>
          {/each}
        {:else}
          No dependencies
        {/if}
      {/if}
    {/if}
  </div>
</body>

<style>
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    text-align: center;
    margin: 0;
    padding: 0;
    background-color: #f5f5f5;
  }
</style>