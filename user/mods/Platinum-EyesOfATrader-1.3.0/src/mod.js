"use strict";
// Copyright (C) 2023 Platinum
// 
// This file is part of Eyes of a Trader.
// 
// Eyes of a Trader is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
// 
// Eyes of a Trader is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
// 
// You should have received a copy of the GNU General Public License
// along with Eyes of a Trader.  If not, see <http://www.gnu.org/licenses/>.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Money_1 = require("C:/snapshot/project/obj/models/enums/Money");
const config_json_1 = __importDefault(require("../config.json"));
const categories_json_1 = __importDefault(require("../categories.json"));
class EyesOfATraderMod {
    constructor() {
        this.modName = "[Eyes of a Trader]";
        // We want to cache all (sub)categories of the Handbook that we have enabled our mod for otherwise we'll recursively search thousands of times.
        this.categoryConfigs = [];
    }
    postDBLoad(container) {
        this.container = container;
        this.logger = container.resolve("WinstonLogger");
        const databaseServer = container.resolve("DatabaseServer");
        const tables = databaseServer.getTables();
        const handbookCategories = tables.templates.handbook.Categories;
        this.cacheEnabledCategories(handbookCategories);
        // Easiest way to make mod compatible with Lua's flea updater is let the user choose when to load the mod...
        setTimeout(() => this.retrievePricingAndUpdateDescriptions(tables), config_json_1.default.delayStartInSeconds * 1000);
    }
    retrievePricingAndUpdateDescriptions(tables) {
        const itemTable = tables.templates.items;
        const handbookItems = tables.templates.handbook.Items;
        // Need this to update the descriptions later
        const pricingMap = new Map();
        for (const handbookItem of handbookItems) {
            const itemId = handbookItem.Id;
            const item = itemTable[itemId];
            const itemProps = item._props;
            const isValidItem = itemProps.Name && itemProps.Name !== "Dog tag" && !itemProps.QuestItem;
            // If a categoryConfig exists for this handbook item, it means we want to display prices for this item!
            const categoryConfig = this.categoryConfigs.find(category => category.id === handbookItem.ParentId);
            if (categoryConfig && isValidItem) {
                const pricing = new Pricing(this.getApproxTraderPrice(handbookItems, itemId), this.getApproxFleaPrice(itemId), itemProps.Width * itemProps.Height);
                pricingMap.set(itemId, pricing);
                // Display custom background colours if forced via category configs or
                // Disable custom background colours if disabled globally or per category.
                if (categoryConfig.forceCustomBackgroundColours ||
                    config_json_1.default.useCustomBackgroundColours &&
                        !categoryConfig.disableCustomBackgroundColours) {
                    const customColour = categoryConfig.useSlotsBasedBackgroundColours
                        ? this.getCustomBackgroundColourBasedOnInventorySlots(itemProps)
                        : this.getCustomBackgroundColourBasedOnPrice(pricing);
                    if (customColour && (categoryConfig.forceCustomBackgroundColours || config_json_1.default.updateVioletItemBackground || itemProps.BackgroundColor !== "violet")) {
                        itemProps.BackgroundColor = customColour;
                    }
                }
            }
        }
        this.updateItemDescriptions(tables.locales.global, pricingMap);
        this.logger.success(`${this.modName}: Success! Found ${pricingMap.size} items to update.`);
    }
    cacheEnabledCategories(handbookCategories) {
        if (this.categoryConfigs.length === 0) {
            categories_json_1.default.enabledCategories.forEach((categoryConfig) => {
                // We gotta add the parent categories first
                this.categoryConfigs.push(categoryConfig);
                this.addSubCategoriesRecursively(handbookCategories, categoryConfig);
            });
        }
    }
    addSubCategoriesRecursively(allCategories, categoryConfig) {
        const subCategories = allCategories.filter(category => category.ParentId === categoryConfig.id);
        if (subCategories.length) {
            const subCategoryConfigs = subCategories.map((subCategory) => ({
                id: subCategory.Id,
                disableCustomBackgroundColours: categoryConfig.disableCustomBackgroundColours,
                forceCustomBackgroundColours: categoryConfig.forceCustomBackgroundColours,
                useSlotsBasedBackgroundColours: categoryConfig.useSlotsBasedBackgroundColours
            }));
            this.categoryConfigs = this.categoryConfigs.concat(subCategoryConfigs);
            subCategoryConfigs.forEach(categoryConfig => this.addSubCategoriesRecursively(allCategories, categoryConfig));
        }
    }
    getApproxTraderPrice(handbookItems, itemId) {
        const fullPrice = handbookItems.find(item => item.Id === itemId)?.Price;
        if (!fullPrice) {
            this.logger.warning(`${this.modName}: Could not find trader price data for ${itemId}`);
            return 0;
        }
        return fullPrice * config_json_1.default.traderPriceMultiplier;
    }
    getApproxFleaPrice(itemId) {
        const ragfairService = this.container.resolve("RagfairPriceService");
        const item = {
            _id: itemId,
            _tpl: itemId
        };
        const dynamicPrice = ragfairService.getDynamicOfferPrice([item], Money_1.Money.ROUBLES);
        return dynamicPrice * config_json_1.default.fleaPriceMultiplier;
    }
    getCustomBackgroundColourBasedOnInventorySlots({ Grids }) {
        const totalSlots = Grids.reduce((totalSlots, grid) => {
            const horizontal = grid._props.cellsH;
            const vertical = grid._props.cellsV;
            const slots = horizontal * vertical;
            return totalSlots += slots;
        }, 0);
        const colourConfig = config_json_1.default.inventorySlotBackgroundColours.find(({ minValue, maxValue }) => totalSlots >= minValue && totalSlots <= maxValue);
        return colourConfig?.colour;
    }
    getCustomBackgroundColourBasedOnPrice({ perSlotTraderPrice, perSlotFleaPrice, traderPrice, fleaPrice }) {
        const { usePerSlotPricingForBackgrounds, useFleaPricesForBackground, fleaValueBackgroundColours, traderValueBackgroundColours, autoUseFleaPricing } = config_json_1.default;
        const overrideWithFleaPrice = autoUseFleaPricing.enabled && (perSlotFleaPrice / perSlotTraderPrice) > autoUseFleaPricing.fleaToTraderValueThresholdRatio;
        const useFleaPrices = useFleaPricesForBackground || overrideWithFleaPrice;
        const price = useFleaPrices
            ? usePerSlotPricingForBackgrounds ? perSlotFleaPrice : fleaPrice
            : usePerSlotPricingForBackgrounds ? perSlotTraderPrice : traderPrice;
        const backgroundColourConfigs = useFleaPrices ? fleaValueBackgroundColours : traderValueBackgroundColours;
        const colourConfig = backgroundColourConfigs.find(({ minValue, maxValue }) => price >= minValue && price <= maxValue);
        return colourConfig?.colour;
    }
    updateItemDescriptions(localeGlobal, pricingMap) {
        for (const localeId in localeGlobal) {
            const locale = localeGlobal[localeId];
            for (const [itemId, pricing] of pricingMap) {
                const originalDescription = locale[`${itemId} Description`];
                const { traderPrice, fleaPrice, perSlotTraderPrice, perSlotFleaPrice, size } = pricing;
                const traderSegment = this.buildPriceSegment("Trader Price", perSlotTraderPrice, traderPrice, size);
                const fleaSegment = this.buildPriceSegment("Flea Price", perSlotFleaPrice, fleaPrice, size);
                const updatedDescription = config_json_1.default.showTraderPricesFirst
                    ? `${traderSegment} | ${fleaSegment} \n\n${originalDescription}`
                    : `${fleaSegment} | ${traderSegment} \n\n${originalDescription}`;
                locale[`${itemId} Description`] = updatedDescription;
            }
        }
    }
    buildPriceSegment(priceType, perSlotPrice, totalPrice, size) {
        const formattedPerSlotPrice = this.getFormattedPriceInThousands(perSlotPrice);
        const formattedTotalPrice = this.getFormattedPriceInThousands(totalPrice);
        const totalPriceSegment = ` per slot (~${formattedTotalPrice}k total)`;
        return `${priceType}: ~${formattedPerSlotPrice}k${size > 1 ? totalPriceSegment : ""}`;
    }
    getFormattedPriceInThousands(price) {
        return (price / 1000).toFixed(1);
    }
}
class Pricing {
    constructor(traderPrice, fleaPrice, size) {
        this.traderPrice = traderPrice;
        this.fleaPrice = fleaPrice;
        this.size = size;
        this.perSlotTraderPrice = traderPrice / size;
        this.perSlotFleaPrice = fleaPrice / size;
    }
}
module.exports = { mod: new EyesOfATraderMod() };
