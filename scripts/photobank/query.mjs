import { filterAssets, getAsset, loadRegistry, projectAsset } from "./lib/registry.mjs";
import { resolvePaths, resolveRoot } from "./lib/paths.mjs";

const root = resolveRoot();
const registry = loadRegistry(resolvePaths(root));
const positional = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const flag = (name) => {
  const found = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : "";
};

if (positional[0]) {
  const asset = projectAsset(getAsset(registry, positional[0]));
  if (!asset) {
    console.error(`Нет кадра ${positional[0]}`);
    process.exit(1);
  }
  console.log(JSON.stringify(asset, null, 2));
} else {
  const assets = filterAssets(registry, {
    edition: flag("edition"),
    category: flag("category"),
    person: flag("person"),
    status: flag("status"),
    placement: flag("placement"),
  }).map(projectAsset);
  console.log(JSON.stringify({ count: assets.length, assets }, null, 2));
}
