import { Test, TestingModule } from '@nestjs/testing';
import { RootResolver } from './root.resolver';

describe('RootResolver', () => {
  it('ping returns pong', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RootResolver],
    }).compile();
    const resolver = module.get(RootResolver);
    expect(resolver.ping()).toBe('pong');
  });
});
