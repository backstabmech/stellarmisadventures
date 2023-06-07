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
  let roll = new Roll(rollFormula, rollData);
  preprocessDamageRoll(roll);
  // Apply critical hit
  if (critical) {
    for ( let [i, term] of roll.terms.entries()) {
      if ( term instanceof DiceTerm) {
        // multiply # of dice by 2
        term.alter(2)
      }
    }
    // Add bonus critical damage AFTER multiplier
    // Add extra critical damage term
    if ( criticalBonusDamage ) {
      const extra = new Roll(criticalBonusDamage, rollData);
      if ( !(extra.terms[0] instanceof OperatorTerm) ) roll.terms.push(new OperatorTerm({operator: "+"}));
      roll.terms.push(...extra.terms);
    }
    roll._formula = roll.constructor.getFormula(roll.terms);
  }
  //console.log(roll.formula)
  roll.toMessage(messageData);
  return roll;
}

function preprocessDamageRoll(roll) {
  for ( let [i, term] of roll.terms.entries() ) {
    const nextTerm = roll.terms[i + 1];
    const prevTerm = roll.terms[i - 1];
    
    // Convert shorthand dX terms to 1dX preemptively to allow them to be appropriately doubled for criticals
    if ( (term instanceof StringTerm) && /^d\d+/.test(term.term) && !(prevTerm instanceof ParentheticalTerm) ) {
      const formula = `1${term.term}`;
      const newTerm = new Roll(formula).terms[0];
      roll.terms.splice(i, 1, newTerm);
      term = newTerm;
    }

    // Merge parenthetical terms that follow string terms to build a dice term (to allow criticals)
    else if ( (term instanceof ParentheticalTerm) && (prevTerm instanceof StringTerm)
      && prevTerm.term.match(/^[0-9]*d$/)) {
      if ( term.isDeterministic ) {
        let newFormula = `${prevTerm.term}${term.evaluate().total}`;
        let deleteCount = 2;

        // Merge in any roll modifiers
        if ( nextTerm instanceof StringTerm ) {
          newFormula += nextTerm.term;
          deleteCount += 1;
        }
        const newTerm = (new Roll(newFormula)).terms[0];
        roll.terms.splice(i - 1, deleteCount, newTerm);
        term = newTerm;
      }
    }
    // Merge any parenthetical terms followed by string terms
    else if ( (term instanceof ParentheticalTerm || term instanceof MathTerm) && (nextTerm instanceof StringTerm)
      && nextTerm.term.match(/^d[0-9]*$/)) {
      if ( term.isDeterministic ) {
        const newFormula = `${term.evaluate().total}${nextTerm.term}`;
        const newTerm = (new Roll(newFormula)).terms[0];
        roll.terms.splice(i, 2, newTerm);
        term = newTerm;
      }
    } 
  }
  // Re-compile the underlying formula
  roll._formula = roll.constructor.getFormula(roll.terms);
}