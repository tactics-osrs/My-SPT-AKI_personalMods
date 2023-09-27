"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerboseLogger = void 0;
const config_json_1 = __importDefault(require("../config/config.json"));
/**
 * An upscaled logger which has optional and explicit logging funcions.
 * Optional functions output a message based on the "verbose" value in config.json:
 *
 * {
 *      "logger": {
 *          "verbose":true/false
 *      }
 * }
 *
 * Version 230322
 */
class VerboseLogger {
    constructor(container) {
        this._logger = container.resolve("WinstonLogger");
        this._verbose = config_json_1.default.logger.verbose;
    }
    get isVerboseEnabled() {
        return this._verbose;
    }
    format(...args) {
        let buffer = args[0];
        const matches = buffer.match(/%\d+[s]/g);
        if (matches != null && args.length > 1) {
            const spaces = matches.map((e) => e.match(/\d+/).pop());
            for (let index = 1; index < args.length; ++index) {
                const argument = (typeof args[index] === "string") ? args[index] : args[index].toString();
                const space = spaces[index - 1];
                let newString = argument;
                if (space > argument.length) {
                    newString += " ".repeat(space - argument.length);
                }
                buffer = buffer.replace(/%\d+[s]/, newString);
            }
        }
        return buffer;
    }
    log(args, color, backgroundColor) {
        if (this._verbose) {
            if (Array.isArray(args))
                this._logger.log(this.format(...args), color, backgroundColor);
            else
                this._logger.log(args, color, backgroundColor);
        }
    }
    info(...args) {
        if (this._verbose) {
            this._logger.info(this.format(...args));
        }
    }
    warning(...args) {
        if (this._verbose) {
            this._logger.warning(this.format(...args));
        }
    }
    error(...args) {
        if (this._verbose) {
            this._logger.error(this.format(...args));
        }
    }
    success(...args) {
        if (this._verbose) {
            this._logger.success(this.format(...args));
        }
    }
    explicitLog(args, color, backgroundColor) {
        if (Array.isArray(args))
            this._logger.log(this.format(...args), color, backgroundColor);
        else
            this._logger.log(args, color, backgroundColor);
    }
    explicitInfo(...args) {
        this._logger.info(this.format(...args));
    }
    explicitWarning(...args) {
        this._logger.warning(this.format(...args));
    }
    explicitError(...args) {
        this._logger.error(this.format(...args));
    }
    explicitSuccess(...args) {
        this._logger.success(this.format(...args));
    }
}
exports.VerboseLogger = VerboseLogger;
