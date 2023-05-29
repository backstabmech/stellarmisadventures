export function D20Check({
    actionValue = null,
    advantage = 0 } = {}) {

    let baseDice = "1d20"
    if (advantage === 1) {
        baseDice = "2d20kh1";
    } else if (advantage === -1) {
        baseDice = "2d20kl1";
    }

    let rollFormula = `${baseDice} + @actionValue`;
    let rollData = {
        actionValue: actionValue
    };
    let messageData = {
        speaker: ChatMessage.getSpeaker()
    };
    const roll = new Roll(rollFormula, rollData);
    /*
    roll.toMessage({
        speaker: speaker,
        rollMode: rollMode,
        flavor: label,
    })*/
    return roll;
}