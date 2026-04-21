// ─── CONFIG ───────────────────────────────────────────────────────────────────
// Paramètres configurables de la plateforme Locally

export const CONFIG = {
  ville: "bordeaux",

  commande: {
    delai_min_minutes: 30,
  },

  // Créneaux de commande générés par getSlots()
  horaires_slots: {
    midi: { debut: 11, fin: 14 },
    soir: { debut: 18, fin: 23 },
  },
};
