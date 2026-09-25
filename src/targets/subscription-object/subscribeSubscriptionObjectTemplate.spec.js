import { NestedObjectWithSubscriptions } from "object-subscriptions";
import { describe, expect, it, vi } from "vitest";
import subscribeSubscriptionObjectTemplate from "./subscribeSubscriptionObjectTemplate.js";

/**
 * A store the way a form builds one: paths written with `/` between the parts, and `..` for the
 * step upwards.
 */
const createStore = (contents) => new NestedObjectWithSubscriptions(contents, {
    separator: "/",
    parent: "..",
    current: "."
});

const EVENT_BASE_PATHS = {
    node_value: ["value", "events", "0"],
    root_value: ["value"]
};

/**
 * How a schedule reads: a game is read as one team against another, a bye week as the one team
 * sitting out. Both are read on the same date.
 */
const SCHEDULE_TEMPLATE = [
    {
        condition: { and: { "$[node_value]event_type": { eq: "game" } } },
        template: "${$[node_value]team_1/team_id} vs ${$[node_value]team_2/team_id}, ${$[node_value]timestamp|date}"
    },
    {
        template: "${$[node_value]team/team_id} bye week, ${$[node_value]timestamp|date}"
    }
];

const RENDER_OPTIONS = { locale: "en-US", timeZone: "UTC" };

const settle = async () => {
    for(let round = 0; round < 5; round++)
        await Promise.resolve();
};

const gameEvent = () => ({
    value: {
        events: [{
            event_type: "game",
            team_1: { team_id: "Bears" },
            team_2: { team_id: "Packers" },
            team: { team_id: "Bears" },
            timestamp: "2026-09-05T17:00:00Z"
        }]
    }
});

describe("subscribeSubscriptionObjectTemplate", () => {
    it("reads a game as one team against the other", async () => {
        const store = createStore(gameEvent());
        const callback = vi.fn();

        subscribeSubscriptionObjectTemplate(SCHEDULE_TEMPLATE, store, callback, {
            basePaths: EVENT_BASE_PATHS,
            ...RENDER_OPTIONS
        });

        await settle();

        expect(callback).toHaveBeenLastCalledWith("Bears vs Packers, Sep 5, 2026");
    });

    it("reads a bye week as the one team sitting out", async () => {
        const store = createStore(gameEvent());
        store.set(["value", "events", 0, "event_type"], "bye");

        const callback = vi.fn();

        subscribeSubscriptionObjectTemplate(SCHEDULE_TEMPLATE, store, callback, {
            basePaths: EVENT_BASE_PATHS,
            ...RENDER_OPTIONS
        });

        await settle();

        expect(callback).toHaveBeenLastCalledWith("Bears bye week, Sep 5, 2026");
    });

    // the event is switched in the form, and the header has to follow without being rebuilt
    it("changes how it reads when the event changes", async () => {
        const store = createStore(gameEvent());
        const callback = vi.fn();

        subscribeSubscriptionObjectTemplate(SCHEDULE_TEMPLATE, store, callback, {
            basePaths: EVENT_BASE_PATHS,
            ...RENDER_OPTIONS
        });

        await settle();
        store.set(["value", "events", 0, "event_type"], "bye");
        await settle();

        expect(callback).toHaveBeenLastCalledWith("Bears bye week, Sep 5, 2026");
    });

    it("follows a team being picked in the form", async () => {
        const store = createStore(gameEvent());
        const callback = vi.fn();

        subscribeSubscriptionObjectTemplate(SCHEDULE_TEMPLATE, store, callback, {
            basePaths: EVENT_BASE_PATHS,
            ...RENDER_OPTIONS
        });

        await settle();
        store.set(["value", "events", 0, "team_2", "team_id"], "Lions");
        await settle();

        expect(callback).toHaveBeenLastCalledWith("Bears vs Lions, Sep 5, 2026");
    });

    it("reads a path written from the root of the form", async () => {
        const store = createStore({
            value: {
                season: "2026",
                events: [{ event_type: "game", team_1: { team_id: "Bears" } }]
            }
        });
        const callback = vi.fn();

        subscribeSubscriptionObjectTemplate(
            "${$[root_value]season}: ${$[node_value]team_1/team_id}",
            store,
            callback,
            { basePaths: EVENT_BASE_PATHS }
        );

        await settle();

        expect(callback).toHaveBeenLastCalledWith("2026: Bears");
    });

    it("reads a path written upwards from where it stands", async () => {
        const store = createStore(gameEvent());
        const callback = vi.fn();

        subscribeSubscriptionObjectTemplate(
            "${$[node_value]../0/team_1/team_id}",
            store,
            callback,
            { basePaths: EVENT_BASE_PATHS }
        );

        await settle();

        expect(callback).toHaveBeenLastCalledWith("Bears");
    });

    // a config may name somewhere that does not exist; the rest of the string still reads
    it("leaves a reference pointing nowhere unfilled", async () => {
        const store = createStore(gameEvent());
        const callback = vi.fn();
        const logger = { warn: vi.fn() };

        subscribeSubscriptionObjectTemplate(
            "${$[node_value]team_1/team_id}|${$[nonsense]whatever}",
            store,
            callback,
            { basePaths: EVENT_BASE_PATHS, logger: logger }
        );

        await settle();

        expect(callback).toHaveBeenLastCalledWith("Bears|");
        expect(logger.warn).toHaveBeenCalled();
    });

    it("says nothing more once let go", async () => {
        const store = createStore(gameEvent());
        const callback = vi.fn();

        const cancel = subscribeSubscriptionObjectTemplate(SCHEDULE_TEMPLATE, store, callback, {
            basePaths: EVENT_BASE_PATHS,
            ...RENDER_OPTIONS
        });

        await settle();
        cancel();

        const callsBefore = callback.mock.calls.length;

        store.set(["value", "events", 0, "team_2", "team_id"], "Lions");
        await settle();

        expect(callback.mock.calls.length).toBe(callsBefore);
    });

    it("shows what a reference is called while its value is still being loaded", async () => {
        const store = createStore({ value: { events: [{ event_type: "game" }] } });
        const callback = vi.fn();

        subscribeSubscriptionObjectTemplate(
            "${$[node_value]team_1/team_id} vs ${$[node_value]team_2/team_id}",
            store,
            callback,
            {
                basePaths: EVENT_BASE_PATHS,
                missing: "name",
                nameFromReference: (reference) => reference.endsWith("team_1/team_id") ? "Team 1" : "Team 2"
            }
        );

        await settle();

        expect(callback).toHaveBeenLastCalledWith("Team 1 vs Team 2");
    });
});
