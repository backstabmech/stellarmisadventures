/* -------------------------------------------- */

/**
 * A helper that fetch the appropriate item context from root and adds it to the first block parameter.
 * @param {object} context  Current evaluation context.
 * @param {object} options  Handlebars options.
 * @returns {string}
 */
function itemContext(context, options) {
    if ( arguments.length !== 2 ) throw new Error("#dnd5e-itemContext requires exactly one argument");
    if ( foundry.utils.getType(context) === "function" ) context = context.call(this);
  
    const ctx = options.data.root.itemContext?.[context.id];
    if ( !ctx ) {
      const inverse = options.inverse(this);
      if ( inverse ) return options.inverse(this);
    }
  
    return options.fn(context, { data: options.data, blockParams: [ctx] });
  }