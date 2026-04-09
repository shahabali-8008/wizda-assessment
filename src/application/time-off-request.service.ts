import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TimeOffRequestStatus } from '../domain/enums/time-off-request-status.enum';
import { Employee } from '../domain/entities/employee.entity';
import { Location } from '../domain/entities/location.entity';
import { TimeOffRequest } from '../domain/entities/time-off-request.entity';
import { BalanceService } from './balance.service';
import { HcmClient } from '../hcm/hcm.client';

export interface CreateTimeOffParams {
  employeeId: string;
  locationId: string;
  startDate: string;
  endDate: string;
  requestedDays: number;
  idempotencyKey?: string | null;
}

@Injectable()
export class TimeOffRequestService {
  constructor(
    @InjectRepository(TimeOffRequest)
    private readonly requests: Repository<TimeOffRequest>,
    @InjectRepository(Employee)
    private readonly employees: Repository<Employee>,
    @InjectRepository(Location)
    private readonly locations: Repository<Location>,
    private readonly hcm: HcmClient,
    private readonly balances: BalanceService,
  ) {}

  async findById(id: string): Promise<TimeOffRequest | null> {
    return this.requests.findOne({ where: { id } });
  }

  async listForEmployee(employeeId: string): Promise<TimeOffRequest[]> {
    return this.requests.find({
      where: { employeeId },
      order: { createdAt: 'DESC' },
    });
  }

  async createDraft(input: CreateTimeOffParams): Promise<TimeOffRequest> {
    if (input.idempotencyKey) {
      const existing = await this.requests.findOne({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existing) {
        return existing;
      }
    }
    await this.assertEmployeeLocation(input.employeeId, input.locationId);
    if (input.requestedDays <= 0) {
      throw new BadRequestException('requestedDays must be positive');
    }
    const row = this.requests.create({
      employeeId: input.employeeId,
      locationId: input.locationId,
      startDate: input.startDate,
      endDate: input.endDate,
      requestedDays: input.requestedDays,
      status: TimeOffRequestStatus.DRAFT,
      idempotencyKey: input.idempotencyKey ?? null,
    });
    return this.requests.save(row);
  }

  async cancel(id: string): Promise<TimeOffRequest> {
    const req = await this.requireRequest(id);
    if (req.status === TimeOffRequestStatus.CANCELLED) {
      return req;
    }
    if (req.status !== TimeOffRequestStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT requests can be cancelled');
    }
    req.status = TimeOffRequestStatus.CANCELLED;
    return this.requests.save(req);
  }

  /**
   * Submits to HCM: reconciles cache, deducts via HCM, rejects on failure or silent inconsistency.
   */
  async submit(id: string): Promise<TimeOffRequest> {
    const req = await this.requireRequest(id);
    if (req.status !== TimeOffRequestStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT requests can be submitted');
    }
    req.status = TimeOffRequestStatus.PENDING_HCM;
    await this.requests.save(req);

    try {
      await this.balances.reconcileFromHcm(req.employeeId, req.locationId);
      const hcmBefore = await this.hcm.getBalance(
        req.employeeId,
        req.locationId,
      );
      if (hcmBefore < req.requestedDays) {
        req.status = TimeOffRequestStatus.REJECTED;
        return this.requests.save(req);
      }

      const result = await this.hcm.submitDeduction(
        req.employeeId,
        req.locationId,
        req.requestedDays,
      );
      if (!result.ok) {
        req.status = TimeOffRequestStatus.REJECTED;
        return this.requests.save(req);
      }

      const hcmAfter = await this.hcm.getBalance(
        req.employeeId,
        req.locationId,
      );
      const expected = hcmBefore - req.requestedDays;
      if (Math.abs(hcmAfter - expected) > 1e-6) {
        // Defensive: HCM claimed success but balance does not match expectation.
        req.status = TimeOffRequestStatus.REJECTED;
        return this.requests.save(req);
      }

      await this.balances.reconcileFromHcm(req.employeeId, req.locationId);
      req.status = TimeOffRequestStatus.APPROVED;
      return this.requests.save(req);
    } catch (err) {
      req.status = TimeOffRequestStatus.REJECTED;
      await this.requests.save(req);
      throw err;
    }
  }

  private async requireRequest(id: string): Promise<TimeOffRequest> {
    const req = await this.findById(id);
    if (!req) {
      throw new NotFoundException('Time-off request not found');
    }
    return req;
  }

  private async assertEmployeeLocation(
    employeeId: string,
    locationId: string,
  ): Promise<void> {
    const [emp, loc] = await Promise.all([
      this.employees.findOne({ where: { id: employeeId } }),
      this.locations.findOne({ where: { id: locationId } }),
    ]);
    if (!emp) {
      throw new BadRequestException('Unknown employeeId');
    }
    if (!loc) {
      throw new BadRequestException('Unknown locationId');
    }
  }
}
