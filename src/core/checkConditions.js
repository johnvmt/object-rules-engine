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
    return (typeof predicate === "object" && typeof predicate.validArgs === "function" && predicate.validArgs(...predicateArgs(options, args)));
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
 * How one entry of a condition is to be read
 *
 * A key is either the name of a predicate or a path to a value. A predicate that declares
 * validArgs and accepts what it has been handed takes that argument whole -- the list for in,
 * say -- so there is nothing below it to descend into. Any other predicate handed an object is
 * being handed conditions of its own.
 *
 * Both passes over a condition have to agree on this, or one of them will subscribe to paths the
 * other never reads
 *
 * @param key
 * @param arg
 * @param predicates
 * @param options
 * @returns {"path"|"nested"|"literal"}
 */
const conditionEntryKind = (key, arg, predicates, options) => {
    if(!predicates.hasOwnProperty(key))
        return "path";
    else if(predicateValidArgs(predicates[key], options, arg))
        return "literal";
    else
        return (typeof arg === "object" && arg !== null) ? "nested" : "literal";
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
                    switch(conditionEntryKind(predicateOrPathOrValue, arg, mergedPredicates, options)) {
                        case "nested":
                            conditionArgsInternal(arg, options, args);
                            break;
                        case "path":
                            args.add(predicateOrPathOrValue);
                            // Below a path the value slot is filled in, and whether it is filled
                            // is what decides how many arguments a predicate such as in is being
                            // offered, so it has to be filled here too
                            conditionArgsInternal(arg, {...options, value: undefined}, args);
                            break;
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
        const predicate = predicates[predicateName];

        if(predicate === undefined)
            throw new Error(`Unknown predicate "${predicateName}"`);

        const predicateFunction = (typeof predicate === "function")
            ? predicate
            : predicate.function

        return predicateFunction(...predicateArgs(options, args));
    }

    if(typeof conditions !== "object") // scalar
        return [executePredicateCondition(conditions, options)]

    const conditionsArray = conditionsArrayFromConditions(conditions);

    const results = [];
    for(let condition of conditionsArray) {
        for(let [predicateOrPathOrValue, arg] of Object.entries(condition)) {
            switch(conditionEntryKind(predicateOrPathOrValue, arg, predicates, options)) {
                case "nested":
                    results.push(executePredicateCondition(predicateOrPathOrValue, options, sanitizedConditionsPass(arg, valuesByArg, predicates, options)))
                    break;
                case "literal":
                    results.push(executePredicateCondition(predicateOrPathOrValue, options, arg))
                    break;
                case "path":
                    results.push(...(sanitizedConditionsPass(arg, valuesByArg, predicates, {...options, value: valuesByArg.get(predicateOrPathOrValue)})))
                    break;
            }
        }
    }

    return results;
}

const conditionsPass = async (conditions, options = {}) => {
    const getValue = options.getValue
        ? options.getValue
        : arg => arg; // default: return arg

    const args = conditionsArgs(conditions, options);
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
