import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UnauthorizedException } from '@nestjs/common';

describe('UsersController', () => {
  let controller: UsersController;
  let moduleRef: TestingModule;

  const usersServiceMock = {
    create: jest.fn(),
    getAllUsers: jest.fn(),
    deleteUserById: jest.fn(),
    changeUserRole: jest.fn(),
    updateUserDetails: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersServiceMock }],
    }).compile();

    controller = moduleRef.get(UsersController);
  });

  describe('createUser', () => {
    it('should call UsersService.create and return result', async () => {
      usersServiceMock.create.mockResolvedValueOnce({
        _id: '1',
        email: 'a@b.com',
      });

      const dto: any = { email: 'a@b.com', password: 'Qw123456!' };
      const result = await controller.createUser(dto);

      expect(usersServiceMock.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ _id: '1', email: 'a@b.com' });
    });
  });

  describe('getUser', () => {
    it('should return the current user (passed in by @CurrentUser)', async () => {
      const user: any = { _id: '123', email: 'me@site.com', roles: ['user'] };

      const result = await controller.getUser(user);

      expect(result).toBe(user);
    });
  });

  describe('getAllUsers', () => {
    it('should call UsersService.getAllUsers and return list', async () => {
      usersServiceMock.getAllUsers.mockResolvedValueOnce([
        { email: 'a@a.com' },
        { email: 'b@b.com' },
      ]);

      const result = await controller.getAllUsers();

      expect(usersServiceMock.getAllUsers).toHaveBeenCalledTimes(1);
      expect(result).toEqual([{ email: 'a@a.com' }, { email: 'b@b.com' }]);
    });
  });

  describe('deleteUser', () => {
    it('should call UsersService.deleteUserById with id and return result', async () => {
      usersServiceMock.deleteUserById.mockResolvedValueOnce({ deleted: true });

      const result = await controller.deleteUser('abc123');

      expect(usersServiceMock.deleteUserById).toHaveBeenCalledWith('abc123');
      expect(result).toEqual({ deleted: true });
    });
  });

  describe('changeRole', () => {
    it('should call UsersService.changeUserRole with id and dto and return result', async () => {
      usersServiceMock.changeUserRole.mockResolvedValueOnce({ ok: true });

      const dto: any = { role: 'admin' };
      const result = await controller.changeRole('u1', dto);

      expect(usersServiceMock.changeUserRole).toHaveBeenCalledWith('u1', dto);
      expect(result).toEqual({ ok: true });
    });
  });

  describe('updateUser', () => {
    it('should throw UnauthorizedException if id does not match current user id', async () => {
      const currentUser: any = { _id: 'user-1' };

      await expect(
        controller.updateUser('user-2', { fullname: 'X' } as any, currentUser),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(usersServiceMock.updateUserDetails).not.toHaveBeenCalled();
    });

    it('should call UsersService.updateUserDetails when id matches current user id', async () => {
      usersServiceMock.updateUserDetails.mockResolvedValueOnce({ ok: true });

      const currentUser: any = { _id: '123' };
      const dto: any = { fullname: 'New Name', address: 'Colombo' };

      const result = await controller.updateUser('123', dto, currentUser);

      expect(usersServiceMock.updateUserDetails).toHaveBeenCalledWith(
        '123',
        dto,
      );
      expect(result).toEqual({ ok: true });
    });

    it('should match when user._id is not a string (ObjectId-like)', async () => {
      usersServiceMock.updateUserDetails.mockResolvedValueOnce({ ok: true });

      const currentUser: any = { _id: { toString: () => '999' } }; // mimics ObjectId behaviour
      const dto: any = { firstname: 'Test' };

      const result = await controller.updateUser('999', dto, currentUser);

      expect(usersServiceMock.updateUserDetails).toHaveBeenCalledWith(
        '999',
        dto,
      );
      expect(result).toEqual({ ok: true });
    });
  });
});
