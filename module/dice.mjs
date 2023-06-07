export function D20Check({
  modifiers = null,
  rollData = null,
  advantage = 0, 
  flavor = ""
} = {}) {
  // Determine advantage
  let baseDice = "1d20"
  if (advantage === 1) {
    baseDice = "2d20kh1";
  } else if (advantage === -1) {
    baseDice = "2d20kl1";
  }
  // Build formula
  let rollFormula = `${baseDice}`;
  for (let i = 0; i < modifiers.length; i++) {
    rollFormula += ` + ${modifiers[i]}`;
  }
  console.log(`Trying formula: ${rollFormula}`)
  // Build chat message info
  let messageData = {
    speaker: ChatMessage.getSpeaker(),
    rollMode: game.settings.get('core','rollMode'),
    flavor: flavor
  };
  // Roll
  const roll = new Roll(rollFormula, rollData);
  roll.toMessage(messageData);
  return roll;
}

export async function damageRoll({
  dice = null,
  modifiers = null,
  rollData = null,
  critical = false, 
  criticalBonusDamage = null,
  flavor = "",
} = {}) {
  console.log(`Rolling ${dice} + ${modifiers}`)
  // Build formula
  let rollFormula = dice;
  
  if (critical) {
    console.log("CRIT!");  
    rollFormula += ` +  ${criticalBonusDamage}`;
  }
  for (let i = 0; i < modifiers.length; i++) {
    rollFormula += ` + ${modifiers[i]}`;
  }
  // Build chat message info
  let messageData = {
    speaker: ChatMessage.getSpeaker(),
    rollMode: game.settings.get('core','rollMode'),
    flavor: flavor
  };
  // Roll
  const roll = new Roll(rollFormula, rollData);
  roll.toMessage(messageData);
  return roll;
}