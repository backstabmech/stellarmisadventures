export const ADV_MODE = {
  ADVANTAGE: 1,
  NORMAL: 0,
  DISADVANTAGE: -1
}

export async function D20Check({
  speaker = null,
  checkType = "Ability Check",
  modifiers = null,
  rollData = null,
  advantage = 0,
  criticalThreshold = 21,
  showDialog = true,
  flavor = ""
} = {}) {
  let bonus = null;
  if (showDialog) {
    const checkOptions = await GetD20CheckOptions(checkType);
    // Stop if dialog is closed
    if (checkOptions.cancelled) return;
    // Proccess bonus modifiers
    if (checkOptions.modifiers) {
      const r = new Roll(checkOptions.modifiers, rollData);
      // Add a plus if needed
      if ( !(r.terms[0] instanceof OperatorTerm) ){
        bonus = "+"; 
      } else {
        bonus = "";
      }
      bonus += r.formula;
    }
    advantage = checkOptions.advantage;
  }
  // Determine advantage
  let baseDice = "1d20"
  if (advantage === 1) {
    baseDice = "2d20kh1";
  } else if (advantage === -1) {
    baseDice = "2d20kl1";
  }
  // Build formula
  let rollFormula = `${baseDice}`;
  if (modifiers) {
    for (let i = 0; i < modifiers.length; i++) {
      rollFormula += ` + ${modifiers[i]}`;
    }
  }
  if (bonus) rollFormula += bonus;

  // Build chat message info
  let messageData = {
    speaker: speaker ? speaker : ChatMessage.getSpeaker(),
    rollMode: game.settings.get('core','rollMode'),
    flavor: flavor
  };
  // Roll
  const roll = new Roll(rollFormula, rollData);
  roll.toMessage(messageData);
  // Record criticals for highlighting No highlighting if critThreshold is 21
  roll.options.isCritSuccess = roll.dice[0].total >= criticalThreshold;
  roll.options.isCritFail = (criticalThreshold != 21 && roll.dice[0].total == 1);
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
  // Build formula
  let rollFormula = dice;
  
  for (let i = 0; i < modifiers.length; i++) {
    rollFormula += ` + ${modifiers[i]}`;
  }

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
  // Build chat message info
  let messageData = {
    speaker: ChatMessage.getSpeaker(),
    rollMode: game.settings.get('core','rollMode'),
    flavor: flavor
  };
  roll.toMessage(messageData);
  return roll;
}
/**
 * Proccess a roll's formula so it can be easily modified.
 * @param {Roll} roll The roll to preprocess
 */
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

async function GetD20CheckOptions(checkType) {
  const template = "systems/stellarmisadventures/templates/apps/ability-check-dialog.hbs";
  const html = await renderTemplate(template, {})
  
  return new Promise(resolve => {
    const data = {
      title: checkType,
      content: html,
      buttons: {
        advantage: {
          label: "Advantage",
          callback: html => resolve(_onD20DialogSubmit(html[0].querySelector("form"), ADV_MODE.ADVANTAGE))
        },
        normal: {
          label: "Normal",
          callback: html => resolve(_onD20DialogSubmit(html[0].querySelector("form"), ADV_MODE.NORMAL))
        },
        disadvantage: {
          label: "Disadvantage",
          callback: html => resolve(_onD20DialogSubmit(html[0].querySelector("form"), ADV_MODE.DISADVANTAGE))
        }
      },
      default: "normal",
      close: () => resolve({cancelled: true})
    };
    new Dialog(data, null).render(true)
  });
}

function _onD20DialogSubmit(form, advantageMode) {
  return {
    modifiers: form.modifiers.value,
    advantage: advantageMode
  }
}