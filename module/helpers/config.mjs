export const STELLARMISADVENTURES = {};

/**
 * The set of Ability Scores used within the sytem.
 * @type {Object}
 */
STELLARMISADVENTURES.abilities = {
  "str": "STELLARMISADVENTURES.AbilityStr",
  "dex": "STELLARMISADVENTURES.AbilityDex",
  "end": "STELLARMISADVENTURES.AbilityEnd",
  "int": "STELLARMISADVENTURES.AbilityInt",
  "per": "STELLARMISADVENTURES.AbilityPer",
  "cha": "STELLARMISADVENTURES.AbilityCha"
};
STELLARMISADVENTURES.abilityAbbreviations = {
  "str": "STELLARMISADVENTURES.AbilityStrAbbr",
  "dex": "STELLARMISADVENTURES.AbilityDexAbbr",
  "end": "STELLARMISADVENTURES.AbilityEndAbbr",
  "int": "STELLARMISADVENTURES.AbilityIntAbbr",
  "per": "STELLARMISADVENTURES.AbilityPerAbbr",
  "cha": "STELLARMISADVENTURES.AbilityChaAbbr"
};
/**
 * The set of Skills used within the sytem.
 * @type {Object}
 */
STELLARMISADVENTURES.skills = {
  "acr": "STELLARMISADVENTURES.SkillAcr",
  "ani": "STELLARMISADVENTURES.SkillAni",
  "ath": "STELLARMISADVENTURES.SkillAth",
  "bio": "STELLARMISADVENTURES.SkillBio",
  "com": "STELLARMISADVENTURES.SkillCom",
  "dec": "STELLARMISADVENTURES.SkillDec",
  "his": "STELLARMISADVENTURES.SkillHis",
  "ins": "STELLARMISADVENTURES.SkillIns",
  "int": "STELLARMISADVENTURES.SkillInt",
  "inv": "STELLARMISADVENTURES.SkillInv",
  "mec": "STELLARMISADVENTURES.SkillMec",
  "med": "STELLARMISADVENTURES.SkillMed",
  "perf": "STELLARMISADVENTURES.SkillPerf",
  "pers": "STELLARMISADVENTURES.SkillPers",
  "pil": "STELLARMISADVENTURES.SkillPil",
  "sea": "STELLARMISADVENTURES.SkillSea",
  "sle": "STELLARMISADVENTURES.SkillSle",
  "ste": "STELLARMISADVENTURES.SkillSte",
  "str": "STELLARMISADVENTURES.SkillStr"
};
STELLARMISADVENTURES.saves = {
  "reflex": "STELLARMISADVENTURES.SavesReflex",
  "fortitude": "STELLARMISADVENTURES.SavesFortitude",
  "will": "STELLARMISADVENTURES.SavesWill"
};
STELLARMISADVENTURES.savesAbbr = {
  "ref": "STELLARMISADVENTURES.SavesReflex",
  "for": "STELLARMISADVENTURES.SavesFortitude",
  "wil": "STELLARMISADVENTURES.SavesWill"
};
STELLARMISADVENTURES.attackTypes = {
  "mwatk": "STELLARMISADVENTURES.AttackMWATK",
  "rwatk": "STELLARMISADVENTURES.AttackRWATK",
  "mgatk": "STELLARMISADVENTURES.AttackMGATK",
  "rgatk": "STELLARMISADVENTURES.AttackRGATK"
};
STELLARMISADVENTURES.useTimes = {
  "standard": "STELLARMISADVENTURES.StandardAction",
  "minor": "STELLARMISADVENTURES.MinorAction",
  "reaction": "STELLARMISADVENTURES.Reaction",
  "free": "STELLARMISADVENTURES.FreeAction"
};
STELLARMISADVENTURES.weaponTypes = {
  "melee": "STELLARMISADVENTURES.WeaponTypeMelee",
  "pistol": "STELLARMISADVENTURES.WeaponTypePistol",
  "rifle": "STELLARMISADVENTURES.WeaponTypeRifle",
  "shotgun": "STELLARMISADVENTURES.WeaponTypeShotgun",
  "sniper": "STELLARMISADVENTURES.WeaponTypeSniper",
  "heavy": "STELLARMISADVENTURES.WeaponTypeHeavy",
};
STELLARMISADVENTURES.armorTypes = {
  "light": "STELLARMISADVENTURES.ArmorTypeLight",
  "medium": "STELLARMISADVENTURES.ArmorTypeMedium",
  "heavy": "STELLARMISADVENTURES.ArmorTypeHeavy",
};
/**
 * The set of weapon types used within the sytem.
 * @type {Object}
 */
STELLARMISADVENTURES.damageTypes = {
  "chemical": "STELLARMISADVENTURES.DamageTypeChemical",
  "electric": "STELLARMISADVENTURES.DamageTypeElectric",
  "fire": "STELLARMISADVENTURES.DamageTypeFire",
  "heal": "STELLARMISADVENTURES.DamageTypeHeal",
  "ice": "STELLARMISADVENTURES.DamageTypeIce",
  "kinentic": "STELLARMISADVENTURES.DamageTypeKinetic",
  "melee": "STELLARMISADVENTURES.DamageTypeMelee",
  "piercing": "STELLARMISADVENTURES.DamageTypePiercing",
  "plasma": "STELLARMISADVENTURES.DamageTypePlasma",
  "poison": "STELLARMISADVENTURES.DamageTypePoison",
  "sonic": "STELLARMISADVENTURES.DamageTypeSonic",
};
/**
 * The set of weapon properties used within the sytem.
 * @type {Object}
 */
STELLARMISADVENTURES.weaponProperties = {
  "accu": "STELLARMISADVENTURES.WeaponPropertiesAccu",
  "area": "STELLARMISADVENTURES.WeaponPropertiesArea",
  "anti": "STELLARMISADVENTURES.WeaponPropertiesAnti",
  "auto": "STELLARMISADVENTURES.WeaponPropertiesAute",
  "blas": "STELLARMISADVENTURES.WeaponPropertiesBlas",
  "char": "STELLARMISADVENTURES.WeaponPropertiesChar",
  "dama": "STELLARMISADVENTURES.WeaponPropertiesdama",
  "erra": "STELLARMISADVENTURES.WeaponPropertiesErra",
  "herr": "STELLARMISADVENTURES.WeaponPropertiesHerr",
  "fine": "STELLARMISADVENTURES.WeaponPropertiesFine",
  "free": "STELLARMISADVENTURES.WeaponPropertiesFree",
  "nonl": "STELLARMISADVENTURES.WeaponPropertiesNonl",
  "prec": "STELLARMISADVENTURES.WeaponPropertiesPrec",
  "pris": "STELLARMISADVENTURES.WeaponPropertiesPris",
  "reac": "STELLARMISADVENTURES.WeaponPropertiesReac",
  "scor": "STELLARMISADVENTURES.WeaponPropertiesScor",
  "byps": "STELLARMISADVENTURES.WeaponPropertiesByps",
  "shoc": "STELLARMISADVENTURES.WeaponPropertiesShoc",
  "thro": "STELLARMISADVENTURES.WeaponPropertiesThro",
  "unst": "STELLARMISADVENTURES.WeaponPropertiesUnst",
  "spec": "STELLARMISADVENTURES.WeaponPropertiesSpec"
};

STELLARMISADVENTURES.gadgetTiers = {
  1: "Tier 1 (2pts)",
  2: "Tier 2 (3pts)",
  3: "Tier 3 (5pts)",
  4: "Tier 4 (6pts)",
  5: "Tier 5 (7pts)"
};
STELLARMISADVENTURES.gadgetTierCosts = {
  1: 2,
  2: 3,
  3: 5,
  4: 6,
  5: 7
};