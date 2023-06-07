import {onManageActiveEffect, prepareActiveEffectCategories} from "../helpers/effects.mjs";
import * as Dice from "../dice.mjs"
/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class StellarMisadventuresActorSheet extends ActorSheet {
  /**
   * IDs for items on the sheet that have been expanded. TODO: move this to new base-sheet.mjs
   * @type {Set<string>}
   * @protected
   */
  _expanded = new Set();

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["stellarmisadventures", "sheet", "actor"],
      template: "systems/stellarmisadventures/templates/actor/actor-sheet.hbs",
      width: 700,
      height: 800,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "features" }]
    });
  }

  /** @override */
  get template() {
    return `systems/stellarmisadventures/templates/actor/actor-${this.actor.type}-sheet.hbs`;
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    // Retrieve the data structure from the base sheet. You can inspect or log
    // the context variable to see the structure, but some key properties for
    // sheets are the actor object, the data object, whether or not it's
    // editable, the items array, and the effects array.
    const context = super.getData();

    // Use a safe clone of the actor data for further operations.
    const actorData = this.actor.toObject(false);
    // Include the config
    context.config = CONFIG.STELLARMISADVENTURES;
    // Add the actor's data to context.data for easier access, as well as flags.
    context.system = actorData.system;
    context.flags = actorData.flags;

    context.itemContext = {};
    this._prepareBasicData(context);
    // Prepare character data and items.
    if (actorData.type == 'character') {
      this._prepareItems(context);
      this._prepareCharacterData(context);
    }

    // Prepare NPC data and items.
    if (actorData.type == 'npc') {
      this._prepareItems(context);
    }

    // Add roll data for TinyMCE editors.
    context.rollData = context.actor.getRollData();

    // Prepare active effects
    context.effects = prepareActiveEffectCategories(this.actor.effects);

    return context;
  }

  /**
   * Organize base data for character sheets
   */
  _prepareBasicData(context) {
    // Handle ability scores.
    for (let [k, v] of Object.entries(context.system.abilities)) {
      v.label = game.i18n.localize(CONFIG.STELLARMISADVENTURES.abilities[k]) ?? k;
    }
    // Handle skills.
    for (let [k, v] of Object.entries(context.system.skills)) {
      v.label = game.i18n.localize(CONFIG.STELLARMISADVENTURES.skills[k]) ?? k;
    }
    // Handle saves.
    for (let [k, v] of Object.entries(context.system.saves)) {
      v.label = game.i18n.localize(CONFIG.STELLARMISADVENTURES.saves[k]) ?? k;
    }
  }
  /**
   * Organize and classify character data for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterData(context) {
    
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareItems(context) {
    // Initialize containers.
    const gear = [];
    const weapons = [];
    const armor = [];
    const shields = [];
    const features = [];
    const gadgets = {
      1: [],
      2: [],
      3: [],
      4: [],
      5: []
    };

    // Iterate through items, allocating to containers
    for (let i of context.items) {
      // Item details
      const ctx = context.itemContext[i._id] ??= {};
      // TODO: Try https://github.com/foundryvtt/dnd5e/blob/master/module/applications/actor/character-sheet.mjs#L104
      // to get item toHit
      i.img = i.img || DEFAULT_TOKEN;     
      ctx.isExpanded = this._expanded.has(i._id);
      ctx.isStack = i.system.quantity !== 1;
      //console.log(`${ctx.isStack}`)
      // Group items by type 
      if (i.type === 'item') {
        gear.push(i);
      }
      else if (i.type === 'weapon') {
        weapons.push(i);
      }
      else if (i.type === 'armor') {
        armor.push(i);
      }
      else if (i.type === 'shield') {
        shields.push(i);
      }
      else if (i.type === 'feature') {
        features.push(i);
      }
      // Append to gadgets by tier.
      else if (i.type === 'gadget') {
        if (i.system.gadgetTier != undefined) {
          gadgets[i.system.gadgetTier].push(i);
        }
      }
    }

    // Assign and return
    context.gear = gear;
    context.weapons = weapons;
    context.armor = armor;
    context.shields = shields;
    context.features = features;
    context.gadgets = gadgets;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Render the item sheet for viewing/editing prior to the editable check.
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.sheet.render(true);
    });

    // -------------------------------------------------------------
    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Add Inventory Item
    html.find('.item-create').click(this._onItemCreate.bind(this));

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.delete();
      li.slideUp(200, () => this.render(false));
    });

    // Active Effect management
    html.find(".effect-control").click(ev => onManageActiveEffect(ev, this.actor));

    // Rollable abilities.
    html.find('.rollable').click(this._onRoll.bind(this));

    // Drag events for macros.
    if (this.actor.isOwner) {
      let handler = ev => this._onDragStart(ev);
      html.find('li.item').each((i, li) => {
        if (li.classList.contains("inventory-header")) return;
        li.setAttribute("draggable", true);
        li.addEventListener("dragstart", handler, false);
      });
    }
  }

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
    // Grab any data associated with this control.
    const data = duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      system: data
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.system["type"];

    // Finally, create the item!
    return await Item.create(itemData, {parent: this.actor});
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;

    // Handle item rolls.
    switch (dataset.rollType) {
      case 'item': 
        const itemId = element.closest('.item').dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (item) return item.use();
      case 'initiative':
        return this.actor.rollInitiative({event});
    }
        
    if (dataset.rollType) console.log("Rolling initiative?"); 
    // Handle ability rolls.
    if (dataset.roll) {
      let label = dataset.label ? `[ability] ${dataset.label}` : '';
      return Dice.D20Check({
        modifiers: [dataset.roll],
        rollData: this.actor.getRollData(),
        flavor: label
      });
    }
  }

}
