/**
 * Returns object of automations using the context of the automation
 * @param automation
 * @returns {{set: *}}
 */
const subscriptionObjectActions = (automation) => {

    return {
        set: (pathArg, value) => {
            const automationPath = automation.argIsAutomationPathArg(pathArg) // begins with prefix
                ? automation.automationPathFromAutomationPathArg(pathArg) // trim prefix
                : pathArg;
            const resolvedPath = automation.resolveAutomationPath(automationPath);
            automation.object.set(resolvedPath, value);
        }
    }
}

export default subscriptionObjectActions;