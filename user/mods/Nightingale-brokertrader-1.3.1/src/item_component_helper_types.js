"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClassesWithPoints = exports.RagfairItemComponentTypes = exports.ItemComponentTypes = void 0;
// All component type which matter for trader price calculation
// And tax calculation.
var ItemComponentTypes;
(function (ItemComponentTypes) {
    ItemComponentTypes["REPAIRABLE"] = "Repairable";
    ItemComponentTypes["BUFF"] = "Buff";
    ItemComponentTypes["DOGTAG"] = "Dogtag";
    ItemComponentTypes["KEY"] = "Key";
    ItemComponentTypes["RESOURCE"] = "Resource";
    ItemComponentTypes["SIDE_EFFECT"] = "SideEffect";
    ItemComponentTypes["MEDKIT"] = "MedKit";
    ItemComponentTypes["FOOD_DRINK"] = "FoodDrink";
    ItemComponentTypes["REPAIRKIT"] = "RepairKit";
})(ItemComponentTypes || (exports.ItemComponentTypes = ItemComponentTypes = {}));
// Component types which matter for ragfair specifically.
// They are used when filtering ragfair offers to calculate template average price.
// Needed only to preserve current ragfair pricing implementation
var RagfairItemComponentTypes;
(function (RagfairItemComponentTypes) {
    RagfairItemComponentTypes["REPAIRABLE"] = "Repairable";
    RagfairItemComponentTypes["KEY"] = "Key";
    RagfairItemComponentTypes["RESOURCE"] = "Resource";
    RagfairItemComponentTypes["MEDKIT"] = "MedKit";
    RagfairItemComponentTypes["FOOD_DRINK"] = "FoodDrink";
    RagfairItemComponentTypes["REPAIRKIT"] = "RepairKit";
})(RagfairItemComponentTypes || (exports.RagfairItemComponentTypes = RagfairItemComponentTypes = {}));
var ClassesWithPoints;
(function (ClassesWithPoints) {
    ClassesWithPoints["ARMORED_EQUIPMENT"] = "57bef4c42459772e8d35a53b";
    ClassesWithPoints["MEDS"] = "543be5664bdc2dd4348b4569";
    ClassesWithPoints["FOOD_DRINK"] = "543be6674bdc2df1348b4569";
    ClassesWithPoints["WEAPON"] = "5422acb9af1c889c16000029";
    ClassesWithPoints["KNIFE"] = "5447e1d04bdc2dff2f8b4567";
    // fuel cans, water/air fiters in spt-aki, at least as of 3.5.3
    // inside the flea offer don't seem to contain the "item.upd.Resource" property
    // so it resource points seem unaccounted for. And also all offers with them are 100% condition.
    // But when calculating trader sell prices it needs to be accounted for.
    ClassesWithPoints["BARTER_ITEM"] = "5448eb774bdc2d0a728b4567";
    ClassesWithPoints["KEY"] = "54009119af1c881c07000029";
    ClassesWithPoints["REPAIR_KITS"] = "616eb7aea207f41933308f46";
})(ClassesWithPoints || (exports.ClassesWithPoints = ClassesWithPoints = {}));
