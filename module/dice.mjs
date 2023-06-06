export function D20Check({
    modifiers = null,
    rollData = null,
    advantage = 0, 
    flavor = ""} = {}) {

    let baseDice = "1d20"
    if (advantage === 1) {
        baseDice = "2d20kh1";
    } else if (advantage === -1) {
        baseDice = "2d20kl1";
    }

    let rollFormula = `${baseDice}`;
    for (let i = 0; i < modifiers.length; i++) {
        rollFormula += ` + ${modifiers[i]}`;
    }
    console.log(`Trying formula: ${rollFormula}`)
    let messageData = {
        speaker: ChatMessage.getSpeaker(),
        rollMode: game.settings.get('core','rollMode'),
        flavor: flavor
    };
    const roll = new Roll(rollFormula, rollData);
    
    roll.toMessage(messageData);
    return roll;
}