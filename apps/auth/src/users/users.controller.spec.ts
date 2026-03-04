import { Test } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UnauthorizedException } from '@nestjs/common';

describe('UsersController', () => {
  let controller: UsersController;

  const usersServiceMock = {
    create: jest.fn(),
    getAllUsers: jest.fn(),
    deleteUserById: jest.fn(),
    changeUserRole: jest.fn(),
    updateUserDetails: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersServiceMock }],
    }).compile();

    controller = moduleRef.get(UsersController);
  });

  it('should call service.create', async () => {
    usersServiceMock.create.mockResolvedValueOnce({ ok: true });
    const result = await controller.createUser({
      email: 'a@b.com',
      password: 'Qw123456!',
    } as any);
    expect(result).toEqual({ ok: true });
  });

  it('should throw UnauthorizedException if updating someone else', async () => {
    const user: any = { _id: 'abc' };
    await expect(
      controller.updateUser('someone-else', { fullname: 'x' } as any, user),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('should allow update if ids match', async () => {
    usersServiceMock.updateUserDetails.mockResolvedValueOnce({ ok: true });

    const user: any = { _id: '123' };
    const result = await controller.updateUser(
      '123',
      { fullname: 'x' } as any,
      user,
    );

    expect(usersServiceMock.updateUserDetails).toHaveBeenCalledWith('123', {
      fullname: 'x',
    });
    expect(result).toEqual({ ok: true });
  });
});
