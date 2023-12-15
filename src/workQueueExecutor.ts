type TaskHandler<T, R> = (
  task: T,
  queue: WorkQueueExecutor<T, R>,
) => Promise<R>;

export class WorkQueueExecutor<T, R> {
  private taskQueue: { task: T; index: number }[] = [];
  private results: (R | undefined)[] = [];
  private processingCount = 0;
  private resolve!: (value: (R | undefined)[]) => void;
  private reject!: (reason?: any) => void;
  private startTime: number;
  private taskIndex = 0;

  constructor(
    private maxQueueSize: number,
    private timeout: number,
    private maxWorkers: number,
    private taskHandler: TaskHandler<T, R>,
  ) {
    this.startTime = Date.now();
    this.results = [];
  }

  public addTask(task: T): void {
    if (this.taskQueue.length >= this.maxQueueSize) {
      throw new Error("Queue is full");
    }
    this.taskQueue.push({ task, index: this.taskIndex++ });
    this.results.push(undefined);
  }

  public getResults(): Promise<R[]> {
    return new Promise((resolve, reject) => {
      for (let i = 0; i < this.maxWorkers; i++) {
        this.processQueue();
      }
    });
  }

  private async processQueue(): Promise<void> {
    if (Date.now() - this.startTime > this.timeout) {
      console.error("Timeout exceeded");
      return this.reject(new Error("Timeout exceeded"));
    }

    if (this.taskQueue.length === 0 && this.processingCount === 0) {
      return this.resolve(this.results);
    }

    while (
      this.taskQueue.length > 0 &&
      this.processingCount < this.maxWorkers
    ) {
      const { task, index } = this.taskQueue.shift()!;
      this.processingCount++;

      try {
        const result = await this.taskHandler(task, this);
        this.results[index] = result;
      } catch (error) {
        this.reject(error);
        return;
      } finally {
        this.processingCount--;
      }

      this.processQueue();
    }
  }
}
