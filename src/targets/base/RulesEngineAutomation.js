import { conditionsArgs, conditionsPass } from "../../core/checkConditions.js";

class RulesEngineAutomation {
    constructor(options) {
        this._options = options;
    }

    get options() {
        return this._options;
    }
    static conditionsPass = conditionsPass;
    static conditionsArgs = conditionsArgs;
}

export default RulesEngineAutomation;