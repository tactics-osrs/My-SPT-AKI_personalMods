"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrokerTraderRouter = void 0;
const DynamicRouterModService_1 = require("C:/snapshot/project/obj/services/mod/dynamicRouter/DynamicRouterModService");
const JsonUtil_1 = require("C:/snapshot/project/obj/utils/JsonUtil");
const broker_price_manager_1 = require("./broker_price_manager");
const package_json_1 = __importDefault(require("../package.json"));
const config_json_1 = __importDefault(require("../config/config.json"));
const verbose_logger_1 = require("./verbose_logger");
const HttpResponseUtil_1 = require("C:/snapshot/project/obj/utils/HttpResponseUtil");
const ConfigServer_1 = require("C:/snapshot/project/obj/servers/ConfigServer");
const ConfigTypes_1 = require("C:/snapshot/project/obj/models/enums/ConfigTypes");
class BrokerTraderRouter {
    static registerRouter(container) {
        this.container = container;
        this.router = container.resolve(DynamicRouterModService_1.DynamicRouterModService.name);
        this.jsonUtil = container.resolve(JsonUtil_1.JsonUtil.name);
        this.http = container.resolve(HttpResponseUtil_1.HttpResponseUtil.name);
        const logger = new verbose_logger_1.VerboseLogger(container);
        logger.explicitInfo(`${this.logPrefix} Registering BrokerTraderRouter...`);
        this.router.registerDynamicRouter("BrokerTraderRouter", [
            {
                url: "/broker-trader/get/mod-config",
                action: (url, info, sessionId, output) => {
                    return this.respondGetModConfig();
                }
            },
            {
                url: "/broker-trader/get/currency-base-prices",
                action: (url, info, sessionId, output) => {
                    return this.respondGetCurrencyBasePrices();
                }
            },
            {
                url: "/broker-trader/get/supported-trader-ids",
                action: (url, info, sessionId, output) => {
                    return this.respondGetSupportedTraderIds();
                }
            },
            {
                url: "/broker-trader/get/item-ragfair-price-table",
                action: (url, info, sessionId, output) => {
                    return this.respondGetItemRagfairPriceTable();
                }
            },
            {
                url: "/broker-trader/post/sold-items-data",
                action: (url, info, sessionId, output) => {
                    //console.log(`[BROKER] ${JSON.stringify(info)}`);
                    return this.respondPostSoldItemsData(info);
                }
            },
            {
                url: "/broker-trader/get/ragfair-sell-rep-gain",
                action: (url, info, sessionId, output) => {
                    return this.respondGetRagfairSellRepGain();
                }
            }
        ], "broker-trader");
    }
    static respondGetModConfig() {
        return this.http.getBody({
            BuyRateDollar: config_json_1.default.buyRateDollar,
            BuyRateEuro: config_json_1.default.buyRateEuro,
            ProfitCommissionPercentage: config_json_1.default.profitCommissionPercentage,
            UseRagfair: config_json_1.default.useRagfair,
            RagfairIgnoreAttachments: config_json_1.default.ragfairIgnoreAttachments,
            RagfairIgnoreFoundInRaid: config_json_1.default.ragfairIgnoreFoundInRaid,
            RagfairIgnorePlayerLevel: config_json_1.default.ragfairIgnorePlayerLevel,
            TradersIgnoreUnlockedStatus: config_json_1.default.tradersIgnoreUnlockedStatus,
            UseNotifications: config_json_1.default.useNotifications,
            NotificationsLongerDuration: config_json_1.default.notificationsLongerDuration,
            UseClientPlugin: config_json_1.default.useClientPlugin ?? true
        });
    }
    static respondGetCurrencyBasePrices() {
        return this.http.getBody(broker_price_manager_1.BrokerPriceManager.instance.currencyBasePrices);
    }
    static respondGetSupportedTraderIds() {
        return this.http.getBody(broker_price_manager_1.BrokerPriceManager.instance.supportedTraders);
    }
    static respondGetItemRagfairPriceTable() {
        return this.http.getBody(broker_price_manager_1.BrokerPriceManager.instance.itemRagfairPriceTable);
    }
    static respondPostSoldItemsData(info) {
        broker_price_manager_1.BrokerPriceManager.instance.setClientBrokerPriceData(info);
        return this.http.emptyResponse(); // Response is not really processed in the client in any way.
    }
    static respondGetRagfairSellRepGain() {
        const configServer = this.container.resolve(ConfigServer_1.ConfigServer.name);
        const ragfairConfig = configServer.getConfig(ConfigTypes_1.ConfigTypes.RAGFAIR);
        return this.http.getBody(ragfairConfig.sell.reputation.gain);
    }
}
exports.BrokerTraderRouter = BrokerTraderRouter;
BrokerTraderRouter.logPrefix = `[${package_json_1.default.name} ${package_json_1.default.version}]`;
