"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ConfigTypes_1 = require("C:/snapshot/project/obj/models/enums/ConfigTypes");
const Money_1 = require("C:/snapshot/project/obj/models/enums/Money");
const TradeController_1 = require("C:/snapshot/project/obj/controllers/TradeController");
const base_json_1 = __importDefault(require("../db/base.json"));
const package_json_1 = __importDefault(require("../package.json"));
const config_json_1 = __importDefault(require("../config/config.json"));
const broker_trade_controller_1 = require("./broker_trade_controller");
const verbose_logger_1 = require("./verbose_logger");
const broker_price_manager_1 = require("./broker_price_manager");
const Traders_1 = require("C:/snapshot/project/obj/models/enums/Traders");
const TraderHelper_1 = require("C:/snapshot/project/obj/helpers/TraderHelper");
const DynamicRouterModService_1 = require("C:/snapshot/project/obj/services/mod/dynamicRouter/DynamicRouterModService");
const broker_trade_router_1 = require("./broker_trade_router");
const ItemBaseClassService_1 = require("C:/snapshot/project/obj/services/ItemBaseClassService");
const temporary_ItemBaseClassService_fix_1 = require("./temporary_ItemBaseClassService_fix");
class BrokerTrader {
    constructor() {
        this.mod = `${package_json_1.default.name} ${package_json_1.default.version}`; // Set name of mod so we can log it to console later
    }
    /**
     * Some work needs to be done prior to SPT code being loaded, registering the profile image + setting trader update time inside the trader config json
     * @param container Dependency container
     */
    preAkiLoad(container) {
        BrokerTrader.container = container;
        this.logger = new verbose_logger_1.VerboseLogger(container);
        this.logger.explicitInfo(`[${this.mod}] preAki Loading... `);
        // Temporary
        if (config_json_1.default["useItemBaseClassServiceFix"] === true) {
            this.logger.explicitInfo(`[${this.mod}] Fixing ItemBaseClassService...`);
            container.register(temporary_ItemBaseClassService_fix_1.FixedItemBaseClassService.name, temporary_ItemBaseClassService_fix_1.FixedItemBaseClassService);
            container.register(ItemBaseClassService_1.ItemBaseClassService.name, { useToken: temporary_ItemBaseClassService_fix_1.FixedItemBaseClassService.name });
        }
        if (config_json_1.default.profitCommissionPercentage < 0 || config_json_1.default.profitCommissionPercentage > 99) {
            this.logger.explicitError(`[${this.mod}] Config error! "profitCommissionPercentage": ${config_json_1.default.profitCommissionPercentage}, must have a value not less than 0 and not more than 99.`);
            throw (`${this.mod} Config error. "profitCommissionPercentage" out of range [0-99]`);
        }
        if (config_json_1.default.buyRateDollar < 0 || config_json_1.default.buyRateEuro < 0) {
            this.logger.explicitError(`[${this.mod}] Config error! One of currencies "buyRate", is less than 0.`);
            throw (`${this.mod} Config error. A currency "buyRate" must be a positive number.`);
        }
        if (!(config_json_1.default["useClientPlugin"] ?? true)) {
            this.logger.explicitWarning(`[${this.mod}] Warning! Using this mod with "useClientPlugin": false is not directly supported. Price inaccuracies are expected. If you encounted serious problems(features completely not functioning, endless loadings, server exceptions etc.), please inform the developer directly.`);
        }
        const preAkiModLoader = container.resolve("PreAkiModLoader");
        const imageRouter = container.resolve("ImageRouter");
        const configServer = container.resolve("ConfigServer");
        const traderConfig = configServer.getConfig(ConfigTypes_1.ConfigTypes.TRADER);
        const routerService = container.resolve(DynamicRouterModService_1.DynamicRouterModService.name);
        // Controller override - to handle trade requests
        container.register(broker_trade_controller_1.BrokerTradeController.name, broker_trade_controller_1.BrokerTradeController);
        container.register(TradeController_1.TradeController.name, { useToken: broker_trade_controller_1.BrokerTradeController.name });
        // DataCallbacks override - to handle sell price display
        // container.register<BrokerDataCallbacks>(BrokerDataCallbacks.name, BrokerDataCallbacks);
        // container.register(DataCallbacks.name, {useToken: BrokerDataCallbacks.name});
        // Register router to handle broker-trader specific requests
        broker_trade_router_1.BrokerTraderRouter.registerRouter(container);
        this.registerProfileImage(preAkiModLoader, imageRouter);
        this.setupTraderUpdateTime(traderConfig);
        this.logger.explicitInfo(`[${this.mod}] preAki Loaded`);
    }
    /**
     * Majority of trader-related work occurs after the aki database has been loaded but prior to SPT code being run
     * @param container Dependency container
     */
    postDBLoad(container) {
        this.logger.explicitInfo(`[${this.mod}] postDb Loading... `);
        // !Required! Instantialize BrokerPriceManager after DB has loaded.
        broker_price_manager_1.BrokerPriceManager.getInstance(container);
        // Resolve SPT classes we'll use
        const databaseServer = container.resolve("DatabaseServer");
        // const configServer: ConfigServer = container.resolve<ConfigServer>("ConfigServer");
        // const traderConfig: ITraderConfig = configServer.getConfig(ConfigTypes.TRADER);
        const jsonUtil = container.resolve("JsonUtil");
        // Get a reference to the database tables
        const tables = databaseServer.getTables();
        const brokerBase = { ...base_json_1.default };
        // Ignore config "items_buy" and merge all buy categories from other traders.
        brokerBase.items_buy.category = [];
        brokerBase.items_buy.id_list = [];
        //console.log(JSON.stringify(BrokerPriceManager.instance.supportedTraders));
        for (const tId of Object.values(broker_price_manager_1.BrokerPriceManager.instance.supportedTraders)) {
            const trader = tables.traders[tId];
            // if (trader == undefined) console.log(`[TRADER BASE] ${tId}`);
            brokerBase.items_buy.category = brokerBase.items_buy.category.concat(trader.base.items_buy.category);
            brokerBase.items_buy.id_list = brokerBase.items_buy.id_list.concat(trader.base.items_buy.id_list);
        }
        // Init currency exchange
        if (config_json_1.default.buyRateDollar > 0)
            brokerBase.items_buy.id_list.push(Money_1.Money.DOLLARS);
        else
            brokerBase.items_buy_prohibited.id_list.push(Money_1.Money.DOLLARS);
        if (config_json_1.default.buyRateEuro > 0)
            brokerBase.items_buy.id_list.push(Money_1.Money.EUROS);
        else
            brokerBase.items_buy_prohibited.id_list.push(Money_1.Money.EUROS);
        // Add new trader to the trader dictionary in DatabaseServer
        this.addTraderToDb(base_json_1.default, tables, jsonUtil, container);
        const brokerDesc = "In the past, he worked at one of the largest exchanges in Russia. " +
            "At some point, he decided to move to the growing Norvinsk Special Economic Zone in pursuit of alluring opportunities. " +
            "Whether he somehow knew of the upcoming conflict in the region or not, he definetly found his profits in the current situation. " +
            "Nowadays he provides brokerage services at Tarkov's central market.";
        this.addTraderToLocales(tables, `${base_json_1.default.name} ${base_json_1.default.surname}`, base_json_1.default.name, base_json_1.default.nickname, base_json_1.default.location, brokerDesc);
        this.logger.explicitInfo(`[${this.mod}] postDb Loaded`);
    }
    postAkiLoad(container) {
        // Initialize look-up tables and cache them here.
        // Most likely it's required to be done at "postAkiLoad()" to get proper flea offers from SPT-AKI API.
        // Passing a container is just an extra measure, since it should be already instantialized at "postDBLoad()"
        broker_price_manager_1.BrokerPriceManager.getInstance(container).initializeLookUpTables();
    }
    /**
     * Add profile picture to our trader
     * @param preAkiModLoader mod loader class - used to get the mods file path
     * @param imageRouter image router class - used to register the trader image path so we see their image on trader page
     */
    registerProfileImage(preAkiModLoader, imageRouter) {
        // Reference the mod "res" folder
        const imageFilepath = `./${preAkiModLoader.getModPath(`Nightingale-brokertrader-${package_json_1.default.version}`)}res`;
        // Register a route to point to the profile picture
        imageRouter.addRoute(base_json_1.default.avatar.replace(".png", ""), `${imageFilepath}/broker_portrait1.png`);
    }
    /**
     * Add record to trader config to set the refresh time of trader in seconds (default is 60 minutes)
     * @param traderConfig trader config to add our trader to
     */
    setupTraderUpdateTime(traderConfig) {
        // Add refresh time in seconds to config
        const traderRefreshRecord = { traderId: base_json_1.default._id, seconds: 3600 };
        traderConfig.updateTime.push(traderRefreshRecord);
    }
    /**
     * Add our new trader to the database
     * @param traderDetailsToAdd trader details
     * @param tables database
     * @param jsonUtil json utility class
     */
    // rome-ignore lint/suspicious/noExplicitAny: traderDetailsToAdd comes from base.json, so no type
    addTraderToDb(traderDetailsToAdd, tables, jsonUtil, container) {
        // Add trader to trader table, key is the traders id
        tables.traders[traderDetailsToAdd._id] = {
            assort: this.createAssortTable(tables, jsonUtil, container),
            base: jsonUtil.deserialize(jsonUtil.serialize(traderDetailsToAdd)),
            questassort: {
                started: {},
                success: {},
                fail: {}
            } // Empty object as trader has no assorts unlocked by quests
        };
    }
    /**
     * Create assorts for trader and add milk and a gun to it
     * @returns ITraderAssort
     */
    createAssortTable(tables, jsonUtil, container) {
        // Create a blank assort object, ready to have items added
        const assortTable = {
            nextResupply: 0,
            items: [],
            barter_scheme: {},
            loyal_level_items: {}
        };
        const traderHelper = container.resolve(TraderHelper_1.TraderHelper.name);
        const dollarsId = Money_1.Money.DOLLARS;
        const eurosId = Money_1.Money.EUROS;
        // Get USD and EUR prices from PK and Skier assorts
        const pkAssort = traderHelper.getTraderAssortsById(Traders_1.Traders.PEACEKEEPER);
        const pkUsdItemId = pkAssort.items.find(item => item._tpl === dollarsId)._id;
        const pkDollarPrice = pkAssort.barter_scheme[pkUsdItemId][0][0].count;
        const skiAssort = traderHelper.getTraderAssortsById(Traders_1.Traders.SKIER);
        const skiEurItemId = skiAssort.items.find(item => item._tpl === eurosId)._id;
        const skiEuroPrice = skiAssort.barter_scheme[skiEurItemId][0][0].count;
        // View function documentation for what all the parameters are
        this.addSingleItemToAssort(assortTable, dollarsId, true, 9999999, 1, Money_1.Money.ROUBLES, pkDollarPrice);
        this.addSingleItemToAssort(assortTable, eurosId, true, 9999999, 1, Money_1.Money.ROUBLES, skiEuroPrice);
        // Get the mp133 preset and add to the traders assort (Could make your own Items[] array, doesnt have to be presets)
        // const mp133GunPreset = tables.globals.ItemPresets["584148f2245977598f1ad387"]._items;
        // this.addCollectionToAssort(jsonUtil, assortTable, mp133GunPreset, false, 5, 1, Money.ROUBLES, 500);
        return assortTable;
    }
    /**
     * Add item to assortTable + barter scheme + loyalty level objects
     * @param assortTable trader assorts to add item to
     * @param itemTpl Items tpl to add to traders assort
     * @param unlimitedCount Can an unlimited number of this item be purchased from trader
     * @param stackCount Total size of item stack trader sells
     * @param loyaltyLevel Loyalty level item can be purchased at
     * @param currencyType What currency does item sell for
     * @param currencyValue Amount of currency item can be purchased for
     */
    addSingleItemToAssort(assortTable, itemTpl, unlimitedCount, stackCount, loyaltyLevel, currencyType, currencyValue) {
        // Define item in the table
        const newItem = {
            _id: itemTpl,
            _tpl: itemTpl,
            parentId: "hideout",
            slotId: "hideout",
            upd: {
                UnlimitedCount: unlimitedCount,
                StackObjectsCount: stackCount
            }
        };
        assortTable.items.push(newItem);
        // Barter scheme holds the cost of the item + the currency needed (doesnt need to be currency, can be any item, this is how barter traders are made)
        assortTable.barter_scheme[itemTpl] = [
            [
                {
                    count: currencyValue,
                    _tpl: currencyType
                }
            ]
        ];
        // Set loyalty level needed to unlock item
        assortTable.loyal_level_items[itemTpl] = loyaltyLevel;
    }
    /**
     * Add a complex item to trader assort (item with child items)
     * @param assortTable trader assorts to add items to
     * @param jsonUtil JSON utility class
     * @param items Items array to add to assort
     * @param unlimitedCount Can an unlimited number of this item be purchased from trader
     * @param stackCount Total size of item stack trader sells
     * @param loyaltyLevel Loyalty level item can be purchased at
     * @param currencyType What currency does item sell for
     * @param currencyValue Amount of currency item can be purchased for
     */
    addCollectionToAssort(jsonUtil, assortTable, items, unlimitedCount, stackCount, loyaltyLevel, currencyType, currencyValue) {
        // Deserialize and serialize to ensure we dont alter the original data
        const collectionToAdd = jsonUtil.deserialize(jsonUtil.serialize(items));
        // Update item base with values needed to make item sellable by trader
        collectionToAdd[0].upd = {
            UnlimitedCount: unlimitedCount,
            StackObjectsCount: stackCount
        };
        collectionToAdd[0].parentId = "hideout";
        collectionToAdd[0].slotId = "hideout";
        // Push all the items into the traders assort table
        assortTable.items.push(...collectionToAdd);
        // Barter scheme holds the cost of the item + the currency needed (doesnt need to be currency, can be any item, this is how barter traders are made)
        assortTable.barter_scheme[collectionToAdd[0]._id] = [
            [
                {
                    count: currencyValue,
                    _tpl: currencyType
                }
            ]
        ];
        // Set loyalty level needed to unlock item
        assortTable.loyal_level_items[collectionToAdd[0]._id] = loyaltyLevel;
    }
    /**
     * Add traders name/location/description to the locale table
     * @param tables database tables
     * @param fullName fullname of trader
     * @param firstName first name of trader
     * @param nickName nickname of trader
     * @param location location of trader
     * @param description description of trader
     */
    addTraderToLocales(tables, fullName, firstName, nickName, location, description) {
        // For each language, add locale for the new trader
        const locales = Object.values(tables.locales.global);
        for (const locale of locales) {
            locale[`${base_json_1.default._id} FullName`] = fullName;
            locale[`${base_json_1.default._id} FirstName`] = firstName;
            locale[`${base_json_1.default._id} Nickname`] = nickName;
            locale[`${base_json_1.default._id} Location`] = location;
            locale[`${base_json_1.default._id} Description`] = description;
        }
    }
    addItemToLocales(tables, itemTpl, name, shortName, Description) {
        // For each language, add locale for the new trader
        const locales = Object.values(tables.locales.global);
        for (const locale of locales) {
            locale[`${itemTpl} Name`] = name;
            locale[`${itemTpl} ShortName`] = shortName;
            locale[`${itemTpl} Description`] = Description;
        }
    }
}
module.exports = { mod: new BrokerTrader() };
