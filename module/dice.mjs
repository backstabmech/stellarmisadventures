export function AbilityCheck({
    actionValue = null,
    advantage = 0 } = {}) {

    if (advantage == 0) {
        let baseDice = "1d20"
    } else if (advantage == 1) {
        let baseDice = "2d20kh1"
    } else {
        let baseDice = "2d20kl1"
    }

    let rollFormula = `${baseDice} + @actionValue`;
    let rollData = {
        actionValue: actionValue
    };
    let messageData = {
        speaker: ChatMessage.getSpeaker()
    }
    new Roll(rollFormula, rollData).roll().toMessage(messageData);
}