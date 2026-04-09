import { registerEnumType } from '@nestjs/graphql';

jest.mock('@nestjs/graphql', () => ({
  registerEnumType: jest.fn(),
}));

import { registerGraphQlEnums } from './register-enums';

describe('registerGraphQlEnums', () => {
  it('registers TimeOffRequestStatus with GraphQL', () => {
    registerGraphQlEnums();
    expect(registerEnumType).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ name: 'TimeOffRequestStatus' }),
    );
  });
});
