<script lang="js">

import { Button } from "$lib/components/ui/button";
import * as Collapsible from "$lib/components/ui/collapsible";
import { Input } from "$lib/components/ui/input";
import * as Select from "$lib/components/ui/select";
import { enhance } from "$app/forms";
export let form;

let history = [];
let loading = false;
let error = null;
let selectedVersion = null;
let currentPage = 1;
let versionsPerPage = 10;

// Handle form submission result
$: if (form) {
  if (form.error) {
    error = form.error;
  } else if (form.success !== false) {
    error = null;
  }
}

// Paginate versions (no filtering needed)
$: allVersions = form?.versions ? Object.entries(form.versions) : [];
$: totalPages = Math.ceil(allVersions.length / versionsPerPage);
$: paginatedVersions = allVersions.slice(
  (currentPage - 1) * versionsPerPage, 
  currentPage * versionsPerPage
);
let packageName = '';
let searchResults = null;

/**
 * @param {string} name
 * @param {string} version
 */
async function getSubDeps(name, version) {
  if (loading) return;
  
  loading = true;
  error = null;
  
  try {
    // Update history first
    if (history.length === 0) {
      const rootEntry = form?.version ? `${form.name} @ ${form.version}` : form.name;
      history.push(rootEntry);
    }
    history.push(`${name} @ ${version}`);
    history = [...history];

    // First, get the package manifest to resolve the version
    const manifestResponse = await fetch(`https://registry.npmjs.org/${name}`);
    
    if (!manifestResponse.ok) {
      throw new Error(`Failed to fetch ${name}: ${manifestResponse.status}`);
    }
    
    const manifest = await manifestResponse.json();
    
    // Try to find the best matching version
    let resolvedVersion = version;
    
    // Handle version ranges and patterns
    if (version === '*') {
      // "*" means any version, use latest
      if (manifest['dist-tags'] && manifest['dist-tags'].latest) {
        resolvedVersion = manifest['dist-tags'].latest;
      } else {
        const availableVersions = Object.keys(manifest.versions);
        if (availableVersions.length > 0) {
          resolvedVersion = availableVersions.sort((a, b) => b.localeCompare(a, undefined, {numeric: true}))[0];
        }
      }
    } else if (version.includes('.x')) {
      // Handle patterns like "2.x", "1.2.x"
      const pattern = version.replace(/\.x/g, '');
      const availableVersions = Object.keys(manifest.versions);
      const matchingVersions = availableVersions.filter(v => v.startsWith(pattern + '.'));
      if (matchingVersions.length > 0) {
        // Get the latest matching version
        resolvedVersion = matchingVersions.sort((a, b) => b.localeCompare(a, undefined, {numeric: true}))[0];
      }
    } else if (version.startsWith('^') || version.startsWith('~')) {
      // For semver ranges, try to get the latest version or use dist-tags
      if (manifest['dist-tags'] && manifest['dist-tags'].latest) {
        resolvedVersion = manifest['dist-tags'].latest;
      } else {
        // Remove the range prefix and try that version
        resolvedVersion = version.replace(/^[\^~]/, '');
      }
    }
    
    // If we still have an invalid version, try to get a specific version
    if (!manifest.versions[resolvedVersion]) {
      if (manifest['dist-tags'] && manifest['dist-tags'].latest) {
        resolvedVersion = manifest['dist-tags'].latest;
      } else {
        // Get the latest available version
        const availableVersions = Object.keys(manifest.versions);
        if (availableVersions.length > 0) {
          resolvedVersion = availableVersions.sort((a, b) => b.localeCompare(a, undefined, {numeric: true}))[0];
        }
      }
    }

    // Now fetch the specific version data
    const versionResponse = await fetch(`https://registry.npmjs.org/${name}/${resolvedVersion}`);
    
    if (!versionResponse.ok) {
      throw new Error(`Failed to fetch ${name}@${resolvedVersion}: ${versionResponse.status}`);
    }
    
    form = await versionResponse.json();
  } catch (err) {
    error = err.message;
    console.error('Error fetching subdependencies:', err);
  } finally {
    loading = false;
  }
}

/**
 * @param {string} historyItem
 */
async function navigateToHistoryItem(historyItem) {
  if (loading) return;
  
  loading = true;
  error = null;
  
  try {
    const name = historyItem.split(" @ ")[0];
    const currentIndex = history.indexOf(historyItem);
    
    // Trim history to the selected item
    history = history.slice(0, currentIndex + 1);
    
    const response = await fetch(`https://registry.npmjs.org/${name}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch ${name}: ${response.status}`);
    }
    
    form = await response.json();
  } catch (err) {
    error = err.message;
    console.error('Error navigating to history item:', err);
  } finally {
    loading = false;
  }
}

/**
 * Reset to search a new package
 */
function resetSearch() {
  history = [];
  error = null;
  selectedVersion = null;
  currentPage = 1;
  form = null;
}

/**
 * Handle version selection
 * @param {string} version
 */
async function selectVersion(version) {
  if (loading || !form) return;
  
  loading = true;
  error = null;
  selectedVersion = version;
  
  try {
    const response = await fetch(`https://registry.npmjs.org/${form.name}/${version}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch ${form.name}@${version}: ${response.status}`);
    }
    
    const versionData = await response.json();
    form = { ...form, ...versionData, selectedVersion: version };
  } catch (err) {
    error = err.message;
    console.error('Error fetching version:', err);
  } finally {
    loading = false;
  }
}

/**
 * Search for a package
 */
async function searchPackage() {
  if (!packageName.trim() || loading) return;
  
  loading = true;
  error = null;
  history = [];
  
  try {
    const response = await fetch(`https://registry.npmjs.org/${packageName.trim()}`);
    
    if (!response.ok) {
      throw new Error(`Package "${packageName}" not found`);
    }
    
    searchResults = await response.json();
    form = searchResults;
  } catch (err) {
    error = err.message;
    searchResults = null;
    form = null;
  } finally {
    loading = false;
  }
}

/**
 * Count total dependencies
 * @param {Object} deps
 */
function countDependencies(deps) {
  return deps ? Object.keys(deps).length : 0;
}
</script>

<body class="min-h-screen flex flex-col justify-start items-center pt-8 bg-gradient-to-br from-slate-100 to-slate-200">
  <div class="w-full max-w-4xl px-4">
    <!-- Header -->
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold text-slate-800 mb-2">NPM Dependency Explorer</h1>
      <p class="text-slate-600">Explore package dependencies and their versions</p>
    </div>

    <!-- Search Form -->
    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
      <form 
        method="POST" 
        use:enhance={() => {
          loading = true;
          error = null;
          return async ({ result, update }) => {
            loading = false;
            await update();
          };
        }}
        class="flex flex-col sm:flex-row gap-4 items-end justify-center"
      >
        <div class="flex flex-col">
          <label for="package-name" class="text-sm font-medium text-slate-700 mb-1">Package Name</label>
          <Input
            id="package-name"
            class="text-center bg-slate-50 w-[200px]"
            type="text"
            name="package-name"
            value={form?.name ?? ""}
            placeholder="e.g., react, lodash"
            disabled={loading}
            required
          />
        </div>
        
        {#if form?.versions}
          <div class="flex flex-col">
            <label for="package-version" class="text-sm font-medium text-slate-700 mb-1">Version (Optional)</label>
            <Select.Root>
              <Select.Trigger class="w-[200px] bg-slate-50" disabled={loading}>
                <Select.Value placeholder="Latest version" />
              </Select.Trigger>
              <Select.Content class="overflow-y-auto max-h-[300px]">
                <Select.Group>
                  <Select.Label>Available Versions</Select.Label>
                  {#each Object.keys(form.versions).reverse() as version}
                    <Select.Item 
                      value={version} 
                      label={version}
                      on:click={() => selectVersion(version)}
                    >
                      {version}
                    </Select.Item>
                  {/each}
                </Select.Group>
              </Select.Content>
              <Select.Input name="package-version" />
            </Select.Root>
          </div>
        {/if}
        
        <div class="flex gap-2">
          <Button type="submit" disabled={loading}>
            {loading ? 'Loading...' : 'Search'}
          </Button>
        </div>
      </form>
      
      {#if form && !form.error}
        <div class="flex justify-center mt-4 pt-4 border-t border-slate-200">
          <Button 
            type="button" 
            variant="outline" 
            size="sm"
            on:click={resetSearch} 
            disabled={loading}
            class="text-slate-600 hover:text-slate-800"
          >
            🔄 Start New Search
          </Button>
        </div>
      {/if}
    </div>

    <!-- Loading State -->
    {#if loading}
      <div class="text-center py-8">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
        <p class="text-slate-600">Loading package information...</p>
      </div>
    {/if}

    <!-- Error State -->
    {#if error}
      <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <div class="flex items-center">
          <div class="text-red-800">
            <strong>Error:</strong> {error}
          </div>
        </div>
      </div>
    {/if}

    <!-- History Navigation -->
    {#if history.length > 0 && !loading}
      <div class="bg-white rounded-lg shadow-md p-4 mb-6">
        <h3 class="text-sm font-medium text-slate-700 mb-3">Navigation Path:</h3>
        <div class="flex flex-wrap items-center gap-2">
          {#each history as historyItem, index}
            <Button 
              variant="ghost" 
              size="sm"
              class="h-auto py-1 px-2 text-xs"
              on:click={() => navigateToHistoryItem(historyItem)}
              disabled={loading}
            >
              {historyItem}
            </Button>
            {#if index < history.length - 1}
              <span class="text-slate-400">→</span>
            {/if}
          {/each}
        </div>
      </div>
    {/if}

    <!-- Package Information -->
    {#if form && !loading && !form.error}
      <div class="bg-white rounded-lg shadow-md p-6">
        {#if !form.name}
          <div class="text-center py-8">
            <h2 class="text-xl font-semibold text-slate-800 mb-2">Package not found</h2>
            <p class="text-slate-600 mb-4">The package you're looking for doesn't exist.</p>
            <a 
              href="https://www.npmjs.com" 
              target="_blank" 
              rel="noopener noreferrer"
              class="text-blue-600 hover:text-blue-800 hover:underline"
            >
              Browse packages on npmjs.com →
            </a>
          </div>
        {:else}
          <!-- Package Header -->
          <div class="border-b border-slate-200 pb-4 mb-6">
            <h2 class="text-2xl font-bold text-slate-800">
              {form.name}
              {#if form.selectedVersion || form.version}
                <span class="text-slate-500 font-normal">@ {form.selectedVersion || form.version}</span>
              {/if}
            </h2>
            {#if form.description}
              <p class="text-slate-600 mt-2">{form.description}</p>
            {/if}
          </div>

          <!-- Dependencies Section -->
          {#if form.versions}
            <!-- Multiple versions view -->
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-semibold text-slate-800">Versions & Dependencies</h3>
                <span class="text-sm text-slate-500">
                  {allVersions.length} versions total
                </span>
              </div>
              
              {#each paginatedVersions as [version, versionObject]}
                <Collapsible.Root class="border border-slate-200 rounded-lg">
                  <div class="flex items-center justify-between p-4 bg-slate-50">
                    <div class="flex items-center gap-3">
                      <h4 class="font-medium text-slate-800">{version}</h4>
                      <span class="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded">
                        {countDependencies(versionObject.dependencies)} deps
                      </span>
                    </div>
                    {#if versionObject.dependencies && Object.keys(versionObject.dependencies).length > 0}
                      <Collapsible.Trigger asChild let:builder>
                        <Button builders={[builder]} variant="outline" size="sm">
                          View Dependencies
                        </Button>
                      </Collapsible.Trigger>
                    {:else}
                      <span class="text-slate-500 text-sm">No dependencies</span>
                    {/if}
                  </div>
                  
                  {#if versionObject.dependencies && Object.keys(versionObject.dependencies).length > 0}
                    <Collapsible.Content class="p-4 pt-0">
                      <div class="grid gap-2">
                        {#each Object.entries(versionObject.dependencies) as [dependency, depVersion]}
                          <div class="flex items-center justify-between p-3 bg-white border border-slate-100 rounded">
                            <div class="flex flex-col">
                              <span class="font-medium text-slate-800">{dependency}</span>
                              <span class="text-xs text-slate-500">{depVersion}</span>
                            </div>
                            <Button 
                              size="sm" 
                              variant="outline"
                              on:click={() => getSubDeps(dependency, depVersion)}
                              disabled={loading}
                            >
                              Explore →
                            </Button>
                          </div>
                        {/each}
                      </div>
                    </Collapsible.Content>
                  {/if}
                </Collapsible.Root>
              {/each}
              
              <!-- Pagination Controls -->
              {#if totalPages > 1}
                <div class="flex items-center justify-center gap-2 mt-6">
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={currentPage === 1}
                    on:click={() => currentPage = Math.max(1, currentPage - 1)}
                  >
                    ← Previous
                  </Button>
                  
                  <div class="flex items-center gap-1">
                    {#each Array(Math.min(5, totalPages)) as _, i}
                      {@const startPage = Math.max(1, Math.min(totalPages - 4, currentPage - 2))}
                      {@const pageNum = startPage + i}
                      <Button 
                        variant={pageNum === currentPage ? "default" : "outline"}
                        size="sm"
                        class="w-8 h-8 p-0"
                        on:click={() => currentPage = pageNum}
                      >
                        {pageNum}
                      </Button>
                    {/each}
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={currentPage === totalPages}
                    on:click={() => currentPage = Math.min(totalPages, currentPage + 1)}
                  >
                    Next →
                  </Button>
                </div>
                
                <div class="text-center text-sm text-slate-500 mt-2">
                  Page {currentPage} of {totalPages} 
                  ({versionsPerPage} versions per page)
                </div>
              {/if}
            </div>
          {:else if form.dependencies && Object.keys(form.dependencies).length > 0}
            <!-- Single version dependencies view -->
            <div class="space-y-4">
              <h3 class="text-lg font-semibold text-slate-800">
                Dependencies ({Object.keys(form.dependencies).length})
              </h3>
              <div class="grid gap-3">
                {#each Object.entries(form.dependencies) as [dependency, depVersion]}
                  <div class="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                    <div class="flex flex-col">
                      <span class="font-medium text-slate-800">{dependency}</span>
                      <span class="text-sm text-slate-500">{depVersion}</span>
                    </div>
                    <Button 
                      size="sm" 
                      on:click={() => getSubDeps(dependency, depVersion)}
                      disabled={loading}
                    >
                      Explore →
                    </Button>
                  </div>
                {/each}
              </div>
            </div>
          {:else}
            <div class="text-center py-8">
              <div class="text-slate-400 text-4xl mb-4">📦</div>
              <h3 class="text-lg font-medium text-slate-800 mb-2">No Dependencies</h3>
              <p class="text-slate-600">This package doesn't have any dependencies.</p>
            </div>
          {/if}
        {/if}
      </div>
    {/if}
  </div>
</body>
