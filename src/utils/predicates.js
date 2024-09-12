// predicates v0.0.1
const predicates = {
    "and": (...args) => {
        for(let arg of args) {
            if(!arg)
                return false;
        }
        return true;
    },
    "or": (...args) => {
        for(let arg of args) {
            if(arg)
                return true;
        }
        return false;
    },
    "eq": (...args) => {
        const firstValue = args[0];
        for(let value of args.slice(1)) {
            if(value !== firstValue)
                return false;
        }
        return true;
    },
    "neq": (...args) => {
        const firstValue = args[0];
        for(let value of args.slice(1)) {
            if(value === firstValue)
                return false;
        }
        return true;
    },
    "in": {
        function: (...args) => args.slice(1).includes(args[0]),
        validArgs: (...args) => args.length > 1
    },
    "nin": {
        function: (...args) => !args.slice(1).includes(args[0]),
        validArgs: (...args) => args.length > 1
    },
    "gt": (...args) => {
        if(args.length > 2)
            throw new Error("invalid args for gt");
        return args[0] > args[1]
    },
    "gte": (...args) => {
        if(args.length > 2)
            throw new Error("invalid args for gte");
        return args[0] >= args[1]
    },
    "lt": (...args) => {
        if(args.length > 2)
            throw new Error("invalid args for lt");
        return args[0] < args[1]
    },
    "lte": (...args) => {
        if(args.length > 2)
            throw new Error("invalid args for lte");
        return args[0] <= args[1]
    },
    "true": arg => arg === true,
    "truthy": arg => !!arg,
    "false": arg => arg === false,
    "falsey": arg => !arg,
    "undefined": arg => arg === undefined
}

export default predicates;
