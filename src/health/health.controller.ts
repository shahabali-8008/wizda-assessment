import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/is-public.decorator';

@Public()
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok' };
  }
}
