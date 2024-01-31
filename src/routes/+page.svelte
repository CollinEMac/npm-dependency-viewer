<script lang="js">
// @ts-nocheck

  export let form;

  	/** 
     * @param {string} name
     * @param {string} version
     */
	async function getSubDeps(name, version) {
    version = version.substring(1); // Remove leading '^'

    const response = await fetch(
      `https://registry.npmjs.org/${name}/${version}`,
    );
    form = await response.json();
	}
</script>

<body>
  <form method="POST">
    <div>
      <label for="package-name">The exact name of your npm package
        <input type="text" name="package-name"/>
      </label>
    </div>
    <div>
      <label for="package-version">The exact version of your npm package (optional)
        <input type="text" name="package-version"/>
      </label>
    </div>
    <button type="submit">Submit</button>
  </form>

  <div class="package-name">
    {#if form}
      <h2>{`${form.name}: `}</h2>
      {#if !!form.versions}
        {#each Object.entries(form.versions) as [version, versionObject]}
          {#if !!versionObject.dependencies}
            <details>
              <summary>{version}</summary>
              {#each Object.entries(versionObject.dependencies) as [dependency, depVersion]}
                <h3>
                  {dependency}: {depVersion} 
                  <button on:click={getSubDeps(dependency, depVersion)}> Get Sub Dependencies</button>
                </h3>
              {/each}
            </details>
          {/if}
        {/each}
      {:else}
        {#if !!form.dependencies}
          {#each Object.entries(form.dependencies) as [dependency, depVersion]}
            <div>{dependency}: {depVersion}</div>
          {/each}
        {/if}
      {/if}
    {/if}
  </div>
</body>