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
  }

  /**
   * Prepare NPC type specific data.
   */
  _prepareNpcData(actorData) {
    if (actorData.type !== 'npc') return;
    
    // Make modifications to data here.
    const systemData = actorData.system;

    systemData.xp = (systemData.cr * systemData.cr) * 100;
    // Calculate skill modifiers
    for (let [key, skill] of Object.entries(systemData.skills)) {
      skill.mod = systemData.abilities[skill.ability].mod + skill.points;
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
    // formulas like `@str.mod + 4`.
    if (data.abilities) {
      for (let [k, v] of Object.entries(data.abilities)) {
        data[k] = foundry.utils.deepClone(v);
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

  } 
  /**
   * Prepare character roll data.
   */
  _getCharacterRollData(data) {
    if (this.type !== 'character') return;

    // Add level for easier access, or fall back to 0.
    if (data.attributes.level) {
      data.lvl = data.attributes.level.value ?? 0;
    }
    // Copy proficiency bonus
    if (data.attributes.level.prof) {
      data.prof = data.attributes.level.prof ?? 0;
    }
  }

  /**
   * Prepare NPC roll data.
   */
  _getNpcRollData(data) {
    if (this.type !== 'npc') return;

    // Process additional NPC data here.
  }

   /**
   * Roll a Saving Throw
   * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
   * @param {string} saveId    The save ID (e.g. "ref")
   * @param {object} options      Options which configure how ability tests are rolled
   * @returns {Promise<D20Roll>}  A Promise which resolves to the created Roll instance
   */
  async rollAbilitySave(saveId, options={}) {
    console.log("Making a saving throw!");
    const label = CONFIG.STELLARMISADVENTURES.saves[saveId]?.label ?? "";
    const data = this.getRollData();
    // TODO: Implement this
    return null;
    /*
    // Invoke the roll and submit it to chat.
    const roll = new Roll(`d20 +@${saveId} `, rollData);
    // If you need to store the value first, uncomment the next line.
    // let result = await roll.roll({async: true});
    roll.toMessage({
      speaker: speaker,
      rollMode: rollMode,
      flavor: label,
    });
    return roll;*/
  }



  /* -------------------------------------------- */
  /*  Gameplay Mechanics                          */
  /* -------------------------------------------- */

  async applyDamage(amount=0, multiplier=0) {
    // Apply modifier and round up
    amount = Math.ceil(parseInt(amount) * multiplier);
    const stamina = this.system.stamina;
    const shield = this.system.shield;
    if ( !stamina || !shield ) return this;
    
    if (shield.value > 0 && amount > 0) {
      // Apply to shield first
      const newVal = Math.max(shield.value - amount, 0);
      this.update({"system.shield.value": newVal});
    } else {
      const newVal = Math.clamped(stamina.value - amount, 0, stamina.max);
      this.update({"system.stamina.value": newVal});
    }

  }

}