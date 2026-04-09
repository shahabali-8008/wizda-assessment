import { Test, TestingModule } from '@nestjs/testing';
import { TimeOffRequestService } from '../application/time-off-request.service';
import { TimeOffRequestResolver } from './time-off-request.resolver';
import { TimeOffRequestStatus } from '../domain/enums/time-off-request-status.enum';

describe('TimeOffRequestResolver', () => {
  let resolver: TimeOffRequestResolver;
  const timeOff = {
    findById: jest.fn(),
    listForEmployee: jest.fn(),
    listPendingForManager: jest.fn(),
    createDraft: jest.fn(),
    submit: jest.fn(),
    cancel: jest.fn(),
    managerApprove: jest.fn(),
    managerReject: jest.fn(),
  };

  const id = '33333333-3333-4333-8333-333333333333';
  const eid = '44444444-4444-4444-8444-444444444444';
  const lid = '55555555-5555-4555-8555-555555555555';

  const baseRow = {
    id,
    employeeId: eid,
    locationId: lid,
    startDate: '2026-01-01',
    endDate: '2026-01-02',
    requestedDays: 1,
    status: TimeOffRequestStatus.DRAFT,
    idempotencyKey: null as string | null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimeOffRequestResolver,
        { provide: TimeOffRequestService, useValue: timeOff },
      ],
    }).compile();
    resolver = module.get(TimeOffRequestResolver);
  });

  it('timeOffRequest returns null when missing', async () => {
    timeOff.findById.mockResolvedValue(null);
    const row = await resolver.timeOffRequest(id);
    expect(row).toBeNull();
  });

  it('timeOffRequest returns mapped row', async () => {
    timeOff.findById.mockResolvedValue({ ...baseRow });
    const row = await resolver.timeOffRequest(id);
    expect(row?.status).toBe(TimeOffRequestStatus.DRAFT);
  });

  it('timeOffRequests maps list', async () => {
    timeOff.listForEmployee.mockResolvedValue([{ ...baseRow }]);
    const rows = await resolver.timeOffRequests(eid);
    expect(rows).toHaveLength(1);
    expect(rows[0].employeeId).toBe(eid);
  });

  it('pendingTimeOffRequests forwards optional locationId', async () => {
    timeOff.listPendingForManager.mockResolvedValue([]);
    await resolver.pendingTimeOffRequests(undefined);
    expect(timeOff.listPendingForManager).toHaveBeenCalledWith(undefined);
    await resolver.pendingTimeOffRequests(lid);
    expect(timeOff.listPendingForManager).toHaveBeenCalledWith(lid);
  });

  it('createTimeOffRequest passes input to service', async () => {
    timeOff.createDraft.mockResolvedValue({ ...baseRow });
    const row = await resolver.createTimeOffRequest({
      employeeId: eid,
      locationId: lid,
      startDate: '2026-01-01',
      endDate: '2026-01-02',
      requestedDays: 1,
      idempotencyKey: undefined,
    });
    expect(timeOff.createDraft).toHaveBeenCalledWith({
      employeeId: eid,
      locationId: lid,
      startDate: '2026-01-01',
      endDate: '2026-01-02',
      requestedDays: 1,
      idempotencyKey: null,
    });
    expect(row.id).toBe(id);
  });

  it('submitTimeOffRequest delegates', async () => {
    timeOff.submit.mockResolvedValue({
      ...baseRow,
      status: TimeOffRequestStatus.PENDING_MANAGER,
    });
    const row = await resolver.submitTimeOffRequest(id);
    expect(timeOff.submit).toHaveBeenCalledWith(id);
    expect(row.status).toBe(TimeOffRequestStatus.PENDING_MANAGER);
  });

  it('cancelTimeOffRequest delegates', async () => {
    timeOff.cancel.mockResolvedValue({
      ...baseRow,
      status: TimeOffRequestStatus.CANCELLED,
    });
    const row = await resolver.cancelTimeOffRequest(id);
    expect(timeOff.cancel).toHaveBeenCalledWith(id);
    expect(row.status).toBe(TimeOffRequestStatus.CANCELLED);
  });

  it('approveTimeOffRequest delegates', async () => {
    timeOff.managerApprove.mockResolvedValue({
      ...baseRow,
      status: TimeOffRequestStatus.APPROVED,
    });
    const row = await resolver.approveTimeOffRequest(id);
    expect(timeOff.managerApprove).toHaveBeenCalledWith(id);
    expect(row.status).toBe(TimeOffRequestStatus.APPROVED);
  });

  it('rejectTimeOffRequest delegates', async () => {
    timeOff.managerReject.mockResolvedValue({
      ...baseRow,
      status: TimeOffRequestStatus.REJECTED,
    });
    const row = await resolver.rejectTimeOffRequest(id);
    expect(timeOff.managerReject).toHaveBeenCalledWith(id);
    expect(row.status).toBe(TimeOffRequestStatus.REJECTED);
  });
});
