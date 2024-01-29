export const actions = {
  default: async ({ request }) => {
    const formData = await request.formData();
    const packageName = formData.get('package-name');

    const response = await fetch(`https://registry.npmjs.org/` + packageName);
    return response.json();
  },
};