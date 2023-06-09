export async function GetGadgetUseOptions(options) {
  const template = "systems/stellarmisadventures/templates/apps/gadget-use-dialog.hbs";
  const html = await renderTemplate(template, {});
  return new Promise(resolve => {
    const data = {
      title: "Activate Gadget",
      content: html,
      buttons: {
        confirm: {
          label: "Confirm",
          callback: html => resolve(_onGadgetUseDialogSubmit(html[0].querySelector("form")))
        },
        cancel: {
          label: "Cancel",
          callback: html => resolve({cancelled: true})
        },
      },
      default: "confirm",
      close: () => resolve({cancelled: true})
    };
    new Dialog(data, null).render(true);
  });
}

function _onGadgetUseDialogSubmit(form) {
  return {
    expend: form.expend.checked,
    gadgetTier: form.tier.value
  }
}