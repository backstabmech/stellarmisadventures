// Import document classes.
import { StellarMisadventuresActor } from "./documents/actor.mjs";
import { StellarMisadventuresItem } from "./documents/item.mjs";
// Import sheet classes.
import { StellarMisadventuresActorSheet } from "./sheets/actor-sheet.mjs";
import { StellarMisadventuresItemSheet } from "./sheets/item-sheet.mjs";
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from "./helpers/templates.mjs";
import { STELLARMISADVENTURES } from "./helpers/config.mjs";
import * as chat from "./documents/chat-message.mjs"
import * as utils from "./helpers/utils.mjs"
/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once('init', async function() {
  
  // Add utility classes to the global game object so that they're more easily
  // accessible in global contexts.
  game.stellarmisadventures = {
    StellarMisadventuresActor,
    StellarMisadventuresItem,
    config: STELLARMISADVENTURES,
    createItemMacro,
    rollItemMacro
  };

  // Add custom constants for configuration.
  CONFIG.STELLARMISADVENTURES = STELLARMISADVENTURES;

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: "1d20 + @abilities.dex.mod + @init.value",
    decimals: 2
  };

  // Define custom Document classes
  CONFIG.Actor.documentClass = StellarMisadventuresActor;
  CONFIG.Item.documentClass = StellarMisadventuresItem;

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("stellarmisadventures", StellarMisadventuresActorSheet, { makeDefault: true });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("stellarmisadventures", StellarMisadventuresItemSheet, { makeDefault: true });

  // Preload Handlebars templates.
  return preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

// If you need to add Handlebars helpers, here are a few useful examples:
Handlebars.registerHelper('concat', function() {
  var outStr = '';
  for (var arg in arguments) {
    if (typeof arguments[arg] != 'object') {
      outStr += arguments[arg];
    }
  }
  return outStr;
});

Handlebars.registerHelper('toLowerCase', function(str) {
  return str.toLowerCase();
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once("ready", async function() {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on("hotbarDrop", (bar, data, slot) => createItemMacro(data, slot));
});

/* -------------------------------------------- */
/*  Chat button hooks                           */
/* -------------------------------------------- */

Hooks.on("renderChatMessage", chat.onRenderChatMessage);
Hooks.on("getChatLogEntryContext", chat.addChatMessageContextOptions);

Hooks.on("renderChatLog", (app, html, data) => StellarMisadventuresItem.chatListeners(html));
Hooks.on("renderChatPopout", (app, html, data) => StellarMisadventuresItem.chatListeners(html));

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createItemMacro(data, slot) {
  // First, determine if this is a valid owned item.
  if (data.type !== "Item") return;
  if (!data.uuid.includes('Actor.') && !data.uuid.includes('Token.')) {
    return ui.notifications.warn("You can only create macro buttons for owned Items");
  }
  // If it is, retrieve it based on the uuid.
  const item = await Item.fromDropData(data);
  // Seems like theres some race condition here, pulling itemdata for no reason makes this function work.
  const itemData = await Item.implementation.fromDropData(data);
  const macroData = {
      type: "script",
      scope: "actor",
      name: item.name,
      img: item.img,
      command: `game.stellarmisadventures.rollItemMacro("${data.uuid}")`,
      flags: { "stellarmisadventures.itemMacro": true }
  };
  
  // Assign the macro to the hotbar
  const macro = game.macros.find(m => (m.name === macroData.name) 
  && (m.command === macroData.command) && m.author.isSelf) || await Macro.create(macroData);
  // This log is also required
  console.log(macro.command);
  game.user.assignHotbarMacro(macro, slot);
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemUuid
 */
function rollItemMacro(itemUuid) {
  console.log("ROLLING ITEM MACRO");
  // Reconstruct the drop data so that we can load the item.
  const dropData = {
    type: 'Item',
    uuid: itemUuid
  };
  // Load the item from the uuid.
  Item.fromDropData(dropData).then(item => {
    // Determine if the item loaded and if it's an owned item.
    if (!item || !item.parent) {
      const itemName = item?.name ?? itemUuid;
      return ui.notifications.warn(`Could not find item ${itemName}. You may need to delete and recreate this macro.`);
    }

    // Trigger the item roll
    item.use();
  });
}