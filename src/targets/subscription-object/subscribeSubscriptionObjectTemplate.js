import { subscribeTemplateConfig } from "object-template-string";
import { conditionsArgs, conditionsPass } from "../../core/checkConditions.js";
import { argIsPathArg, resolvePathArg } from "./subscriptionObjectPaths.js";

/**
 * Follow a template string, or a template that reads differently depending on the data, against a
 * store that can be subscribed to.
 *
 * Templates point at the store the same way automations do, so a template written in a form config
 * addresses the rest of the form in the language the config already uses:
 *
 *   [
 *     { "condition": { "and": { "$[node_value]event_type": { "eq": "game" } } },
 *       "template": "${$[node_value]team_1/team_id} vs ${$[node_value]team_2/team_id}" },
 *     { "template": "${$[node_value]team/team_id} bye week" }
 *   ]
 *
 * @param templateConfig - a string, a list of branches, or { branches, default }
 * @param object - a store with subscribe(pathParts, callback) => cancel
 * @param callback - given the filled-in string, or undefined when no branch fits
 * @param options
 * @param {object} [options.basePaths] - where a path may be written from
 * @param {string} [options.pathPrefix] - what marks an arg as a path, default $
 * @param {function} [options.resolveReference] - (reference) => store path parts, when the caller
 *        resolves paths its own way
 * @param {function} [options.subscribeResolver] - (reference, onValue) => cancel, when what a
 *        reference stands for is more than the value sitting at its path
 * @param {object} [options.logger]
 * @returns {function} stops following
 */
const subscribeSubscriptionObjectTemplate = (templateConfig, object, callback, options = {}) => {
    const basePaths = options.basePaths ?? {};
    const pathPrefix = options.pathPrefix ?? "$";

    const resolveReference = options.resolveReference
        ?? ((reference) => resolvePathArg(reference, basePaths, {
            pathPrefix: pathPrefix,
            object: object.options
        }));

    const subscribeReferenceValue = (reference, onValue) => {
        let storePathParts;

        try {
            storePathParts = resolveReference(reference);
        }
        catch(error) {
            // a template pointing somewhere that does not exist leaves that part unfilled, rather
            // than taking down whatever is being drawn
            options.logger?.warn?.(`Template string reference could not be resolved: ${reference} (${error.message})`);
            onValue(undefined);
            return;
        }

        return object.subscribe(storePathParts, onValue);
    };

    return subscribeTemplateConfig(templateConfig, callback, {
        ...options,

        subscribeResolver: options.subscribeResolver ?? subscribeReferenceValue,

        // a condition is read off the store itself, whatever a reference in a template is taken to
        // stand for
        conditionSubscribeResolver: subscribeReferenceValue,

        // only the parts of a condition that are paths are followed; anything else is a value
        // written out in the config, and is already in hand
        conditionArgs: (condition) => conditionsArgs(condition)
            .filter(arg => argIsPathArg(arg, pathPrefix)),

        conditionsPass: (condition, getValue) => conditionsPass(condition, {
            getValue: (arg) => argIsPathArg(arg, pathPrefix) ? getValue(arg) : arg,
            predicates: options.predicates,
            logger: options.logger
        })
    });
};

export {
    subscribeSubscriptionObjectTemplate,
    subscribeSubscriptionObjectTemplate as default
};
