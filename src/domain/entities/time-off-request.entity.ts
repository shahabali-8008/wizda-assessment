import { randomUUID } from 'crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TimeOffRequestStatus } from '../enums/time-off-request-status.enum';
import { Employee } from './employee.entity';
import { Location } from './location.entity';

@Entity('time_off_requests')
@Index(['employeeId', 'locationId'])
export class TimeOffRequest {
  @PrimaryColumn('uuid')
  id!: string;

  @BeforeInsert()
  setId(): void {
    if (!this.id) {
      this.id = randomUUID();
    }
  }

  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId!: string;

  @Column({ name: 'location_id', type: 'uuid' })
  locationId!: string;

  @ManyToOne(() => Employee, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id' })
  employee!: Employee;

  @ManyToOne(() => Location, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'location_id' })
  location!: Location;

  @Column({ name: 'start_date', type: 'date' })
  startDate!: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate!: string;

  @Column({ name: 'requested_days', type: 'float' })
  requestedDays!: number;

  @Column({
    type: 'simple-enum',
    enum: TimeOffRequestStatus,
  })
  status!: TimeOffRequestStatus;

  @Column({
    name: 'idempotency_key',
    type: 'varchar',
    nullable: true,
    unique: true,
  })
  idempotencyKey!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt!: Date;
}
