import { configSchema, type Config, type Identity, type Item } from "./schema";
export function routeMatches(item: Item, path: string): boolean {
  const pattern = item.activePattern || item.url;
  if (!pattern || !pattern.startsWith("/")) return false;
  const clean = path.split(/[?#]/)[0].replace(/\/$/, "") || "/";
  const target = pattern.replace(/\/$/, "") || "/";
  if (item.activeMatch === "prefix") {
    const base = target.replace(/\/\*$/, "") || "/";
    return base === "/" || clean === base || clean.startsWith(base + "/");
  }
  if (item.activeMatch === "glob") return wildcardMatches(target, clean);
  return clean === target;
}
function wildcardMatches(pattern: string, value: string): boolean {
  let p = 0,
    v = 0,
    star = -1,
    retry = 0;
  while (v < value.length) {
    if (pattern[p] === value[v]) {
      p++;
      v++;
    } else if (pattern[p] === "*") {
      star = p++;
      retry = v;
    } else if (star >= 0) {
      p = star + 1;
      v = ++retry;
    } else return false;
  }
  while (pattern[p] === "*") p++;
  return p === pattern.length;
}
export function activeIds(items: Item[], path: string): Set<string> {
  const result = new Set<string>();
  const byId = new Map(items.map((i) => [i.id, i]));
  for (const item of items) {
    if (routeMatches(item, path)) {
      let current: Item | undefined = item;
      while (current && !result.has(current.id)) {
        result.add(current.id);
        current = current.parentId ? byId.get(current.parentId) : undefined;
      }
    }
  }
  return result;
}
export const allows = (roles: string[], identity: Identity) =>
  roles.length === 0 || roles.includes(identity.role);
export function filterConfig(
  config: Config,
  identity: Identity,
): Config | null {
  if (!allows(config.roles, identity)) return null;
  const { users, groups } = config.assignments;
  if (
    (users.length || groups.length) &&
    !users.includes(identity.id) &&
    !groups.some((g) => identity.groups.includes(g))
  )
    return null;
  const sections = config.sections.filter(
    (s) => s.enabled && allows(s.roles, identity),
  );
  const candidates = config.items.filter(
    (i) =>
      !i.archived &&
      i.visible &&
      allows(i.roles, identity) &&
      sections.some((s) => s.id === i.sectionId),
  );
  const all = new Map(candidates.map((i) => [i.id, i]));
  const items = candidates.filter((i) => {
    let p = i;
    const seen = new Set<string>();
    while (p.parentId) {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      const parent = all.get(p.parentId);
      if (!parent) return false;
      p = parent;
    }
    return true;
  });
  return {
    ...config,
    roles: [],
    assignments: { users: [], groups: [] },
    sections: sections.map((s) => ({ ...s, roles: [] })),
    items: items.map((i) => ({ ...i, roles: [] })),
  };
}
export function descendants(items: Item[], id: string): Set<string> {
  const ids = new Set([id]);
  let size = 0;
  while (size !== ids.size) {
    size = ids.size;
    for (const item of items)
      if (item.parentId && ids.has(item.parentId)) ids.add(item.id);
  }
  return ids;
}
export function moveItem(
  config: Config,
  id: string,
  sectionId: string,
  parentId: string | null,
  index: number,
): Config {
  const copy = structuredClone(config);
  const item = copy.items.find((i) => i.id === id);
  if (!item) throw new Error("Item not found");
  const subtree = descendants(copy.items, id);
  if (parentId && subtree.has(parentId))
    throw new Error("Cannot nest an item inside itself");
  item.parentId = parentId;
  for (const node of copy.items)
    if (subtree.has(node.id)) node.sectionId = sectionId;
  const siblings = copy.items
    .filter(
      (i) =>
        i.id !== id && i.sectionId === sectionId && i.parentId === parentId,
    )
    .sort((a, b) => a.order - b.order);
  siblings.splice(Math.max(0, Math.min(index, siblings.length)), 0, item);
  siblings.forEach((i, n) => (i.order = n));
  return configSchema.parse(copy);
}
export function duplicateItem(config: Config, id: string): Config {
  const copy = structuredClone(config);
  const subtree = descendants(copy.items, id);
  const nodes = copy.items.filter((i) => subtree.has(i.id));
  const ids = new Map(nodes.map((i) => [i.id, crypto.randomUUID()]));
  for (const node of nodes)
    copy.items.push({
      ...node,
      id: ids.get(node.id)!,
      parentId: node.parentId ? ids.get(node.parentId) || node.parentId : null,
      name: node.name + "-copy",
      label: node.id === id ? node.label + " copy" : node.label,
      order: node.order + 1,
    });
  return configSchema.parse(copy);
}
