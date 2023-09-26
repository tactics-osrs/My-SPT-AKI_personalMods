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

import { DependencyContainer } from "tsyringe";

import { DatabaseServer } from "@spt-aki/servers/DatabaseServer";
import { IPostDBLoadMod } from "@spt-aki/models/external/IPostDBLoadMod";
import { ILocaleBase } from "@spt-aki/models/spt/server/ILocaleBase";
import { ILogger } from "@spt-aki/models/spt/utils/ILogger";
import { Category, HandbookItem } from "@spt-aki/models/eft/common/tables/IHandbookBase";
import { RagfairPriceService } from "@spt-aki/services/RagfairPriceService";
import { IDatabaseTables } from "@spt-aki/models/spt/server/IDatabaseTables";
import { Money } from "@spt-aki/models/enums/Money";

import config from "../config.json";
import categoryConfig from "../categories.json";
import { Props } from "@spt-aki/models/eft/common/tables/ITemplateItem";

class EyesOfATraderMod implements IPostDBLoadMod {
  private logger: ILogger;
  private container: DependencyContainer;

  private modName = "[Eyes of a Trader]";

  // We want to cache all (sub)categories of the Handbook that we have enabled our mod for otherwise we'll recursively search thousands of times.
  private categoryConfigs: CategoryConfig[] = [];

  public postDBLoad(container: DependencyContainer): void {
    this.container = container;
    this.logger = container.resolve<ILogger>("WinstonLogger");

    const databaseServer = container.resolve<DatabaseServer>("DatabaseServer");
    const tables = databaseServer.getTables();
    const handbookCategories = tables.templates.handbook.Categories;
    
    this.cacheEnabledCategories(handbookCategories);

    // Easiest way to make mod compatible with Lua's flea updater is let the user choose when to load the mod...
    setTimeout(() => this.retrievePricingAndUpdateDescriptions(tables), config.delayStartInSeconds * 1000);
  }

  private retrievePricingAndUpdateDescriptions(tables: IDatabaseTables): void {
    const itemTable = tables.templates.items;
    const handbookItems = tables.templates.handbook.Items;

    // Need this to update the descriptions later
    const pricingMap = new Map<string, Pricing>();

    for (const handbookItem of handbookItems) {
      const itemId = handbookItem.Id;
      const item = itemTable[itemId];
      const itemProps = item._props;
      const isValidItem = itemProps.Name && itemProps.Name !== "Dog tag" && !itemProps.QuestItem;

      // If a categoryConfig exists for this handbook item, it means we want to display prices for this item!
      const categoryConfig = this.categoryConfigs.find(category => category.id === handbookItem.ParentId);

      if (categoryConfig && isValidItem) {
        const pricing = new Pricing(
          this.getApproxTraderPrice(handbookItems, itemId),
          this.getApproxFleaPrice(itemId),
          itemProps.Width * itemProps.Height
        );

        pricingMap.set(itemId, pricing);

        // Display custom background colours if forced via category configs or
        // Disable custom background colours if disabled globally or per category.
        if (
          categoryConfig.forceCustomBackgroundColours ||
          config.useCustomBackgroundColours && 
          !categoryConfig.disableCustomBackgroundColours
        ) {
          const customColour = categoryConfig.useSlotsBasedBackgroundColours
            ? this.getCustomBackgroundColourBasedOnInventorySlots(itemProps)
            : this.getCustomBackgroundColourBasedOnPrice(pricing);
            
          if (customColour && (categoryConfig.forceCustomBackgroundColours || config.updateVioletItemBackground || itemProps.BackgroundColor !== "violet")) {
            itemProps.BackgroundColor = customColour;
          }
        }
      }
    }

    this.updateItemDescriptions(tables.locales.global, pricingMap);

    this.logger.success(`${this.modName}: Success! Found ${pricingMap.size} items to update.`);
  }

  private cacheEnabledCategories(handbookCategories: Category[]): void {
    if (this.categoryConfigs.length === 0) {
      categoryConfig.enabledCategories.forEach((categoryConfig: CategoryConfig) => {
        // We gotta add the parent categories first
        this.categoryConfigs.push(categoryConfig);

        this.addSubCategoriesRecursively(handbookCategories, categoryConfig)
      });
    }
  }

  private addSubCategoriesRecursively(allCategories: Category[], categoryConfig: CategoryConfig): void {
    const subCategories = allCategories.filter(category => category.ParentId === categoryConfig.id);
    if (subCategories.length) {
      const subCategoryConfigs = subCategories.map((subCategory): CategoryConfig => ({
        id: subCategory.Id,
        disableCustomBackgroundColours: categoryConfig.disableCustomBackgroundColours,
        forceCustomBackgroundColours: categoryConfig.forceCustomBackgroundColours,
        useSlotsBasedBackgroundColours: categoryConfig.useSlotsBasedBackgroundColours
      }));
      this.categoryConfigs = this.categoryConfigs.concat(subCategoryConfigs);

      subCategoryConfigs.forEach(categoryConfig => this.addSubCategoriesRecursively(allCategories, categoryConfig));
    }
  }

  private getApproxTraderPrice(handbookItems: HandbookItem[], itemId: string): number {
    const fullPrice = handbookItems.find(item => item.Id === itemId)?.Price;
    if (!fullPrice) {
      this.logger.warning(`${this.modName}: Could not find trader price data for ${itemId}`);
      return 0;
    }
    return fullPrice * config.traderPriceMultiplier;
  }

  private getApproxFleaPrice(itemId: string): number {
    const ragfairService = this.container.resolve<RagfairPriceService>("RagfairPriceService");
    const item = {
      _id: itemId,
      _tpl: itemId
    }
    const dynamicPrice = ragfairService.getDynamicOfferPrice([item], Money.ROUBLES);
    return dynamicPrice * config.fleaPriceMultiplier;
  }

  private getCustomBackgroundColourBasedOnInventorySlots({ Grids }: Props): string {
    const totalSlots = Grids.reduce((totalSlots, grid) => {
      const horizontal = grid._props.cellsH;
      const vertical = grid._props.cellsV;
      const slots = horizontal * vertical;

      return totalSlots += slots;
    }, 0);

    const colourConfig = config.inventorySlotBackgroundColours.find(({ minValue, maxValue }) => totalSlots >= minValue && totalSlots <= maxValue);
    return colourConfig?.colour;
  }

  private getCustomBackgroundColourBasedOnPrice({ perSlotTraderPrice, perSlotFleaPrice, traderPrice, fleaPrice }: Pricing): string {
    const { usePerSlotPricingForBackgrounds, useFleaPricesForBackground, fleaValueBackgroundColours, traderValueBackgroundColours, autoUseFleaPricing } = config;
    const overrideWithFleaPrice = autoUseFleaPricing.enabled && (perSlotFleaPrice / perSlotTraderPrice) > autoUseFleaPricing.fleaToTraderValueThresholdRatio;
    const useFleaPrices = useFleaPricesForBackground || overrideWithFleaPrice;
    const price =  useFleaPrices
      ? usePerSlotPricingForBackgrounds ? perSlotFleaPrice : fleaPrice
      : usePerSlotPricingForBackgrounds ? perSlotTraderPrice : traderPrice
    
    const backgroundColourConfigs = useFleaPrices ? fleaValueBackgroundColours : traderValueBackgroundColours;
    const colourConfig = backgroundColourConfigs.find(({ minValue, maxValue }) => price >= minValue && price <= maxValue);
    return colourConfig?.colour;
  }

  private updateItemDescriptions(localeGlobal: ILocaleBase["global"], pricingMap: Map<string, Pricing>): void {
    for (const localeId in localeGlobal) {
      const locale = localeGlobal[localeId];
      
      for (const [itemId, pricing] of pricingMap) {
        const originalDescription = locale[`${itemId} Description`];
        const { traderPrice, fleaPrice, perSlotTraderPrice, perSlotFleaPrice, size } = pricing;
        const traderSegment = this.buildPriceSegment("Trader Price", perSlotTraderPrice, traderPrice, size);
        const fleaSegment = this.buildPriceSegment("Flea Price", perSlotFleaPrice, fleaPrice, size);
        const updatedDescription = config.showTraderPricesFirst
          ? `${traderSegment} | ${fleaSegment} \n\n${originalDescription}`
          : `${fleaSegment} | ${traderSegment} \n\n${originalDescription}`

        locale[`${itemId} Description`] = updatedDescription;
      }
    }
  }

  private buildPriceSegment(priceType: string, perSlotPrice: number, totalPrice: number, size: number): string {
    const formattedPerSlotPrice = this.getFormattedPriceInThousands(perSlotPrice);
    const formattedTotalPrice = this.getFormattedPriceInThousands(totalPrice);
    const totalPriceSegment = ` per slot (~${formattedTotalPrice}k total)`;
    return `${priceType}: ~${formattedPerSlotPrice}k${size > 1 ? totalPriceSegment : "" }`;
  }

  private getFormattedPriceInThousands(price: number): string {
    return (price / 1000).toFixed(1);
  }
}

class Pricing {
  perSlotTraderPrice: number;
  perSlotFleaPrice: number;

  constructor(
    public traderPrice: number,
    public fleaPrice: number,
    public size: number
  ) {
    this.perSlotTraderPrice = traderPrice / size;
    this.perSlotFleaPrice = fleaPrice / size;
  }
}

interface CategoryConfig {
  id: string;
  description?: string;
  disableCustomBackgroundColours?: boolean;
  forceCustomBackgroundColours?: boolean;
  useSlotsBasedBackgroundColours?: boolean;
}

module.exports = { mod: new EyesOfATraderMod() };
