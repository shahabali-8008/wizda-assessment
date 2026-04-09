import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Balance } from './entities/balance.entity';
import { Employee } from './entities/employee.entity';
import { Location } from './entities/location.entity';
import { TimeOffRequest } from './entities/time-off-request.entity';

const entities = [Employee, Location, Balance, TimeOffRequest];

@Module({
  imports: [TypeOrmModule.forFeature(entities)],
  exports: [TypeOrmModule],
})
export class DomainModule {}
