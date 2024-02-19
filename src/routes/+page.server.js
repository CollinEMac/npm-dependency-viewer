export const actions = {
  default: async ({ request }) => {
    const formData = await request.formData();
    const packageName = formData.get('package-name');
    const packageVersion = formData.get('package-version');
    let url = `https://registry.npmjs.org/` + packageName;

    if (!!packageVersion) {
      url = url + '/' + packageVersion;
    }

    const response = await fetch(url);
    return response.json();
  },
};