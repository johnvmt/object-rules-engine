
## Example

    
    import { NestedObjectWithSubscriptions } from 'object-subscriptions';
    import SubscriptionObjectRulesEngineAutomation
        from "./src/targets/subscription-object/SubscriptionObjectRulesEngineAutomation.js";
    
    // getters need a subscribe()
    const objectOptions = {
        separator: "/",
        parent: "..",
        current: ".",
    };
    
    const object = new NestedObjectWithSubscriptions({
        value: {
            key1: {
                key2: {
                    key3: {
                        key4: "value-key4"
                    }
                }
            }
        },
        schema: {
            key1: {
                _children: {
                    key2: {
                        _children: {
                            key3: {
                                _value: "schema-key3",
                                _children: {
                                    key4: {
                                        _value: "schema-key4"
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }, objectOptions);
    
    const automationConfig = {
        "condition":{
            "and": {
                "$[value]": {
                    "eq": "value-key4"
                },
                "$[schema]../../../_value":"truthy"
            }
        },
        "actions":[
            {
                "action":"set",
                "args":[
                    "$[value]../key4b",
                    "xxx"
                ]
            }
        ]
    }
    
    const automation = new SubscriptionObjectRulesEngineAutomation(
        automationConfig,
        object,
        {
            pathPrefix: "$",
            basePaths: {
                value: ["value", "key1", "key2", "key3", "key4"],
                schema: ["schema", "key1", "_children", "key2", "_children", "key3", "_children", "key4", "_value"]
            }
        }
    )