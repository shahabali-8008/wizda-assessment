import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as Gql from '@nestjs/graphql';
import { ApiKeyGuard } from './api-key.guard';
import { IS_PUBLIC_KEY } from './auth.constants';

describe('ApiKeyGuard', () => {
  const secret = 'test-secret-key';

  function httpContext(req: {
    headers: Record<string, string | string[] | undefined>;
    method?: string;
    path?: string;
  }): ExecutionContext {
    /** Default simulates POST /graphql, not GET / (dev UI is public). */
    const full = {
      method: 'POST',
      path: '/graphql',
      ...req,
    };
    return {
      getType: () => 'http',
      getHandler: () => jest.fn(),
      getClass: () => class TestClass {},
      switchToHttp: () => ({
        getRequest: () => full,
      }),
    } as unknown as ExecutionContext;
  }

  function graphqlContext(req: {
    headers: Record<string, string | string[] | undefined>;
  }): ExecutionContext {
    const ctx = {
      getType: () => 'graphql',
      getHandler: () => jest.fn(),
      getClass: () => class TestClass {},
    } as unknown as ExecutionContext;
    jest.spyOn(Gql.GqlExecutionContext, 'create').mockReturnValue({
      getContext: () => ({ req }),
    } as ReturnType<typeof Gql.GqlExecutionContext.create>);
    return ctx;
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('allows GET / dev UI assets when API_KEY set', () => {
    const config = { get: jest.fn(() => secret) };
    const reflector = {
      getAllAndOverride: jest.fn(() => false),
    } as unknown as Reflector;
    const guard = new ApiKeyGuard(config as never, reflector);
    expect(
      guard.canActivate(httpContext({ headers: {}, method: 'GET', path: '/' })),
    ).toBe(true);
  });

  it('allows when API_KEY unset', () => {
    const config = { get: jest.fn(() => undefined) };
    const reflector = {
      getAllAndOverride: jest.fn(() => false),
    } as unknown as Reflector;
    const guard = new ApiKeyGuard(config as never, reflector);
    expect(guard.canActivate(httpContext({ headers: {} }))).toBe(true);
  });

  it('allows when API_KEY is whitespace only', () => {
    const config = { get: jest.fn(() => '   ') };
    const reflector = {
      getAllAndOverride: jest.fn(() => false),
    } as unknown as Reflector;
    const guard = new ApiKeyGuard(config as never, reflector);
    expect(guard.canActivate(httpContext({ headers: {} }))).toBe(true);
  });

  it('allows @Public routes when API_KEY set', () => {
    const config = { get: jest.fn(() => secret) };
    const reflector = {
      getAllAndOverride: jest.fn((key: string) => key === IS_PUBLIC_KEY),
    } as unknown as Reflector;
    const guard = new ApiKeyGuard(config as never, reflector);
    expect(guard.canActivate(httpContext({ headers: {} }))).toBe(true);
  });

  it('rejects when key missing', () => {
    const config = { get: jest.fn(() => secret) };
    const reflector = {
      getAllAndOverride: jest.fn(() => false),
    } as unknown as Reflector;
    const guard = new ApiKeyGuard(config as never, reflector);
    expect(() => guard.canActivate(httpContext({ headers: {} }))).toThrow(
      UnauthorizedException,
    );
  });

  it('accepts X-Api-Key header', () => {
    const config = { get: jest.fn(() => secret) };
    const reflector = {
      getAllAndOverride: jest.fn(() => false),
    } as unknown as Reflector;
    const guard = new ApiKeyGuard(config as never, reflector);
    expect(
      guard.canActivate(httpContext({ headers: { 'x-api-key': secret } })),
    ).toBe(true);
  });

  it('accepts first value when x-api-key is array', () => {
    const config = { get: jest.fn(() => secret) };
    const reflector = {
      getAllAndOverride: jest.fn(() => false),
    } as unknown as Reflector;
    const guard = new ApiKeyGuard(config as never, reflector);
    expect(
      guard.canActivate(
        httpContext({ headers: { 'x-api-key': [secret, 'other'] } }),
      ),
    ).toBe(true);
  });

  it('accepts Authorization Bearer', () => {
    const config = { get: jest.fn(() => secret) };
    const reflector = {
      getAllAndOverride: jest.fn(() => false),
    } as unknown as Reflector;
    const guard = new ApiKeyGuard(config as never, reflector);
    expect(
      guard.canActivate(
        httpContext({ headers: { authorization: `Bearer ${secret}` } }),
      ),
    ).toBe(true);
  });

  it('works for GraphQL context', () => {
    const config = { get: jest.fn(() => secret) };
    const reflector = {
      getAllAndOverride: jest.fn(() => false),
    } as unknown as Reflector;
    const guard = new ApiKeyGuard(config as never, reflector);
    expect(
      guard.canActivate(graphqlContext({ headers: { 'x-api-key': secret } })),
    ).toBe(true);
  });
});
