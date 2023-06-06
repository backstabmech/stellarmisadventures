import * as Dice from "../dice.mjs"
import simplifyRollFormula from "../helpers/simplify-roll-formula.mjs"
import { STELLARMISADVENTURES } from "../helpers/config.mjs";
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

  prepareDerivedData() {
    super.prepareDerivedData();
    this.labels = {};
    // Auto set attack type for weapon if blank
    if (this.type == "weapon") {
      if (this.system.attackType === "") {
        this.system.attackType = this.system.weaponType == "melee" ? "mwatk": "rwatk";
      }
    }
    // Final attribute prep for unowned items.
    // (owned items wait for actor.prepareData)
    if (!this.isOwned) this.prepareFinalAttributes();
  }

  prepareFinalAttributes() {
    if (this.type == "gadget" && this.actor) {
      // Auto-Proficency with gadgets
      if (this.actor.system.attributes?.level.prof) {
        this.system.proficient = true;
      }
      // Set ability to actor's gadgetry ability
      this.system.ability = this.actor.system.gadgetry.ability;
    }
    // Prepare damage label
    /*
    if (!("actionType" in this.system)) {
      let dmg = this.system.damage || {};
      if ( dmg.parts ) {
        const types = CONFIG.STELLARMISADVENTURES.damageTypes;
        this.labels.damage = dmg.parts.map(d => d[0]).join(" + ").replace(/\+ -/g, "- ");
        this.labels.damageTypes = dmg.parts.map(d => types[d[1]]).join(", ");
      }
    }*/
    // Save
    this.getSaveDC();
    // To Hit
    this.getAttackToHit();
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
  /* -------------------------------------------- */
  /*  Chat Message Helpers                        */
  /* -------------------------------------------- */

  /**
   * Apply listeners to chat messages.
   * @param {HTML} html  Rendered chat message.
   */
  static chatListeners(html) {
    html.on("click", ".card-buttons button", this._onChatCardAction.bind(this));
    html.on("click", ".item-name", this._onChatCardToggleContent.bind(this));
  }
  /**
   * Handle execution of a chat card action via a click event on one of the card buttons
   * @param {Event} event       The originating click event
   * @returns {Promise}         A promise which resolves once the handler workflow is complete
   * @private
   */
  static async _onChatCardAction(event) {
    event.preventDefault();
    // Extract card data
    const button = event.currentTarget;
    button.disabled = true;
    const card = button.closest(".chat-card");
    const messageId = card.closest(".message").dataset.messageId;
    const message = game.messages.get(messageId);
    const action = button.dataset.action;

    // Recover the actor for the chat card
    const actor = await this._getChatCardActor(card);
    if ( !actor ) return;

    // Validate permission to proceed with the roll
    // (Stop immediately unless (targeted and a save action) or GM or Owner)
    const isTargetted = action === "save";
    if ( !( isTargetted || game.user.isGM || actor.isOwner ) ) return;
    
    // Get the Item from stored flag data or by the item ID on the Actor
    const storedData = message.getFlag("stellarmisadventures", "itemData");
    const item = storedData ? new this(storedData, {parent: actor}) : actor.items.get(card.dataset.itemId);
    if ( !item ) {
      const err = game.i18n.format("STELLARMISADVENTURES.ActionWarningNoItem", {item: card.dataset.itemId, name: actor.name});
      return ui.notifications.error(err);
    }
    // TODO: get gadgetTier here?
    console.log("Card button clicked!");

    let targets;
    switch ( action ) {
      case "attack":
        await item.rollAttack( {
          event: event,
          //gadgetTier: gadgetTier
        });
        break;
      case "damageFormula":
      case "damageAlternate":
        await item.rollDamage( {
          event: event,
          damageAlternate: action === "damageAlternate"
          //gadgetTier: gadgetTier,
        });
        break;
      case "formula":
        console.log("Rolled Formula");
        await item.rollFormula(event);
        break;
      case "save":
        targets = this._getChatCardTargets(card);
        for ( let token of targets ) {
          const speaker = ChatMessage.getSpeaker({scene: canvas.scene, token: token.document});
          await token.actor.rollSave(button.dataset.save, { event, speaker });
        }

    }

    button.disabled = false;
  }
  /* -------------------------------------------- */

  /**
   * Handle toggling the visibility of chat card content when the name is clicked
   * @param {Event} event   The originating click event
   * @private
   */
  static _onChatCardToggleContent(event) {
    event.preventDefault();
    const header = event.currentTarget;
    const card = header.closest(".chat-card");
    const content = card.querySelector(".card-content");
    content.style.display = content.style.display === "none" ? "block" : "none";
  }

  /* -------------------------------------------- */
  
   /**
   * Get the Actor which is the author of a chat card
   * @param {HTMLElement} card    The chat card being used
   * @returns {Actor|null}        The Actor document or null
   * @private
   */
   static async _getChatCardActor(card) {

    // Case 1 - a synthetic actor from a Token
    if ( card.dataset.tokenId ) {
      const token = await fromUuid(card.dataset.tokenId);
      if ( !token ) return null;
      return token.actor;
    }

    // Case 2 - use Actor ID directory
    const actorId = card.dataset.actorId;
    return game.actors.get(actorId) || null;
  }

  /* -------------------------------------------- */

  static _getChatCardTargets(card) {
    let targets = canvas.tokens.controlled.filter(t => !!t.actor);
    if ( !targets.length && game.user.character ) targets = targets.concat(game.user.character.getActiveTokens());
    if ( !targets.length ) ui.notifications.warn(game.i18n.localize("STELLARMISADVENTURES.ActionWarningNoToken"));
    return targets;
  }

  /* -------------------------------------------- */


  /**
   * Send chat card on click.
   * @private
   */
  async use() {
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
      //isSpell: this.type === "spell",
      hasSave: this.hasSave,
      //hasAreaTarget: this.hasAreaTarget,
      //isTool: this.type === "tool",
      hasAbilityCheck: this.hasAbilityCheck
    }

    const chatData = {
      user: game.user.id,
      content: await renderTemplate("systems/stellarmisadventures/templates/item/parts/item-card.hbs", cardData),
      flavor: this.system.chatFlavor || this.name,
      speaker: speaker,
      flags: {"core.canPopOut": true}
    };

    // Merge in the flags from options argument
    //chatData.flags = foundry.utils.mergeObject(chatData.flags, options.flags);
    
    ChatMessage.applyRollMode(chatData, game.settings.get("core", "rollMode"))
    
    ChatMessage.create(chatData);
  }

  /* -------------------------------------------- */
  /*  Item Rolls - Attack, Damage, Saves, Checks  */
  /* -------------------------------------------- */
  
  /**
   * Roll the item's attack.
   * @param {Event} event   The originating click event
   * @private
   */
  async rollAttack(event) {
    // Initialize chat data.
    const systemData = this.system;
    const actorData = this.actor.system;
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const rollMode = game.settings.get('core', 'rollMode');
    const label = `[Attack] ${this.name}`;
    // Retrieve roll data.
    const rollData = this.getRollData();

    // Build roll formula
    let rollFormula = `d20 + ${actorData[systemData.ability].mod}`;
    if (systemData.proficient) {
      rollFormula += " + @prof";
    }
    if (systemData.properties && systemData.properties["accu"] === true) {
      rollFormula += " + 2"
    }
    // TODO: Precise crit threshold bonus here?

    // Invoke the roll and submit it to chat.
    const roll = new Roll(rollFormula, rollData);
    roll.toMessage({
      speaker: speaker,
      rollMode: rollMode,
      flavor: label,
    });
    return roll;
  }
  /**
   * Roll the item's damage.
   * @param {Event} event   The originating click event
   * @private
   */
  async rollDamage(event) {
    if (this.system.damageFormula) {
      const systemData = this.system;
      const actorData = this.actor.system;
      // Initialize chat data.
      const speaker = ChatMessage.getSpeaker({ actor: this.actor });
      const rollMode = game.settings.get('core', 'rollMode');
      const label = `[Damage] ${this.name}`;
      // Retrieve roll data.
      const rollData = this.getRollData();

      let rollFormula = event.damageAlternate ? systemData.damageAlternate : systemData.damageFormula;
      if (systemData.weaponType) {
        rollFormula += ` + ${actorData[systemData.ability]}`
      }
      // Invoke the roll and submit it to chat.
      const roll = new Roll(rollFormula, rollData);
      roll.toMessage({
        speaker: speaker,
        rollMode: rollMode,
        flavor: label,
      });
      return roll;
    }
    return null;
  }

  async rollFormula(event) {
    if (this.system.formula) {
      const actorData = this.actor.system;
      // Initialize chat data.
      const speaker = ChatMessage.getSpeaker({ actor: this.actor });
      const rollMode = game.settings.get('core', 'rollMode');
      const label = `[Other] ${this.name}`;
      // Retrieve roll data.
      const rollData = this.getRollData();     
      // Create a roll and send a chat message from it.
      const roll = new Roll(this.system.formula, rollData);
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
    /*
    data.properties = [
      ...this.system.chatProperties ?? [],
      ...this.system.equippableItemChatProperties ?? [],
      ...this.system.activatedEffectChatProperties ?? []
    ];*/
    
    let props = []; 
    if (data.properties) {
      for ( const [k, v] of Object.entries(data.properties) ) {
        if ( v === true ) props.push(CONFIG.STELLARMISADVENTURES.weaponProperties[k]);
      }
    }
    data.properties = props;
    return data;
  }

  // Getters primarily used by chat cards

  get hasAttack() {
    return ["mwatk","rwatk","mgatk","rgatk"].includes(this.system.attackType);
  }
  get isHealing() {
    return false;
  }
  get hasDamage() {
    return false;
  }
  get hasSave() {
    return !!(this.system.save && this.system.save.defence);
  }
  get hasAbiltiyCheck() {
    // Support for child(?) class overides
    //return this.system.hasAbiltiyCheck ?? false;
    return false;
  }
  get isFlatDC() {
    return (this.system.save?.scaling === "flat") ?? false;
  }

 /**
   * Update a label to the Item detailing its total to hit bonus:
   */
  getAttackToHit() {
    if ( !this.hasAttack) return null;
    const rollData = this.getRollData();
    const parts = [];

    const ab = this.system.attackBonus;
    if (ab) {
      parts.push(ab);
      this.labels.toHit = !/^[+-]/.test(ab) ? `+ ${ab}` : ab;
    }
    
    // Take no further action for un-owned items
    if ( !this.isOwned ) return {rollData, parts};

    // Ability score modifier
    parts.push("@mod");
    // Add proficiency bonus if an explicit proficiency flag is present or for non-weapon features
    if (!["weapon"].includes(this.type) || this.system.proficient) {
      parts.push("@prof");
    }

    // Condense the resulting attack bonus formula into a simplified label
    const roll = new Roll(parts.join("+"), rollData);
    const formula = simplifyRollFormula(roll.formula) || "0";
    // Update label
    this.labels.toHit = !/^[+-]/.test(formula) ? `+ ${formula}` : formula;
    console.log(`Attack bonus: ${this.labels.toHit}`)
    return {rollData, parts};
  }
  /**
   * Update the derived spell DC for an item that requires a saving throw.
   * @returns {number|null}
   */
  getSaveDC() {
    if ( !this.hasSave ) return null;
    const save = this.system.save;

    // Actor spell-DC based scaling
    if ( save.scaling === "gadget" ) {
      save.dc = this.isOwned ? this.actor.system.gadgetry.dc : null;
    }
    else if ( save.scaling === "attack" ) {
      // Set save based on attack bonus
      if (this.isOwned) {
        const actorData = this.actor.system;
        let bonus = this.system.attackBonus ?? 0;
        if (actorData.abilities[this.system.ability].mod) {
          bonus += actorData.abilities[this.system.ability].mod ?? 0;
        }
        if (this.system.proficient) {
          bonus += actorData.attributes.level.prof ?? 0;
        }
        save.dc = 8 + bonus;
      } else {
        save.dc = null;
      }
    }


    // Update save DC label e.g. DC 12 
    const def = game.i18n.format(CONFIG.STELLARMISADVENTURES.savesAbbr[save.defence]) ?? "";
    this.labels.save = game.i18n.format("STELLARMISADVENTURES.SaveDC", {dc: save.dc || "", defence: def});
    //console.log(`Save Label: ${this.labels.save}`);
    return save.dc;
  }
}
