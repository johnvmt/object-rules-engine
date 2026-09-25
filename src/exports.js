import RulesEngineAutomation from "./targets/base/RulesEngineAutomation.js";
import SubscriptionObjectRulesEngineAutomation from "./targets/subscription-object/SubscriptionObjectRulesEngineAutomation.js";
import subscribeSubscriptionObjectTemplate from "./targets/subscription-object/subscribeSubscriptionObjectTemplate.js";
import checkConditions, { conditionsArgs, conditionsPass } from "./core/checkConditions.js"
import {
    argIsPathArg,
    pathFromPathArg,
    resolveBasePath,
    resolvePathArg
} from "./targets/subscription-object/subscriptionObjectPaths.js";

export {
    RulesEngineAutomation,
    SubscriptionObjectRulesEngineAutomation,
    checkConditions,
    conditionsArgs,
    conditionsPass,

    // template strings addressing a store the way automations do
    subscribeSubscriptionObjectTemplate,

    // the path language automations and templates share
    argIsPathArg,
    pathFromPathArg,
    resolveBasePath,
    resolvePathArg
}
