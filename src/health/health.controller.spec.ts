import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('check returns ok status', async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();
    const controller = module.get(HealthController);
    expect(controller.check()).toEqual({ status: 'ok' });
  });
});
