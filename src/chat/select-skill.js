const { listInstalledSkills } = require('../install');

function toSkillLabel(skill) {
  return `${skill.id}@${skill.version}`;
}

async function listSkillsForSelection(storeRoot) {
  const skills = await listInstalledSkills({ storeRoot });

  if (skills.length === 0) {
    return {
      skills: [],
      lines: ['No installed skills. Install one, then run /skill again.'],
    };
  }

  return {
    skills,
    lines: [
      'Installed skills:',
      ...skills.map((skill) => `- ${toSkillLabel(skill)}`),
      'Select by exact skill id or id@version:',
    ],
  };
}

function findSelectedSkill(input, skills) {
  const trimmed = input.trim();
  return (
    skills.find((skill) => `${skill.id}@${skill.version}` === trimmed) ||
    skills.find((skill) => skill.id === trimmed) ||
    null
  );
}

module.exports = {
  findSelectedSkill,
  listSkillsForSelection,
  toSkillLabel,
};
