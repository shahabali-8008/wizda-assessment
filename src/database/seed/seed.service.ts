import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Balance } from '../../domain/entities/balance.entity';
import { Employee } from '../../domain/entities/employee.entity';
import { Location } from '../../domain/entities/location.entity';

/**
 * Idempotent demo data for local development (not for production).
 */
@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Employee)
    private readonly employees: Repository<Employee>,
    @InjectRepository(Location)
    private readonly locations: Repository<Location>,
    @InjectRepository(Balance)
    private readonly balances: Repository<Balance>,
  ) {}

  async run(): Promise<void> {
    const locNyc = await this.upsertLocation('NYC', 'New York Office');
    const locSfo = await this.upsertLocation('SFO', 'San Francisco Office');

    const alice = await this.upsertEmployee(
      'alice@example.com',
      'Alice',
      'Nguyen',
    );
    const bob = await this.upsertEmployee('bob@example.com', 'Bob', 'Singh');

    await this.upsertBalance(alice.id, locNyc.id, 10);
    await this.upsertBalance(alice.id, locSfo.id, 5);
    await this.upsertBalance(bob.id, locNyc.id, 15);

    this.logger.log('Seed complete (employees, locations, balances).');
  }

  private async upsertLocation(code: string, name: string): Promise<Location> {
    let loc = await this.locations.findOne({ where: { code } });
    if (!loc) {
      loc = this.locations.create({ code, name });
      loc = await this.locations.save(loc);
      this.logger.log(`Created location ${code}`);
    }
    return loc;
  }

  private async upsertEmployee(
    email: string,
    firstName: string,
    lastName: string,
  ): Promise<Employee> {
    let emp = await this.employees.findOne({ where: { email } });
    if (!emp) {
      emp = this.employees.create({ email, firstName, lastName });
      emp = await this.employees.save(emp);
      this.logger.log(`Created employee ${email}`);
    }
    return emp;
  }

  private async upsertBalance(
    employeeId: string,
    locationId: string,
    daysRemaining: number,
  ): Promise<void> {
    const existing = await this.balances.findOne({
      where: { employeeId, locationId },
    });
    if (existing) {
      existing.daysRemaining = daysRemaining;
      existing.lastSyncedAt = new Date();
      await this.balances.save(existing);
      return;
    }
    const row = this.balances.create({
      employeeId,
      locationId,
      daysRemaining,
      lastSyncedAt: new Date(),
    });
    await this.balances.save(row);
  }
}
