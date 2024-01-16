import * as Dice from "../dice.mjs"
/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class StellarMisadventuresActor extends Actor {

  /** @override */
  prepareData() {
    // Prepare data for the actor. Calling the super version of this executes
    // the following, in order: data reset (to clear active effects),
    // prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
    // prepareDerivedData().
    super.prepareData();
    this.items.forEach(item => item.prepareFinalAttributes());
  }

  /** @override */
  prepareBaseData() {
    // Data modifications in this step occur before processing embedded
    // documents or derived data.
  }

  /**
   * @override
   * Augment the basic actor data with additional dynamic data. Typically,
   * you'll want to handle most of your calculated/derived data in this step.
   * Data calculated in this step should generally not exist in template.json
   * (such as ability modifiers rather than ability scores) and should be
   * available both inside and outside of character sheets (such as if an actor
   * is queried and has a roll executed directly from it).
   */
  prepareDerivedData() {
    const actorData = this;
    const systemData = actorData.system;
    const flags = actorData.flags.stellarmisadventures || {};

    
    // Separate methods for each Actor type (character, npc, etc.) to keep
    // things organized.
    this._prepareBaseData(actorData);
    this._prepareCharacterData(actorData);
    this._prepareNpcData(actorData);
    this._prepareArmorClass(actorData);
    this._prepareShield(actorData);
  }

  /**
   * Prepare type agnostic data
   */
  _prepareBaseData(actorData) {
    const systemData = actorData.system;
    // Loop through ability scores, and add their modifiers to our sheet output.
    for (let [key, ability] of Object.entries(systemData.abilities)) {
      // Calculate the modifier using d20 rules.
      ability.mod = Math.floor((ability.value - 10) / 2);
    }
    // Calculate saving throw modifiers
    // Set ability bonuses
    systemData.saves.reflex.abl = Math.max(systemData.abilities.dex.mod, systemData.abilities.int.mod);
    systemData.saves.fortitude.abl = Math.max(systemData.abilities.str.mod, systemData.abilities.end.mod);
    systemData.saves.will.abl = Math.max(systemData.abilities.per.mod, systemData.abilities.cha.mod);
    for (let [key, save] of Object.entries(systemData.saves)) {
      save.mod = save.value + save.abl;
    }
    systemData.init.mod = systemData.init.value + systemData.abilities.dex.mod;
  }

  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData(actorData) {
    if (actorData.type !== 'character') return;

    const systemData = actorData.system;
    systemData.attributes.level.prof = Math.ceil((systemData.attributes.level.value + 2) / 2);
    // Save proficiency
    for (let [key, save] of Object.entries(systemData.saves)) {
      if (save.proficient) {
        save.mod += systemData.attributes.level.prof;
      }
    }
    // Calculate skill modifiers
    for (let [key, skill] of Object.entries(systemData.skills)) {
      skill.mod = systemData.abilities[skill.ability].mod;
      // Calculate the modifier.
      if (skill.points < 4) {
        skill.mod += skill.points;
      } else {
        skill.mod += Math.ceil(skill.points / 2 ) + 1;
      }
    }
    // Calculate character gadgetry info
    if (systemData.gadgetry.ability) {
      systemData.gadgetry.mod = systemData.abilities[systemData.gadgetry.ability].mod ?? 0;
      systemData.gadgetry.dc = 8 + systemData.attributes.level.prof + systemData.gadgetry.mod;
      systemData.gadgetry.attack = (systemData.attributes.level.prof + systemData.gadgetry.mod) ?? 0;
    }
    
  }

  /**
   * Prepare NPC type specific data.
   */
  _prepareNpcData(actorData) {
    if (actorData.type !== 'npc') return;
    
    // Make modifications to data here.
    const systemData = actorData.system;

    // Calculate skill modifiers
    for (let [key, skill] of Object.entries(systemData.skills)) {
      skill.mod = systemData.abilities[skill.ability].mod + skill.points;
    }
    // Placeholder gadget attack
    if (!systemData.gadgetry.attack) systemData.gadgetry.attack = 0;
  }

  _prepareArmorClass(actorData) {
    const systemData = actorData.system;
    // Error prevention
    if (isNaN(systemData.ac.bonus)) systemData.ac.bonus = 0;
    // Flat (+ bonus) AC
    if (systemData.ac.flat) return ;
    
    // Otherwise, derive AC from armor
    // Get equipped armor
    const {armors} = this.itemTypes.armor.reduce((obj, armor) => {
      if (armor.system.equipped) obj.armors.push(armor);
      return obj;
    }, {armors: []})
    // Set base ac calc numbers
    let base = 10;
    let dex = systemData.abilities.dex.mod;
    if (armors.length) {
      if (armors.length > 1) {
        // TODO: warning multiple armors equipped
      }
      const armorData = armors[0].system;
      // armor class math
      base = armorData.armorClass;
      if (armorData.armorType === "medium") {
        dex = Math.min(dex, 2);
      } else if (armorData.armorType === "heavy") {
        dex = 0;
      }
      // Apply DR?
      // Apply armor penalty?
    }
    systemData.ac.total = base + dex + systemData.ac?.bonus;
  }
  _prepareShield(actorData) {
    const systemData = actorData.system;
    if (systemData.shield.flat) return;
    // Error prevention
    if (isNaN(systemData.shield.bonus)) systemData.shield.bonus = 0;
    if (isNaN(systemData.regen.bonus)) systemData.regen.bonus = 0;
    
    // Get equipped shield
    const {shields} = this.itemTypes.shield.reduce((obj, equip) => {
      if (equip.system.equipped) obj.shields.push(equip);
      return obj;
    }, {shields: []})

    if (shields.length) {
      if (shields.length > 1) {
        // TODO: warning multiple shields equipped
      }
      // Derive shield.max and regen from equipped shield
      const shieldData = shields[0].system;
      // max shield math
      systemData.shield.max = shieldData.shieldMax + systemData.shield.bonus;
      // shield regen math
      systemData.regen.value = shieldData.shieldRegen + systemData.regen.bonus;
    } else {
      // No shield equipped
      systemData.shield.max = 0;
      systemData.regen.value = 0;
    }
  }
  /**
   * Override getRollData() that's supplied to rolls.
   */
  getRollData() {
    const data = super.getRollData();

    // Prepare character roll data.
    this._getBaseRollData(data);
    this._getCharacterRollData(data);
    this._getNpcRollData(data);

    return data;
  }

  /**
   * Prepare actor roll data.
   */
  _getBaseRollData(data) {
    // Copy the ability scores to the top level, so that rolls can use
    // formulas like `@str + 4`.
    if (data.abilities) {
      for (let [k, v] of Object.entries(data.abilities)) {
        data[k] = foundry.utils.deepClone(v.mod);
      }
    }
    // Quick reference for saves
    if (data.saves.reflex.mod) {
      data.ref = data.saves.reflex.mod;
    }
    if (data.saves.fortitude.mod) {
      data.for = data.saves.fortitude.mod;
    }
    if (data.saves.will.mod) {
      data.will = data.saves.will.mod;
    }
    // Add level for easier access, or fall back to 0.
    if (data.attributes?.level) {
      data.lvl = data.attributes.level.value ?? 0;
    }
    // Copy proficiency bonus
    if (data.attributes?.level.prof) {
      data.prof = data.attributes.level.prof ?? 0;
    }
    data.initiative = data.init.mod;
    
  } 
  /**
   * Prepare character roll data.
   */
  _getCharacterRollData(data) {
    if (this.type !== 'character') return;

    
  }

  /**
   * Prepare NPC roll data.
   */
  _getNpcRollData(data) {
    if (this.type !== 'npc') return;

    // Process additional NPC data here.
  }
  /* -------------------------------------------- */
  /*  Actor Rolls                                 */
  /* -------------------------------------------- */
  async rollInitiative(rollOptions = {}) {
    // Configure roll
    const label = "[Initiative]"
    const d20Data = {
      modifiers: [`@initiative`],
      rollData: this.getRollData(),
      flavor: label
    }
    //const roll = Dice.D20Check(d20Data);
    //this._cachedInitiativeRoll = roll;
    // Add to combat tracker
    const combat = await super.rollInitiative({createCombatants: true});
    const combatants = this.isToken ? this.getActiveTokens(false, true).reduce((arr, t) => {
      const combatant = game.combat.getCombatantByToken(t.id);
      if ( combatant ) arr.push(combatant);
      return arr;
    }, []) : [game.combat.getCombatantByActor(this.id)];
    //delete this._cachedInitiativeRoll;
    //return roll;
    return;
  }
  /**
   * Roll a Saving Throw
   * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
   * @param {string} saveId    The save ID (e.g. "ref")
   * @param {object} options      Options which configure how ability tests are rolled
   * @returns {Promise<D20Roll>}  A Promise which resolves to the created Roll instance
   */
  async rollSave(saveId, options={}) {
    const label = game.i18n.format(CONFIG.STELLARMISADVENTURES.savesAbbr[saveId]) ?? "";
    // Invoke the roll and submit it to chat.
    const d20Data = {
      modifiers: [`@${saveId}`],
      rollData: this.getRollData(),
      flavor: label,
      speaker: options.speaker
    };
    const roll = Dice.D20Check(d20Data);
    return roll;
  }
  async deathSave() {
    if (!this.system.deathsaves) return this;
    const death = this.system.deathsaves
    // Display a warning if we are not at zero stamina or if we already have reached 3
    if ( (this.system.stamina.value > 0) || (death.failures >= 3) || (death.success >= 3) ) {
      ui.notifications.warn(game.i18n.localize("STELLARMISADVENTURES.DeathSaveUnnecessary"));
      return null;
    }
    const label = game.i18n.localize("STELLARMISADVENTURES.DeathSave");
    const d20Data = {
      rollData: this.getRollData(),
      criticalThreshold: 20,
      flavor: label
    };
    const roll = await Dice.D20Check(d20Data);
    if (!roll) return null;
    // Store updates here
    const details = {};

    if (roll.total >= 10) {
      // Success
      let successes = (death.success || 0) + 1;
      if (roll.options.isCritSuccess) {
        // Revive on crit
        details.updates = {
          "system.deathsaves.success": 0,
          "system.deathsaves.failures": 0,
          "system.stamina.value": 1
        };
        details.chatString = "STELLARMISADVENTURES.DeathSaveCriticalSuccess";
      } else if (successes == 3) {
        // Stable on 3 success
        details.updates = {
          "system.deathsaves.success": 0,
          "system.deathsaves.failures": 0,
        };
        details.chatString = "STELLARMISADVENTURES.DeathSaveSuccess";
      } else {
        // Otherwise, add a success
        details.updates = {"system.deathsaves.success": Math.clamped(successes, 0, 3)};
      }
    } else {
      // Failure (2 on crit fail)
      let fails = (death.failures || 0) + (roll.options.isCritFail ? 2 : 1);
      details.updates = {"system.deathsaves.failures": Math.clamped(fails, 0, 3)};
      if ( fails >= 3 ) {  // 3 Failures = death
        details.chatString = "DND5E.DeathSaveFailure";
      }
      
    }
    
    // Updates
    if ( !foundry.utils.isEmpty(details.updates) ) await this.update(details.updates);
    
    // Display success/failure chat message
    if ( details.chatString ) {
      let chatData = { content: game.i18n.format(details.chatString, {name: this.name}), speaker: ChatMessage.getSpeaker() };
      ChatMessage.applyRollMode(chatData, roll.options.rollMode);
      await ChatMessage.create(chatData);
    }

    return roll;
  }

  /* -------------------------------------------- */
  /*  Gameplay Mechanics                          */
  /* -------------------------------------------- */

  async regenShield() {
    const systemData = this.system;
    const shield = systemData.shield;
    if (!shield) return this;
    if (shield.value > 0) {
      const newVal = Math.min(shield.value + systemData.regen.value, shield.max);
      this.update({"system.shield.value": newVal});
    }
  }

  async applyDamage(amount=0, multiplier=0) {
    amount = parseInt(amount);
    if (amount == 0) return this;
    const stamina = this.system.stamina;
    const shield = this.system.shield;
    if ( !stamina || !shield ) return this;
    
    if (shield.value > 0 && amount > 0) {
      // Damage shield first
      const newVal = Math.max(shield.value - amount, 0);
      this.update({"system.shield.value": newVal});
    } else {
      // Apply DR if taking damage
      if (multiplier > 0) amount = Math.max(amount - this.system.dr.value, 1);
      // Apply modifier and round up
      amount = Math.ceil(amount * multiplier);
      const newVal = Math.clamped(stamina.value - amount, 0, stamina.max);
      this.update({"system.stamina.value": newVal});
    }

  }

  async _rest(chat, longRest) {
    let staminaRegained = 0;
    let shieldRegained = 0;
    let length = longRest ? "Long" : "Short";

    // Restore shield
    shieldRegained = this.system.shield.max - this.system.shield.value;
    this.update({"system.shield.value": this.system.shield.max});

    if (longRest) {
      // Restore stamina
      staminaRegained = this.system.stamina.max - this.system.stamina.value;
      this.update({"system.stamina.value": this.system.stamina.max});
      // Restore gadget points
      this.update({"system.gadgetry.points.value": this.system.gadgetry.points.max});
    }

    
    // Send a chat message
    if (chat) {

      let message = `STELLARMISADVENTURES.${length}RestResult`;

      let chatData = {
        user: game.user.id,
        speaker: {actor: this, alias: this.name},
        rollMode: game.settings.get('core','rollMode'),
        content: game.i18n.format(message, {
          name: this.name,
          stamina: staminaRegained,
          shield : shieldRegained
        })
      };
      return ChatMessage.create(chatData);
    }
  }

}