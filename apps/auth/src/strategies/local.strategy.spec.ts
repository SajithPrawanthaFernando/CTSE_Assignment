import { UnauthorizedException } from '@nestjs/common';
import { LocalStategy } from './local.strategy';

describe('LocalStategy', () => {
  const usersServiceMock = {
    verifyUser: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return user when credentials are valid', async () => {
    usersServiceMock.verifyUser.mockResolvedValueOnce({
      _id: '1',
      email: 'test@example.com',
      roles: ['user'],
    });

    const strategy = new LocalStategy(usersServiceMock as any);

    const result = await strategy.validate('test@example.com', 'Qw123456!');

    expect(usersServiceMock.verifyUser).toHaveBeenCalledWith(
      'test@example.com',
      'Qw123456!',
    );
    expect(result).toEqual({
      _id: '1',
      email: 'test@example.com',
      roles: ['user'],
    });
  });

  it('should throw UnauthorizedException when UsersService.verifyUser throws', async () => {
    usersServiceMock.verifyUser.mockRejectedValueOnce(
      new Error('Credentials are not valid.'),
    );

    const strategy = new LocalStategy(usersServiceMock as any);

    await expect(
      strategy.validate('test@example.com', 'wrong'),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(usersServiceMock.verifyUser).toHaveBeenCalledWith(
      'test@example.com',
      'wrong',
    );
  });
});
