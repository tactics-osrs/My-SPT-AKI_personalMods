"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ItemComponentHelper = void 0;
const ItemHelper_1 = require("C:/snapshot/project/obj/helpers/ItemHelper");
const DatabaseServer_1 = require("C:/snapshot/project/obj/servers/DatabaseServer");
const item_component_helper_types_1 = require("./item_component_helper_types");
class ItemComponentHelper {
    constructor(container) {
        this.container = container;
        this.dbServer = container.resolve(DatabaseServer_1.DatabaseServer.name);
        this.dbGlobals = this.dbServer.getTables().globals;
        this.dbItems = this.dbServer.getTables().templates.items;
        this.dbTraders = this.dbServer.getTables().traders;
        this.itemHelper = this.container.resolve(ItemHelper_1.ItemHelper.name);
    }
    /**
     * Return the max durability/resource/key usage/etc. points for a template and a desired component type.
     * Component type has to be specified since items can have multiple components assigned (E.g. cultist knife is both Repairable and Side Effect).
     * @param itemTplId Item template id
     * @param componentType Component type
     * @returns number - max points value
     */
    getTemplateComponentMaxPoints(itemTplId, componentType) {
        const props = this.getItemTemplate(itemTplId)._props;
        switch (componentType) {
            case item_component_helper_types_1.ItemComponentTypes.REPAIRABLE:
                return props.MaxDurability;
            case item_component_helper_types_1.ItemComponentTypes.KEY:
                return props.MaximumNumberOfUsage;
            case item_component_helper_types_1.ItemComponentTypes.RESOURCE:
            case item_component_helper_types_1.ItemComponentTypes.SIDE_EFFECT:
            case item_component_helper_types_1.ItemComponentTypes.FOOD_DRINK:
                return props.MaxResource;
            case item_component_helper_types_1.ItemComponentTypes.MEDKIT:
                return props.MaxHpResource;
            case item_component_helper_types_1.ItemComponentTypes.REPAIRKIT:
                return props.MaxRepairResource;
            default:
                return null;
        }
    }
    /**
     * Get item points data for a certain component type.
     * @param item Item
     * @param componentType Component type
     * @returns ItemPointsData - current points, current max points, template max points.
     */
    getItemComponentPoints(item, componentType) {
        let currentPoints = 0;
        let currentMaxPoints = 0;
        const originalMaxPoints = this.getTemplateComponentMaxPoints(item._tpl, componentType) ?? 0;
        switch (componentType) {
            // "Repairable" items use the same properties for durability
            case item_component_helper_types_1.ItemComponentTypes.REPAIRABLE:
                // since not all descendants of baseclass might have durability/resource points
                // and also some items (e.g. just bought from flea) might have no "upd" property
                // so consider them brand new with full points.
                if (item.upd?.Repairable == undefined)
                    currentPoints = currentMaxPoints = originalMaxPoints;
                else {
                    currentPoints = item.upd.Repairable.Durability;
                    currentMaxPoints = item.upd.Repairable.MaxDurability;
                }
                break;
            case item_component_helper_types_1.ItemComponentTypes.BUFF:
                if (item.upd?.Buff == undefined)
                    currentPoints = currentMaxPoints = originalMaxPoints;
                else
                    currentPoints = item.upd.Buff.value;
                break;
            case item_component_helper_types_1.ItemComponentTypes.DOGTAG:
                if (item.upd?.Dogtag == undefined)
                    currentPoints = currentMaxPoints = originalMaxPoints;
                else
                    currentPoints = item.upd.Dogtag.Level;
                break;
            case item_component_helper_types_1.ItemComponentTypes.SIDE_EFFECT:
                if (item.upd?.SideEffect == undefined)
                    currentPoints = currentMaxPoints = originalMaxPoints;
                else
                    currentPoints = item.upd.SideEffect.Value;
                break;
            case item_component_helper_types_1.ItemComponentTypes.FOOD_DRINK:
                if (item.upd?.FoodDrink == undefined)
                    currentPoints = currentMaxPoints = originalMaxPoints;
                else
                    currentPoints = item.upd.FoodDrink.HpPercent; // not an actual percent, it's literally current resource value
                break;
            case item_component_helper_types_1.ItemComponentTypes.MEDKIT:
                if (item.upd?.MedKit == undefined)
                    currentPoints = currentMaxPoints = originalMaxPoints;
                else
                    currentPoints = item.upd.MedKit.HpResource;
                break;
            case item_component_helper_types_1.ItemComponentTypes.RESOURCE:
                if (item.upd?.Resource == undefined)
                    currentPoints = currentMaxPoints = originalMaxPoints;
                else
                    currentPoints = item.upd.Resource.Value;
                break;
            case item_component_helper_types_1.ItemComponentTypes.KEY:
                if (item.upd?.Key == undefined)
                    currentPoints = currentMaxPoints = originalMaxPoints;
                else
                    currentPoints = originalMaxPoints - item.upd.Key.NumberOfUsages; // It's wacky, but for some reason NumberOfUsages = Actual Times Used
                break;
            case item_component_helper_types_1.ItemComponentTypes.REPAIRKIT:
                if (item.upd?.RepairKit == undefined)
                    currentPoints = currentMaxPoints = originalMaxPoints;
                else
                    currentPoints = item.upd.RepairKit.Resource;
                break;
        }
        if (componentType !== item_component_helper_types_1.ItemComponentTypes.REPAIRABLE)
            currentMaxPoints = originalMaxPoints; // if can't be repaired, current max point capacity doesn't change (food/meds/etc.)
        return {
            points: currentPoints || 1,
            maxPoints: currentMaxPoints || 1,
            templateMaxPoints: originalMaxPoints || 1
        };
    }
    /**
     * Get item component points for ragfair. In current implementation to mirror the observed SPT-AKI flea behaviour,
     * items use only one component and their price is scaled only based on current durability.
     * @param item Item
     * @returns ItemPointsData
     */
    getRagfairItemComponentPoints(item) {
        return this.getItemComponentPoints(item, this.getItemRagfairComponentType(item));
    }
    /**
     * Check if item has a component type assigned.
     * @param item Item
     * @param componentType Component type
     * @returns true | false
     */
    hasComponent(item, componentType) {
        return this.getItemComponentTypes(item).includes(componentType);
    }
    /**
     * Check if item template has a component type assigned.
     * Some component types can't be assigned to a brand new "template" item by default, e.g. Weapon/Armour Buff.
     * @param itemTplId
     * @param componentType
     * @returns
     */
    hasTemplateComponent(itemTplId, componentType) {
        return this.getTemplateComponentTypes(itemTplId).includes(componentType);
    }
    /**
     * Get all component types which provided item currently has.
     * @param item Item
     * @returns string[] - all component types an item has
     */
    getItemComponentTypes(item) {
        const components = this.getTemplateComponentTypes(item._tpl);
        // "Buff" is the only component that can't be checked by Template
        if (item.upd?.Buff != undefined) {
            components.push(item_component_helper_types_1.ItemComponentTypes.BUFF);
        }
        return components;
    }
    /**
     * Get ragfair specific item component type. (Due to current implementation)
     * @param item Item
     * @returns string - component type
     */
    // Needed only to preserve current ragfair pricing implementation
    getItemRagfairComponentType(item) {
        return this.getTemplateComponentTypes(item._tpl).find(componentType => Object.keys(item_component_helper_types_1.RagfairItemComponentTypes).some(key => item_component_helper_types_1.RagfairItemComponentTypes[key] === componentType));
    }
    /**
     * Get all component types of an item template.
     * @param itemTplId Item template id
     * @returns string[]
     */
    getTemplateComponentTypes(itemTplId) {
        const props = this.getItemTemplate(itemTplId)._props;
        const components = [];
        // Some components have the same property names, so isOfBaseClass check provided where needed
        // Repairable
        if (this.allNotNull([props.Durability, props.MaxDurability]))
            components.push(item_component_helper_types_1.ItemComponentTypes.REPAIRABLE);
        // Dogtag
        if (this.isDogtagTplId(itemTplId))
            components.push(item_component_helper_types_1.ItemComponentTypes.DOGTAG);
        // Key
        if (props.MaximumNumberOfUsage != null)
            components.push(item_component_helper_types_1.ItemComponentTypes.KEY);
        // Resource
        if (this.allNotNull([props.Resource, props.MaxResource]) && this.itemHelper.isOfBaseclass(itemTplId, item_component_helper_types_1.ClassesWithPoints.BARTER_ITEM))
            components.push(item_component_helper_types_1.ItemComponentTypes.RESOURCE);
        // Side Effect
        if (this.allNotNull([props.MaxResource, props.StimulatorBuffs]))
            components.push(item_component_helper_types_1.ItemComponentTypes.SIDE_EFFECT);
        // Medkit
        if (this.itemHelper.isOfBaseclass(itemTplId, item_component_helper_types_1.ClassesWithPoints.MEDS))
            components.push(item_component_helper_types_1.ItemComponentTypes.MEDKIT);
        // Food Drink
        if (props.MaxResource != null && this.itemHelper.isOfBaseclass(itemTplId, item_component_helper_types_1.ClassesWithPoints.FOOD_DRINK))
            components.push(item_component_helper_types_1.ItemComponentTypes.FOOD_DRINK);
        // Repair kit
        if (this.allNotNull([props.MaxRepairResource /*, props.RepairCost, props.RepairQuality, props.RepairType*/]) && this.itemHelper.isOfBaseclass(itemTplId, item_component_helper_types_1.ClassesWithPoints.REPAIR_KITS))
            components.push(item_component_helper_types_1.ItemComponentTypes.REPAIRKIT);
        return components;
    }
    /**
     * Check if item is a dogtag(seems to also be a component).
     * @param itemTplId Item template id
     * @returns true | false
     */
    isDogtagTplId(itemTplId) {
        // BEAR DOGTAG - "59f32bb586f774757e1e8442"
        // USEC DOGTAG - "59f32c3b86f77472a31742f0"
        return itemTplId === "59f32bb586f774757e1e8442" || itemTplId === "59f32c3b86f77472a31742f0";
    }
    /**
     * Get an item template from the database. Throws an exception if item not found.
     * @param itemTplId Item template id
     * @returns ITemplateItem
     */
    getItemTemplate(itemTplId) {
        const itemTpl = this.dbItems[itemTplId];
        if (itemTpl == undefined)
            throw (`ItemComponentHelper | Couldn't find item template with id ${itemTplId}!`);
        return itemTpl;
    }
    /**
     * Check if all of the provided values have an assigned value(not null|undefined).
     * @param values Array of values
     * @returns true | false
     */
    allNotNull(values) {
        return !values.some(value => value == undefined);
    }
}
exports.ItemComponentHelper = ItemComponentHelper;
