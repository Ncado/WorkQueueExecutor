"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const workQueueExecutor_1 = require("./workQueueExecutor");
describe("WorkQueueExecutor", () => {
    const timeout = 10000;
    const maxWorkers = 3;
    const queueSize = 10;
    let processingCounter = 0;
    const jobHandlerFunction = (task) => __awaiter(void 0, void 0, void 0, function* () {
        processingCounter++;
        yield new Promise((resolve) => setTimeout(resolve, 100)); // Simulate async work
        processingCounter--;
        return `Processed: ${task}`;
    });
    beforeEach(() => {
        processingCounter = 0;
    });
    test("should handle complex TaskValue and ResultValue", () => __awaiter(void 0, void 0, void 0, function* () {
        const complexTaskHandler = (task) => __awaiter(void 0, void 0, void 0, function* () {
            return { result: "Processed", data: task };
        });
        const complexQueue = new workQueueExecutor_1.WorkQueueExecutor(5, 10000, 2, complexTaskHandler);
        complexQueue.addTask({ complexData: "Example" });
        const results = yield complexQueue.getResults();
        expect(typeof results[0]).toBe("object");
        expect(results[0].data).toEqual({ complexData: "Example" });
    }));
    // Test for QUEUE_SIZE limitation
    test("should not accept more elements than QUEUE_SIZE", () => {
        const queue = new workQueueExecutor_1.WorkQueueExecutor(2, 10000, 2, () => __awaiter(void 0, void 0, void 0, function* () { }));
        expect(() => {
            queue.addTask("task1");
            queue.addTask("task2");
            queue.addTask("task3"); // This should throw an error
        }).toThrow("Queue is full");
    });
    // Test for QUEUE_TIMEOUT
    test("should not work longer than QUEUE_TIMEOUT", () => __awaiter(void 0, void 0, void 0, function* () {
        const longTaskHandler = () => __awaiter(void 0, void 0, void 0, function* () { return new Promise((resolve) => setTimeout(resolve, 2000)); });
        const queue = new workQueueExecutor_1.WorkQueueExecutor(5, 1000, 2, longTaskHandler);
        queue.addTask("task");
        yield expect(queue.getResults()).rejects.toThrow("Timeout exceeded");
    }));
    test("executes tasks and returns results in the order tasks were added", () => __awaiter(void 0, void 0, void 0, function* () {
        const jobHandlerFunction = (task) => __awaiter(void 0, void 0, void 0, function* () {
            // Simulate variable task duration
            const duration = parseInt(task, 10);
            yield new Promise((resolve) => setTimeout(resolve, duration));
            return `Processed: ${task}`;
        });
        const queueSize = 10;
        const timeout = 10000;
        const maxWorkers = 3;
        const testQueue = new workQueueExecutor_1.WorkQueueExecutor(queueSize, timeout, maxWorkers, jobHandlerFunction);
        // Add tasks with variable durations
        testQueue.addTask("50"); // Task that takes 50ms
        testQueue.addTask("30"); // Task that takes 30ms
        testQueue.addTask("10"); // Task that takes 10ms
        const results = yield testQueue.getResults();
        // Verify results are in the order tasks were added, not in order of completion
        expect(results).toEqual([
            "Processed: 50",
            "Processed: 30",
            "Processed: 10",
        ]);
    }));
    test("should process dynamically added tasks", () => __awaiter(void 0, void 0, void 0, function* () {
        let additionalTaskAdded = false;
        const jobHandlerFunction = (task, executor) => __awaiter(void 0, void 0, void 0, function* () {
            yield new Promise((resolve) => setTimeout(resolve, 100));
            // Dynamically add a new task once
            if (task === "initial" && !additionalTaskAdded) {
                executor.addTask("dynamicallyAdded");
                additionalTaskAdded = true;
            }
            return `Processed: ${task}`;
        });
        const testQueue = new workQueueExecutor_1.WorkQueueExecutor(10, // Queue size
        1000, // Timeout
        2, // Max workers
        jobHandlerFunction);
        testQueue.addTask("initial");
        const results = yield testQueue.getResults();
        expect(results).toContain("Processed: initial");
        expect(results).toContain("Processed: dynamicallyAdded");
        expect(results.length).toBe(2);
    }));
    test("should process all tasks", () => __awaiter(void 0, void 0, void 0, function* () {
        const jobHandlerFunction = (task, queue) => __awaiter(void 0, void 0, void 0, function* () {
            if (task == 1000) {
                queue.addTask(2000);
            }
            yield new Promise((resolve) => setTimeout(resolve, task));
            return `---> ${task}`;
        });
        const testQueue = new workQueueExecutor_1.WorkQueueExecutor(1000, 5000, 4, jobHandlerFunction);
        const tasks = [500, 500, 1000];
        tasks.forEach((task) => testQueue.addTask(task));
        const results = yield testQueue.getResults();
        expect(results).toEqual(tasks.map((task) => `Processed: ${task}`));
    }));
    test("should respect maxWorkers limit", (done) => {
        const testQueue = new workQueueExecutor_1.WorkQueueExecutor(queueSize, timeout, maxWorkers, jobHandlerFunction);
        for (let i = 0; i < 10; i++) {
            testQueue.addTask(`Task ${i}`);
        }
        const interval = setInterval(() => {
            if (processingCounter > maxWorkers) {
                clearInterval(interval);
                done(new Error("maxWorkers limit exceeded"));
            }
            if (processingCounter === 0) {
                clearInterval(interval);
                done();
            }
        }, 100);
    });
});
