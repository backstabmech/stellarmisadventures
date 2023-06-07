/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
 export const preloadHandlebarsTemplates = async function() {
  return loadTemplates([

    // Actor partials.
    "systems/stellarmisadventures/templates/actor/parts/actor-header.hbs",
    "systems/stellarmisadventures/templates/actor/parts/actor-features.hbs",
    "systems/stellarmisadventures/templates/actor/parts/actor-items.hbs",
    "systems/stellarmisadventures/templates/actor/parts/actor-gadgets.hbs",
    "systems/stellarmisadventures/templates/actor/parts/actor-effects.hbs",

    "systems/stellarmisadventures/templates/item/parts/activate-sheet.hbs",
    "systems/stellarmisadventures/templates/item/parts/item-summary.hbs"
  ]);
};
