const {
  installSkillPackage,
  listInstalledSkills,
  uninstallSkillPackage,
} = require('./install-skill-package');
const { inspectSkillPackage } = require('./inspect-skill-package');
const { validateSkillPackage } = require('./validate-skill-package');

module.exports = {
  installSkillPackage,
  inspectSkillPackage,
  listInstalledSkills,
  uninstallSkillPackage,
  validateSkillPackage,
};
