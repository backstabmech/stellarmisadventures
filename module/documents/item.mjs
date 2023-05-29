/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class StellarMisadventuresItem extends Item {
  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
    // As with the actor class, items are documents that can have their data
    // preparation methods overridden (such as prepareBaseData()).
    super.prepareData();
  }

  /**
   * Prepare a data object which is passed to any Roll formulas which are created related to this Item
   * @private
   */
   getRollData() {
    // If present, return the actor's roll data.
    if ( !this.actor ) return null;
    const rollData = this.actor.getRollData();
    // Grab the item's system data as well.
    rollData.item = foundry.utils.deepClone(this.system);

    return rollData;
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  async roll() {

    // Initialize chat data.
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const rollMode = game.settings.get('core', 'rollMode');
    const label = `[${this.type}] ${this.name}`;
    // Set card data
    const cardData = {
      actor: this.actor,
      tokenId: this.actor.token?.uuid || null,
      item: this,
      data: await this.getChatData(),
      labels: this.labels,
      hasAttack: this.hasAttack,
      isHealing: this.isHealing,
      hasDamage: this.hasDamage,
      //isVersatile: this.isVersatile,
      //isSpell: this.type === "spell",
      hasSave: this.hasSave,
      //hasAreaTarget: this.hasAreaTarget,
      //isTool: this.type === "tool",
      hasAbilityCheck: this.hasAbilityCheck
    }

    if (this.type == 'weapon') {
      ChatMessage.create({
        speaker: speaker,
        rollMode: rollMode,
        flavor: label,
        content: await renderTemplate("systems/stellarmisadventures/templates/item/parts/item-card.hbs", cardData)
      });
    } else if (!this.system.formula) {
      // If there's no roll data, send a chat message.
      ChatMessage.create({
        speaker: speaker,
        rollMode: rollMode,
        flavor: label,
        content: this.system.description ?? ''
      });
    } else {
      // Otherwise, create a roll and send a chat message from it.
      // Retrieve roll data.
      const rollData = this.getRollData();

      // Invoke the roll and submit it to chat.
      const roll = new Roll(rollData.this.formula, rollData);
      // If you need to store the value first, uncomment the next line.
      // let result = await roll.roll({async: true});
      roll.toMessage({
        speaker: speaker,
        rollMode: rollMode,
        flavor: label,
      });
      return roll;
    }
  }

  /**
   * Prepare an object of chat data used to display a card for the Item in the chat log.
   * @param {object} htmlOptions    Options used by the TextEditor.enrichHTML function.
   * @returns {object}              An object of chat data to render.
   */
  async getChatData(htmlOptions={}) {
    const data = this.toObject().system;

    // Rich text description
    data.description = await TextEditor.enrichHTML(data.description, {
      async: true,
      relativeTo: this,
      rollData: this.getRollData(),
      ...htmlOptions
    });

    // Type specific properties
    // TODO: investigate how this works
    data.properties = [
      ...this.system.chatProperties ?? [],
      ...this.system.equippableItemChatProperties ?? [],
      ...this.system.activatedEffectChatProperties ?? []
    ].filter(p => p);

    return data;
  }

  // Getters primarily used by chat cards

  get hasAttack() {
    return this.system.hasAttack ?? false;
  }
  get isHealing() {
    return this.system.isHealing ?? false;
  }
  get hasDamage() {
    return this.system.hasDamage ?? false;
  }
  get hasSave() {
    return this.system.hasSave ?? false;
  }
  get hasAbiltiyCheck() {
    return this.system.hasAbiltiyCheck ?? false;
  }
}
