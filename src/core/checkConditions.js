import predicates from "../utils/predicates.js";

/**
 *
 * @param options
 * @param args
 * @returns {*[]}
 */
const predicateArgs = (options, args) => {
    const values = [];
    if(options.hasOwnProperty('value'))
        values.push(options.value);

    if(Array.isArray(args))
        values.push(...args);
    else if(args !== undefined)
        values.push(args);

    return values;
}

/**
 * Test whether predicate validates args; if so, return result; otherwise, return false
 * @param predicate
 * @param options
 * @param args
 * @returns {false|boolean|*}
 */
const predicateValidArgs = (predicate, options, args) => {
    return (predicate === "object" && typeof predicate.validArgs === "function" && predicate.validArgs(...predicateArgs(options, args)));
}

/**
 * Sanitize conditions in condition(s)
 * @param conditions
 * @returns {*|{}[]}
 */
const conditionsArrayFromConditions = (conditions) => {
    return Array.isArray(conditions)
        ? conditions
        : Object.entries(conditions).map(([predicateOrPath, arg]) => {
            return {[predicateOrPath]: arg}
        });
}

/**
 * Get args (paths or values) from conditions
 * @param conditions
 * @param options
 */
const conditionsArgs = (conditions, options = {}) => {
    const mergedPredicates = {...predicates, ...options.predicates};

    const conditionArgsInternal = (conditions, options, args = new Set()) => {
        if(typeof conditions === "object") { // not a scalar
            const conditionsArray = conditionsArrayFromConditions(conditions);

            for(let condition of conditionsArray) {
                for(let [predicateOrPathOrValue, arg] of Object.entries(condition)) {
                    if(mergedPredicates.hasOwnProperty(predicateOrPathOrValue) && !predicateValidArgs(mergedPredicates[predicateOrPathOrValue], options, arg) && typeof arg === "object" && arg !== null) // predicate key
                        conditionArgsInternal(arg, options, args);
                    else { // value or path key
                        args.add(predicateOrPathOrValue);
                        conditionArgsInternal(arg, options, args);
                    }
                }
            }
        }

        return args;
    }

    return Array.from(conditionArgsInternal(conditions, options));
}

/**
 * Test whether conditions are met
 * @param conditions
 * @param valuesByArg
 * @param predicates
 * @param options
 * @returns {*[]}
 */
const sanitizedConditionsPass = (conditions, valuesByArg, predicates, options = {}) => {
    const executePredicateCondition = (predicateName, options, args) => {
        const predicateFunction = (typeof predicates[predicateName] === "function")
            ? predicates[predicateName]
            : predicates[predicateName].function

        return predicateFunction(...predicateArgs(options, args));
    }

    if(typeof conditions !== "object") // scalar
        return [executePredicateCondition(conditions, options)]

    const conditionsArray = Array.isArray(conditions)
        ? conditions
        : Object.entries(conditions).map(([predicateOrPath, arg]) => {
            return {[predicateOrPath]: arg}
        });

    const results = [];
    for(let condition of conditionsArray) {
        for(let [predicateOrPathOrValue, arg] of Object.entries(condition)) {
            if(predicates.hasOwnProperty(predicateOrPathOrValue)) { // predicate key
                if(predicateValidArgs(predicates[predicateOrPathOrValue], options, arg))
                    results.push(executePredicateCondition(predicateOrPathOrValue, options, arg));
                else if(typeof arg === "object" && arg !== null)
                    results.push(executePredicateCondition(predicateOrPathOrValue, options, sanitizedConditionsPass(arg, valuesByArg, predicates, options)))
                else
                    results.push(executePredicateCondition(predicateOrPathOrValue, options, arg))
            }
            else { // value or path key
                const value = valuesByArg.get(predicateOrPathOrValue);
                results.push(...(sanitizedConditionsPass(arg, valuesByArg, predicates, {...options, value: value})))
            }
        }
    }

    return results;
}

const conditionsPass = async (conditions, options = {}) => {
    const getValue = options.getValue
        ? options.getValue
        : arg => arg; // default: return arg

    const args = conditionsArgs(conditions, getValue, options);
    const values = await Promise.all(args.map(getValue)); // load all args at once

    if(args.length !== values.length)
        throw new Error("values length mismatch");

    const valuesByArg = new Map();

    for(let [index, arg] of Object.entries(args)) {
        valuesByArg.set(arg, values[index]);
    }

    return predicates.and(...sanitizedConditionsPass(conditions, valuesByArg, {...predicates, ...options.predicates}, options));
}

export {
    conditionsArgs,
    conditionsPass,
    conditionsPass as default
}
