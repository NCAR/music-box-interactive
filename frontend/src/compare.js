const compareName = (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
const compareId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

export { compareName, compareId };
