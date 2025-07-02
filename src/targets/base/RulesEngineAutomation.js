import { conditionsArgs, conditionsPass } from "../../core/checkConditions.js";

class RulesEngineAutomation {
    constructor(options = {}) {
        this._options = options;
    }

    /**
     * Returns object of options
     * @returns {*}
     */
    get options() {
        return this._options;
    }

    /**
     * Returns logger from options, if it is set
     * @returns {(function(): *)|*}
     */
    get logger() {
        return this.options?.logger;
    }

    /**
     * Logs a message using the logger, if it is set
     * @param level
     * @param strings
     */
    log(level, ...strings) {
        if(this.logger)
            this.logger[level](strings.join(" "));
    }

    static conditionsPass = conditionsPass;
    static conditionsArgs = conditionsArgs;
}

export default RulesEngineAutomation;