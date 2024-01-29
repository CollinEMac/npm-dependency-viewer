<script lang="js">
  export let form;
</script>

<body>
  <form method="POST">
    <label for="package-name">The Exact name of your npm package</label>
    <input type="text" id="package-name" name="package-name"/>
    <button type="submit">Submit</button>
  </form>

  <div class="package-name">
    {#if form}
      <h2>{`${form.name}: `}</h2>
      {#each Object.entries(form.versions) as [version, versionObject]}
        <details>
          <summary>{version}</summary>
          {#each Object.entries(versionObject.dependencies) as [dependency, depVersion]}
            <div>{dependency}: {depVersion}</div>
          {/each}
        </details>
      {/each}
    {/if}
  </div>
</body>