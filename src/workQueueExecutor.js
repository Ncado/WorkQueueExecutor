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
exports.WorkQueueExecutor = void 0;
class WorkQueueExecutor {
    constructor(maxQueueSize, timeout, maxWorkers, taskHandler) {
        this.maxQueueSize = maxQueueSize;
        this.timeout = timeout;
        this.maxWorkers = maxWorkers;
        this.taskHandler = taskHandler;
        this.taskQueue = [];
        this.results = [];
        this.processingCount = 0;
        this.taskIndex = 0;
        this.startTime = Date.now();
        this.results = [];
    }
    addTask(task) {
        if (this.taskQueue.length >= this.maxQueueSize) {
            throw new Error("Queue is full");
        }
        this.taskQueue.push({ task, index: this.taskIndex++ });
        this.results.push(undefined);
    }
    getResults() {
        return new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
            for (let i = 0; i < this.maxWorkers; i++) {
                this.processQueue();
            }
        });
    }
    processQueue() {
        return __awaiter(this, void 0, void 0, function* () {
            if (Date.now() - this.startTime > this.timeout) {
                console.error("Timeout exceeded");
                return this.reject(new Error("Timeout exceeded"));
            }
            if (this.taskQueue.length === 0 && this.processingCount === 0) {
                return this.resolve(this.results);
            }
            while (this.taskQueue.length > 0 &&
                this.processingCount < this.maxWorkers) {
                const { task, index } = this.taskQueue.shift();
                this.processingCount++;
                try {
                    const result = yield this.taskHandler(task, this);
                    this.results[index] = result;
                }
                catch (error) {
                    this.reject(error);
                    return;
                }
                finally {
                    this.processingCount--;
                }
                this.processQueue();
            }
        });
    }
}
exports.WorkQueueExecutor = WorkQueueExecutor;
function jobHandlerFunction(task, queue) {
    return __awaiter(this, void 0, void 0, function* () {
        function generateRandom(min = 0, max = 100) {
            let difference = max - min;
            let rand = Math.random();
            rand = Math.floor(rand * difference);
            rand = rand + min;
            return rand;
        }
        yield new Promise((resolve) => setTimeout(resolve, generateRandom(1000, 3000)));
        console.log(task);
        if (task !== "foo/bar") {
            queue.addTask("foo/bar");
        }
        return `Processed: ${task}`;
    });
}
const QUEUE_SIZE = 29;
const QUEUE_TIMEOUT = 1000000;
const MAX_WORKERS_NUM = 3;
const testQueue = new WorkQueueExecutor(QUEUE_SIZE, QUEUE_TIMEOUT, MAX_WORKERS_NUM, jobHandlerFunction);
testQueue.addTask("111");
testQueue.addTask("222");
testQueue.addTask("33");
testQueue.addTask("444");
testQueue.addTask("555");
testQueue.addTask("666");
testQueue.addTask("777");
testQueue.addTask("888");
testQueue.addTask("99");
testQueue.addTask("10");
testQueue.addTask("11");
testQueue.addTask("12");
testQueue.addTask("13");
testQueue.addTask("14");
testQueue.addTask("15");
testQueue.addTask("16");
testQueue
    .getResults()
    .then((results) => {
    console.log(results);
})
    .catch((error) => {
    console.error("An error occurred:", error);
});
