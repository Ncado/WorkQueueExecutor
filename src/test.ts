import { WorkQueueExecutor } from "./workQueueExecutor";

describe("WorkQueueExecutor", () => {
  const timeout = 10000;
  const maxWorkers = 3;
  const queueSize = 10;
  let processingCounter = 0;

  const jobHandlerFunction = async (task: string): Promise<string> => {
    processingCounter++;
    await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate async work
    processingCounter--;
    return `Processed: ${task}`;
  };

  beforeEach(() => {
    processingCounter = 0;
  });
  test("should handle complex TaskValue and ResultValue", async () => {
    const complexTaskHandler = async (task: { complexData: string }) => {
      return { result: "Processed", data: task };
    };
    const complexQueue = new WorkQueueExecutor(5, 10000, 2, complexTaskHandler);
    complexQueue.addTask({ complexData: "Example" });
    const results = await complexQueue.getResults();
    expect(typeof results[0]).toBe("object");
    expect(results[0].data).toEqual({ complexData: "Example" });
  });

  // Test for QUEUE_SIZE limitation
  test("should not accept more elements than QUEUE_SIZE", () => {
    const queue = new WorkQueueExecutor(2, 10000, 2, async () => {});
    expect(() => {
      queue.addTask("task1");
      queue.addTask("task2");
      queue.addTask("task3"); // This should throw an error
    }).toThrow("Queue is full");
  });

  // Test for QUEUE_TIMEOUT
  test("should not work longer than QUEUE_TIMEOUT", async () => {
    const longTaskHandler = async () =>
      new Promise((resolve) => setTimeout(resolve, 2000));
    const queue = new WorkQueueExecutor(5, 1000, 2, longTaskHandler);
    queue.addTask("task");
    await expect(queue.getResults()).rejects.toThrow("Timeout exceeded");
  });

  test("executes tasks and returns results in the order tasks were added", async () => {
    const jobHandlerFunction = async (task: string): Promise<string> => {
      // Simulate variable task duration
      const duration = parseInt(task, 10);
      await new Promise((resolve) => setTimeout(resolve, duration));
      return `Processed: ${task}`;
    };

    const queueSize = 10;
    const timeout = 10000;
    const maxWorkers = 3;
    const testQueue = new WorkQueueExecutor<string, string>(
      queueSize,
      timeout,
      maxWorkers,
      jobHandlerFunction,
    );

    // Add tasks with variable durations
    testQueue.addTask("50"); // Task that takes 50ms
    testQueue.addTask("30"); // Task that takes 30ms
    testQueue.addTask("10"); // Task that takes 10ms

    const results = await testQueue.getResults();

    // Verify results are in the order tasks were added, not in order of completion
    expect(results).toEqual([
      "Processed: 50",
      "Processed: 30",
      "Processed: 10",
    ]);
  });
  test("should process dynamically added tasks", async () => {
    let additionalTaskAdded = false;
    const jobHandlerFunction = async (
      task: string,
      executor: WorkQueueExecutor<string, string>,
    ): Promise<string> => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Dynamically add a new task once
      if (task === "initial" && !additionalTaskAdded) {
        executor.addTask("dynamicallyAdded");
        additionalTaskAdded = true;
      }

      return `Processed: ${task}`;
    };

    const testQueue = new WorkQueueExecutor<string, string>(
      10, // Queue size
      1000, // Timeout
      2, // Max workers
      jobHandlerFunction,
    );

    testQueue.addTask("initial");

    const results = await testQueue.getResults();

    expect(results).toContain("Processed: initial");
    expect(results).toContain("Processed: dynamicallyAdded");
    expect(results.length).toBe(2);
  });
  test("should process all tasks", async () => {
    const jobHandlerFunction = async (
      task: number,
      queue: WorkQueueExecutor<number, string>,
    ): Promise<string> => {
      if (task == 1000) {
        queue.addTask(2000);
      }
      await new Promise((resolve) => setTimeout(resolve, task));

      return `---> ${task}`;
    };
    const testQueue = new WorkQueueExecutor<number, string>(
      1000,
      5000,
      4,
      jobHandlerFunction,
    );

    const tasks = [500, 500, 1000];
    tasks.forEach((task) => testQueue.addTask(task));

    const results = await testQueue.getResults();
    expect(results).toEqual(tasks.map((task) => `Processed: ${task}`));
  });

  test("should respect maxWorkers limit", (done) => {
    const testQueue = new WorkQueueExecutor<string, string>(
      queueSize,
      timeout,
      maxWorkers,
      jobHandlerFunction,
    );

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
