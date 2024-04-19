import { STELLARMISADVENTURES } from "../helpers/config.mjs";
import simplifyRollFormula from "../helpers/simplify-roll-formula.mjs"
import * as Dice from "../dice.mjs"
import * as Dialogs from "../applications/dialogs.mjs"
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
      if (this.system.attackType === "" && (this.system.weaponType) in STELLARMISADVENTURES.weaponTypes) {
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
    if (this.hasDamage) {
      // Assemble damage formula, minus actor stuff
      const parts = [];
      parts.push(this.system.damageFormula)
      // Damaged property
      if (["weapon"].includes(this.type) && this.system.properties["dama"]) {
        parts.push("-1");
      }
      // Add abl if owned and a weapon with an abl
      if (this.isOwned && this.system.weaponType && this.system.ability) {
        parts.push(`@${this.system.ability}`);
      }
      const roll = new Roll(parts.join("+"), this.getRollData());
     
      this.labels.damage = `${simplifyRollFormula(roll.formula)}`; 
      if (this.system.damageType) this.labels.damage += ` ${this.system.damageType}`;
      else this.labels.damage += " damage";
    }
    
    // prep labels for shields
    if (["shield"].includes(this.type)) {
      this.labels.shield = `${this.system.shieldMax} Shield`;
      this.labels.regen = `${this.system.shieldRegen} Regen`;
    }
    // labels for gadgets
    if (["gadget"].includes(this.type)){
      this.labels.tier = `Tier ${this.system.gadgetTier}`;
    }


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
    // TODO: get gadgetTier here
    const tier = parseInt(card.dataset.tier) || null;
    if (!!tier) console.log(`Tier ${tier}`);

    let targets;
    switch ( action ) {
      case "attack":
        await item.rollAttack( {
          event: event,
        });
        break;
      case "damageFormula":
      case "damageAlternate":
        if (!!tier) console.log(`Tier ${tier}`);
        await item.rollDamage( {
          event: event,
          damageAlternate: action === "damageAlternate",
          tier: tier
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
          //const speaker = token.document;
          console.log(token);
          console.log(speaker);

          await token.actor.rollSave(button.dataset.save, { event, speaker });
        }
        break;
      case "expendAmmo":
        item.expendAmmo(event);
        break;
      case "reload":
        item.reload(event);
        break;
    }

    button.disabled = false;
  }

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
    let item = this;
    // Initialize chat data.
    // Set card data


    // Ask for gadget tier and point consumption
    if (this.type === 'gadget') {
      let tier = null;
      const tierCosts = CONFIG.STELLARMISADVENTURES.gadgetTierCosts;
      // It would be great if the max was defined by the actor
      // Figure out what tiers are available
      let availableTiers = [];
      for (let i = this.system.gadgetTier; i < 6; i++) {
        availableTiers.push({
          tier: i,
          cost: tierCosts[i],
          isDefault: !!(i == this.system.gadgetTier),
          label: CONFIG.STELLARMISADVENTURES.gadgetTiers[i]
        });
      }
      console.log(availableTiers);
      console.log(this.system.gadgetTier);
      const dialogOptions = {
        availableTiers
      }
      const useOptions = await Dialogs.GetGadgetUseOptions(dialogOptions);
      if (useOptions.cancelled) return;

      
      // Expend gadget points if needed
      if (useOptions.expend) {
        const cost = tierCosts[useOptions.gadgetTier]
        const points = this.actor.system.gadgetry.points.value;
        if (points < cost) {
          // Display warning if too expensive
          return ui.notifications.warn(game.i18n.localize("STELLARMISADVENTURES.ActionWarningGadgetTooExpensive"));
        } else {
          this.actor.update({"system.gadgetry.points.value": points - cost})
        }
      }
      tier = useOptions.gadgetTier;
      // upcast by creating a copy of this item at a higher tier
      if (tier !== this.system.gadgetTier) {
        item = item.clone({"system.gadgetTier": tier}, {keepId: true});
        item.prepareData();
        item.prepareFinalAttributes();
      }
    }

    item.displayCard();
  }

  async displayCard() {
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const rollMode = game.settings.get('core', 'rollMode');
   
    const cardData = {
      actor: this.actor,
      tokenId: this.actor.token?.uuid || null,
      item: this,
      data: await this.getChatData(),
      labels: this.labels,
      hasAttack: this.hasAttack,
      isHealing: this.isHealing,
      hasDamage: this.hasDamage,
      isGadget: this.type === "gadget",
      hasSave: this.hasSave,
      //hasAreaTarget: this.hasAreaTarget,
      //isTool: this.type === "tool",
      hasAmmo: !!(this.system.ammoMax > 0),
      hasAbilityiCheck: this.hasAbilityCheck
    }
    
    // Add to properties labels
    if (this.type == "gadget") {
      cardData.data.properties.unshift(`Tier ${this.system.gadgetTier}`)
    }

    const chatData = {
      user: game.user.id,
      content: await renderTemplate("systems/stellarmisadventures/templates/item/parts/item-card.hbs", cardData),
      flavor: this.system.chatFlavor || this.name,
      speaker: speaker,
      flags: {"core.canPopOut": true}
    };
  
    ChatMessage.applyRollMode(chatData, rollMode)
    
    return ChatMessage.create(chatData);
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
    // Set chat label.
    const label = `[Attack] ${this.name}`;
    
    // Get attack bonus + rolldata
    let attackBonus = this.getAttackToHit();
    const attackRoll = {
      modifiers: attackBonus.parts,
      rollData: attackBonus.rollData,
      criticalThreshold: this.getCritThreshold(),
      flavor: label,
      showDialog: !(event.event?.shiftKey)
    }
    Dice.D20Check(attackRoll)
  }
  /**
   * Roll the item's damage.
   * @private
   */
  async rollDamage(event) {
    if (this.system.damageFormula) {
      const systemData = this.system;
      const actorData = this.actor.system;
      // Initialize chat data.
      const label = `[${this.isHealing ? "Healing" : "Damage"}] ${this.name}`;
      // Retrieve roll data.
      const rollData = this.getRollData();
      var damageDice = event.damageAlternate ? systemData.damageAlternate : systemData.damageFormula

      let mods = [];
      if (systemData.weaponType && systemData.ability) {
        mods.push(`@${systemData.ability}`);
      }
      // Damaged property
      if (["weapon"].includes(this.type) && systemData.properties["dama"]) {
        mods.push("-1");
      }
      
      // upcast
      if (this.type === "gadget" && event.tier > systemData.gadgetTier) {
        // crappy simple way
        const upcast = event.tier - systemData.gadgetTier;
        for (let i = 0; i < upcast; i++) {
          damageDice += `+ ${systemData.damageScaling}`;            
        }
      }

      const damageRoll = {
        dice: damageDice,
        modifiers: mods,
        rollData,
        critical: !!(event.event?.altKey),
        criticalBonusDamage: systemData.critical.damage,
        flavor: label
      };
      return Dice.damageRoll(damageRoll);
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

  async expendAmmo(event) {
    const systemData = this.system;
    if (systemData.ammoLoaded < systemData.ammoUsage) {
      const warn = game.i18n.format("STELLARMISADVENTURES.ActionWarningNoAmmo");
      return ui.notifications.warn(warn);
    }
    const newVal = systemData.ammoLoaded - systemData.ammoUsage;
    this.update({"system.ammoLoaded": newVal});
  }

  async reload(event) {
    const systemData = this.system;
    if (!systemData.ammoMax) {
      const err = game.i18n.format("STELLARMISADVENTURES.ActionWarningAmmoMisconfig", {item: this.id});
      return ui.notifications.error(err);
    }
    this.update({"system.ammoLoaded": systemData.ammoMax});
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

    // Properties
    let props = [
      ...this.chatProperties ?? []
    ];
    if (this.system.properties) {
      for ( const [k, v] of Object.entries(this.system.properties) ) {
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
    return this.hasDamage && ["heal"].includes(this.system.damageType);
  }
  get hasDamage() {
    return !!this.system.damageFormula;
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
  get isStack() {
    return (itemData.system.quantity > 1) ?? false;
  }
  get chatProperties() {
    let props = [];
    if (this.system.weaponType) props.push(CONFIG.STELLARMISADVENTURES.weaponTypes[this.system.weaponType]);
    else if (this.system.useTime) props.push(CONFIG.STELLARMISADVENTURES.useTimes[this.system.useTime]);
    if (this.system.range) props.push(this.system.range);
    if (this.system.damageType) props.push(CONFIG.STELLARMISADVENTURES.damageTypes[this.system.damageType]);
    return props;
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
      // Put a + at the start front if there is no operator 
      this.labels.toHit = !/^[+-]/.test(ab) ? `+ ${ab}` : ab;
    }
    
    // Take no further action for un-owned items
    if ( !this.isOwned ) return {rollData, parts};

    // Ability score modifier
    parts.push(`@${[this.system.ability]}`);
    // Add proficiency bonus if an explicit proficiency flag is present or for non-weapon features
    if (!["weapon"].includes(this.type) || this.system.proficient) {
      parts.push("@prof");
    }
    // Accurate property
    if (["weapon"].includes(this.type) && this.system.properties["accu"]) {
      parts.push("2");
    }
    // Damaged property
    if (["weapon"].includes(this.type) && this.system.properties["dama"]) {
      parts.push("-1");
    }
    // Condense the resulting attack bonus formula into a simplified label
    const roll = new Roll(parts.join("+"), rollData);
    const formula = simplifyRollFormula(roll.formula) || "0";
    // Update label
    this.labels.toHit = !/^[+-]/.test(formula) ? `+ ${formula}` : formula;
    return {rollData, parts};
  }
  getCritThreshold() {
    if ( !this.hasAttack) return null;
    let crit = this.system.critical.chance ?? 0;

    if (["weapon"].includes(this.type) && this.system.properties["prec"]) {
      crit += 1;
    }
    return 20 - crit;
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
        if (this.system.ability && actorData.abilities[this.system.ability].mod) {
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
