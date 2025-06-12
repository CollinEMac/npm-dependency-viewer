import { fail } from '@sveltejs/kit';

export const actions = {
  default: async ({ request }) => {
    const formData = await request.formData();
    const packageName = formData.get('package-name');
    const packageVersion = formData.get('package-version');
    
    // Validate package name
    if (!packageName || typeof packageName !== 'string' || !packageName.trim()) {
      return fail(400, { 
        error: 'Package name is required',
        name: packageName 
      });
    }

    // Clean package name
    const cleanPackageName = packageName.trim();
    
    // Build URL
    let url = `https://registry.npmjs.org/${cleanPackageName}`;
    if (packageVersion && packageVersion.trim()) {
      url += `/${packageVersion.trim()}`;
    }

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 404) {
          return fail(404, {
            error: `Package "${cleanPackageName}" not found`,
            name: cleanPackageName
          });
        }
        
        return fail(response.status, {
          error: `Failed to fetch package data: ${response.statusText}`,
          name: cleanPackageName
        });
      }

      const packageData = await response.json();
      
      // Return the package data with success indicator
      return {
        success: true,
        ...packageData
      };
      
    } catch (error) {
      console.error('Error fetching package:', error);
      return fail(500, {
        error: 'Network error occurred while fetching package data',
        name: cleanPackageName
      });
    }
  },
};
