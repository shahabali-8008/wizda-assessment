import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from './auth.constants';

/** Skips API key check (e.g. health checks). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
