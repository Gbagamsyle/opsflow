import { Test } from '@nestjs/testing';
import { PrismaService } from '../database/prisma.service';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  let service: TasksService;
  const prisma = {
    membership: { findUnique: jest.fn() },
    project: { findFirst: jest.fn() },
    task: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [TasksService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(TasksService);
  });

  function authorizeTask(task = { id: 'task-2', status: 'TODO', position: 1 }) {
    prisma.membership.findUnique.mockResolvedValue({ id: 'membership-1' });
    prisma.project.findFirst.mockResolvedValue({ id: 'project-1' });
    prisma.task.findFirst.mockResolvedValue(task);
  }

  it('rejects task moves for users outside the organization', async () => {
    prisma.membership.findUnique.mockResolvedValue(null);

    await expect(
      service.moveForProject('org-1', 'project-1', 'task-1', 'user-1', {
        status: 'TODO',
        position: 0,
      }),
    ).rejects.toThrow('Organization not found');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('reindexes a task when it moves within the same column', async () => {
    authorizeTask();
    const transaction = {
      task: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'task-1', status: 'TODO', position: 0 },
          { id: 'task-2', status: 'TODO', position: 1 },
          { id: 'task-3', status: 'TODO', position: 2 },
        ]),
        update: jest.fn().mockResolvedValue({}),
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'task-2', status: 'TODO', position: 0 }),
      },
    };
    prisma.$transaction.mockImplementation(
      (callback: (client: typeof transaction) => unknown) =>
        callback(transaction),
    );

    await service.moveForProject('org-1', 'project-1', 'task-2', 'user-1', {
      status: 'TODO',
      position: 0,
    });

    expect(transaction.task.update).toHaveBeenCalledTimes(3);
    expect(transaction.task.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'task-2' },
      data: { status: 'TODO', position: 0 },
    });
    expect(transaction.task.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'task-1' },
      data: { status: 'TODO', position: 1 },
    });
  });

  it('reindexes both columns when a task changes status', async () => {
    authorizeTask();
    const transaction = {
      task: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([
            { id: 'task-1', status: 'TODO', position: 0 },
            { id: 'task-2', status: 'TODO', position: 1 },
          ])
          .mockResolvedValueOnce([
            { id: 'task-3', status: 'DONE', position: 0 },
          ]),
        update: jest.fn().mockResolvedValue({}),
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'task-2', status: 'DONE', position: 1 }),
      },
    };
    prisma.$transaction.mockImplementation(
      (callback: (client: typeof transaction) => unknown) =>
        callback(transaction),
    );

    await service.moveForProject('org-1', 'project-1', 'task-2', 'user-1', {
      status: 'DONE',
      position: 1,
    });

    expect(transaction.task.update).toHaveBeenCalledTimes(3);
    expect(transaction.task.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'task-1' },
      data: { status: 'TODO', position: 0 },
    });
    expect(transaction.task.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'task-3' },
      data: { status: 'DONE', position: 0 },
    });
    expect(transaction.task.update).toHaveBeenNthCalledWith(3, {
      where: { id: 'task-2' },
      data: { status: 'DONE', position: 1 },
    });
  });
});
