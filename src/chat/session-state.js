function createSessionState() {
  return {
    activeSkill: null,
    pendingSkillSelection: null,
    history: [],
  };
}

function setActiveSkill(state, skill) {
  state.activeSkill = skill;
  state.pendingSkillSelection = null;
  state.history = [];
}

function setPendingSkillSelection(state, skills) {
  state.pendingSkillSelection = skills;
}

function clearPendingSkillSelection(state) {
  state.pendingSkillSelection = null;
}

function appendHistoryEntry(state, entry) {
  state.history.push(entry);
}

function resetSkillSession(state) {
  state.history = [];
}

module.exports = {
  appendHistoryEntry,
  clearPendingSkillSelection,
  createSessionState,
  resetSkillSession,
  setActiveSkill,
  setPendingSkillSelection,
};
