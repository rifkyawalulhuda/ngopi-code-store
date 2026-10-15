import { OrderFulfillmentQueue } from './order-fulfillment-queue.service';

describe('OrderFulfillmentQueue', () => {
  let queue: OrderFulfillmentQueue;
  let createdQueue: { add: jest.Mock; process?: (job: any) => Promise<any> };
  let jobQueueService: { createQueue: jest.Mock };
  let requestContextService: { create: jest.Mock };
  let runner: { run: jest.Mock };

  beforeEach(() => {
    createdQueue = { add: jest.fn().mockResolvedValue({}) };
    jobQueueService = {
      createQueue: jest.fn().mockImplementation(async (options: any) => {
        createdQueue.process = options.process;
        return createdQueue;
      }),
    };
    requestContextService = { create: jest.fn().mockResolvedValue({ __ctx: true }) };
    runner = { run: jest.fn().mockResolvedValue({ downloadRecordsCreated: 1, emailSent: true, whatsappSent: true }) };

    queue = new OrderFulfillmentQueue(
      jobQueueService as any,
      requestContextService as any,
      runner as any,
    );
  });

  it('creates the order-fulfillment queue on init', async () => {
    await queue.onModuleInit();
    expect(jobQueueService.createQueue).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'order-fulfillment' }),
    );
  });

  it('enqueues a job with retries', async () => {
    await queue.onModuleInit();

    const accepted = await queue.enqueue(42);

    expect(accepted).toBe(true);
    expect(createdQueue.add).toHaveBeenCalledWith({ orderId: 42 }, { retries: 3 });
  });

  it('runs the fulfillment runner when the job is processed', async () => {
    await queue.onModuleInit();

    await createdQueue.process!({ data: { orderId: 7 } });

    expect(requestContextService.create).toHaveBeenCalledWith({ apiType: 'shop' });
    expect(runner.run).toHaveBeenCalledWith({ __ctx: true }, 7);
  });

  it('reports failure (without throwing) when the queue is not ready', async () => {
    // onModuleInit deliberately not called
    const accepted = await queue.enqueue(1);
    expect(accepted).toBe(false);
  });

  it('reports failure (without throwing) when adding the job fails', async () => {
    await queue.onModuleInit();
    createdQueue.add.mockRejectedValue(new Error('queue down'));

    const accepted = await queue.enqueue(9);

    expect(accepted).toBe(false);
  });
});
