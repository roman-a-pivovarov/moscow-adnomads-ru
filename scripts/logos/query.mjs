import { resolvePaths } from "./lib/paths.mjs";
import { loadRegistry } from "./lib/registry.mjs";

const paths = resolvePaths();
const registry = loadRegistry(paths);
if (!registry) {
  console.error("Реестр не найден");
  process.exit(1);
}

const query = process.argv[2] || "";
const orgs = registry.organizations.filter((org) => {
  if (!query) return true;
  if (query.startsWith("--missing")) {
    return !registry.candidates.some((item) => item.organization_id === org.organization_id && item.usable);
  }
  return org.organization_id === query || org.name.toLowerCase().includes(query.toLowerCase());
});

for (const org of orgs) {
  const files = registry.candidates.filter((item) => item.organization_id === org.organization_id);
  const editions = org.editions.map((item) => item.adnomads_id).join(", ");
  console.log(`${org.organization_id}\t${org.name}\t${editions}\tкандидатов: ${files.length}`);
  for (const file of files) {
    console.log(`  ${file.candidate_id}\t${file.source_type}\t${file.variant}\t${file.usable ? "usable" : "raw"}\t${file.prepared_path || file.raw_path}`);
  }
}
console.log(`Всего организаций: ${registry.organizations.length}. В выдаче: ${orgs.length}.`);
