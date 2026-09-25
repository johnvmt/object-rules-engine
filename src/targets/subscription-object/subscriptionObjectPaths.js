import { resolvePath } from "object-path-utilities";

/**
 * How a config addresses one part of a store from another.
 *
 * A path is marked as a path, rather than a value, by its prefix, and may be written from one of
 * the places the caller has named: `$[node_value]../team_1/team_id` is read from wherever
 * `node_value` stands. This was written twice - once for automations and once for the form's own
 * path resolution - so it lives here, where both can take it.
 */

const DEFAULT_PATH_PREFIX = "$";

const BASE_PATH_PATTERN = /^\[([^\]]+)](.*)$/;

/**
 * Whether an arg in a config is a path, as opposed to a value written out
 * @param arg
 * @param pathPrefix
 * @returns {boolean}
 */
const argIsPathArg = (arg, pathPrefix = DEFAULT_PATH_PREFIX) =>
    typeof arg === "string" && arg.startsWith(pathPrefix);

/**
 * A path without the prefix marking it as one
 * @param pathArg
 * @param pathPrefix
 * @returns {string}
 */
const pathFromPathArg = (pathArg, pathPrefix = DEFAULT_PATH_PREFIX) =>
    pathArg.substring(pathPrefix.length);

/**
 * Resolve a path, which may be written from one of the named base paths
 * @param path - without its prefix
 * @param basePaths
 * @param objectOptions - the store's own path options, for the separator and the step upwards
 * @returns {Array} path parts
 */
const resolveBasePath = (path, basePaths = {}, objectOptions = {}) => {
    const basePathMatch = path.match(BASE_PATH_PATTERN);

    if(!basePathMatch)
        return resolvePath(path, [], objectOptions);

    const basePathKey = basePathMatch[1];
    const pathSuffix = basePathMatch[2];

    if(!(basePathKey in basePaths))
        throw new Error(`Unknown base path: ${basePathKey}`);

    return resolvePath(pathSuffix, basePaths[basePathKey], objectOptions);
};

/**
 * Resolve an arg that may or may not be marked as a path
 * @param pathArg
 * @param basePaths
 * @param options
 * @returns {Array} path parts
 */
const resolvePathArg = (pathArg, basePaths = {}, options = {}) => {
    const pathPrefix = options.pathPrefix ?? DEFAULT_PATH_PREFIX;

    const path = argIsPathArg(pathArg, pathPrefix)
        ? pathFromPathArg(pathArg, pathPrefix)
        : pathArg;

    return resolveBasePath(path, basePaths, options.object ?? {});
};

export {
    DEFAULT_PATH_PREFIX,
    argIsPathArg,
    pathFromPathArg,
    resolveBasePath,
    resolvePathArg
};
