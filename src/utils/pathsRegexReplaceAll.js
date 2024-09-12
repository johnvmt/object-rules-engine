// regex replacement v0.0.1
import { objectGet, objectHas } from "object-subscriptions/src/ObjectUtils.js";

/**
 * Replace parts of a string formatted as stringpart1${pathpart1.pathpart2}stringpart2${pathpart1.pathpart3}
 * @param replacementTemplate
 * @param replacements
 * @param options
 * @returns {*}
 */
const stringTemplateReplace = (replacementTemplate, replacements, options = {}) => {
    const regexp = /\${([^}]+)}/g;
    let results;
    while((results = Array.from(replacementTemplate.matchAll(regexp))).length) { // loop until all are cleared
        for(let index = results.length - 1; index >= 0; index--) { // loop backwards
            const result = results[index];
            if(!objectHas(replacements, result[1], options))
                throw new Error(`Missing replacement "${result[1]}"`);

            const replacementValueString = objectGet(replacements, result[1], options);
            replacementTemplate = `${replacementTemplate.slice(0, result['index'])}${replacementValueString}${replacementTemplate.slice(result['index'] + result[0].length)}`;
        }
    }
    return replacementTemplate;
}

/**
 * Return capture groups from string, {} if no capture groups, or undefined if string does not match regex
 * @param string
 * @param regex
 * @returns {{}}
 */
const stringRegexCaptures = (string, regex) => {
    const match = string.match(regex);
    if(match !== null) {
        return match.slice(1).reduce((replacements, capture, index) => {
            replacements[index + 1] = capture;
            return replacements;
        }, {});
    }
}

export {
    stringRegexCaptures,
    stringTemplateReplace
}
