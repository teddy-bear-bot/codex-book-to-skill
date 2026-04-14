const fs = require('node:fs/promises');
const path = require('node:path');

async function loadInputsSchema(activeSkill) {
  const manifestPath = path.join(activeSkill.installedPath, 'skill.json');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  const schemaFile = manifest.entrypoints?.inputs_schema_file || 'inputs.schema.json';
  const schemaPath = path.join(activeSkill.installedPath, schemaFile);
  const schema = JSON.parse(await fs.readFile(schemaPath, 'utf8'));
  return schema;
}

async function readSkillInputFieldSummary(activeSkill) {
  const schema = await loadInputsSchema(activeSkill);
  const fields = Object.keys(schema.properties || {});
  const required = Array.isArray(schema.required) ? schema.required : [];
  return {
    fields,
    required,
  };
}

module.exports = {
  readSkillInputFieldSummary,
};
