import { AuthAdminGuard } from './auth-admin.guard';

describe('AuthAdminGuard', () => {
  it('should be defined', () => {
    expect(new AuthAdminGuard()).toBeDefined();
  });
});
