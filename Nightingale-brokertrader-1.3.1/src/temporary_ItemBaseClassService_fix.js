"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FixedItemBaseClassService = void 0;
const ILogger_1 = require("C:/snapshot/project/obj/models/spt/utils/ILogger");
const DatabaseServer_1 = require("C:/snapshot/project/obj/servers/DatabaseServer");
const ItemBaseClassService_1 = require("C:/snapshot/project/obj/services/ItemBaseClassService");
const LocalisationService_1 = require("C:/snapshot/project/obj/services/LocalisationService");
const tsyringe_1 = require("C:/snapshot/project/node_modules/tsyringe");
/**
 * Cache the baseids for each item in the tiems db inside a dictionary
 */
let FixedItemBaseClassService = exports.FixedItemBaseClassService = class FixedItemBaseClassService extends ItemBaseClassService_1.ItemBaseClassService {
    constructor(logger, localisationService, databaseServer) {
        super(logger, localisationService, databaseServer);
        this.logger = logger;
        this.localisationService = localisationService;
        this.databaseServer = databaseServer;
    }
    /**
     * Does item tpl inherit from the requested base class
     * @param itemTpl item to check base classes of
     * @param baseClass base class to check for
     * @returns true if item inherits from base class passed in
     */
    itemHasBaseClass(itemTpl, baseClasses) {
        if (!this.cacheGenerated) {
            this.hydrateItemBaseClassCache();
        }
        // No item in cache
        if (!this.itemBaseClassesCache[itemTpl]) {
            const allDbItems = this.databaseServer.getTables().templates.items;
            if (!allDbItems) {
                this.logger.warning(this.localisationService.getText("baseclass-missing_db_no_cache"));
                return false;
            }
            if (!allDbItems[itemTpl]) {
                this.logger.warning(this.localisationService.getText("baseclass-item_not_found", itemTpl));
                return false;
            }
            // If item exists in db, but not in cache - update cache
            this.hydrateItemBaseClassCache();
        }
        return this.itemBaseClassesCache[itemTpl].some(x => baseClasses.includes(x));
    }
};
exports.FixedItemBaseClassService = FixedItemBaseClassService = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)("WinstonLogger")),
    __param(1, (0, tsyringe_1.inject)("LocalisationService")),
    __param(2, (0, tsyringe_1.inject)("DatabaseServer")),
    __metadata("design:paramtypes", [typeof (_a = typeof ILogger_1.ILogger !== "undefined" && ILogger_1.ILogger) === "function" ? _a : Object, typeof (_b = typeof LocalisationService_1.LocalisationService !== "undefined" && LocalisationService_1.LocalisationService) === "function" ? _b : Object, typeof (_c = typeof DatabaseServer_1.DatabaseServer !== "undefined" && DatabaseServer_1.DatabaseServer) === "function" ? _c : Object])
], FixedItemBaseClassService);
