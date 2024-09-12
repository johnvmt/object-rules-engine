import RulesEngineAutomation from "../base/RulesEngineAutomation.js";
import {resolvePath} from "../../utils/ObjectUtils.js";
import subscriptionObjectActions from "./subscriptionObjectActions.js";

class SubscriptionObjectRulesEngineAutomation extends RulesEngineAutomation {
    constructor(automationConfig, object, options = {}) {
        super({
            pathPrefix: "$", // denotes an automation path, as opposed to a value
            basePaths: {},
            ...options
        });

        this._automationConfig = automationConfig;
        this._object = object;

        this._actions = subscriptionObjectActions(this);

        // TODO move this into functions
        // extract args from automation config
        // run a calculation using the args
        // on each tick of the calculation, run the automation
        const resolvedAutomationConditionPaths = RulesEngineAutomation.conditionsArgs(automationConfig.condition)
            .filter(arg => this.argIsAutomationPathArg(arg))
            .map(pathArg => this.resolveAutomationPath(this.automationPathFromAutomationPathArg(pathArg)));

        this._cancelCalculator = this._object.calculate(resolvedAutomationConditionPaths, async () => {
            const conditionsPass = await this.conditionsPass();
            // run automations

            if(conditionsPass) {
                for(let automationActionConfig of this._automationConfig.actions) {
                    await this._actions[automationActionConfig.action](...automationActionConfig.args); // TODO check what happens if args if not an array
                }
            }
        }, undefined, {})
    }

    /**
     * Returns object store
     * @returns {*}
     */
    get object() {
        return this._object;
    }

    /**
     * Returns true if no conditions exist or condition passes
     * @returns {*}
     */
    conditionsPass() {
        return SubscriptionObjectRulesEngineAutomation.conditionsPass(
            this._automationConfig.condition,
            {
                getValue: (arg) => { // callback
                    if(this.argIsAutomationPathArg(arg))
                        return this.valueFromAutomationPath(this.automationPathFromAutomationPathArg(arg));
                    else
                        return arg;
                }
            }
        )
    }

    /**
     * Returns value from object from automation path (object path with prefix and possible base path key)
     * @param automationPath
     * @returns {*}
     */
    valueFromAutomationPath(automationPath) {
        return this._object.get(this.resolveAutomationPath(automationPath, this.options.basePaths));
    }

    /**
     * Returns true if an arg in a condition is an automation path (object path with prefix and possible base path key)
     * @param arg
     * @returns {boolean}
     */
    argIsAutomationPathArg(arg) {
        if(typeof arg === "string")
            return arg.startsWith(this.options.pathPrefix);
    }

    /**
     * Returns automation path without its prefix
     * @param pathArg
     * @returns {string}
     */
    automationPathFromAutomationPathArg(pathArg) {
        return pathArg.substring(this.options.pathPrefix.length);
    }

    /**
     * Returns absolute path from automation path (object path with prefix and possible base path key)
     * @param path
     * @returns {*}
     */
    resolveAutomationPath(path) {
        const basePaths = this.options.basePaths;
        const basePathMatch = path.match(/^\[([^\]]+)](.*)$/); // check if uses a basepath

        if(basePathMatch) { // uses base path
            const basePathKey = basePathMatch[1];
            const pathSuffix = basePathMatch[2];

            if(!(basePathKey in basePaths))
                throw new Error(`Unknown base path: ${basePathKey}`);

            return resolvePath(pathSuffix, basePaths[basePathKey], this._object.options); // uses separator from object
        }
        else // absolute path
            return resolvePath(path);
    }

    destroy() {
        // cancel all subscriptions
        this._cancelCalculator();
    }
}

export default SubscriptionObjectRulesEngineAutomation;
