import { Test } from '@nestjs/testing';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import * as bcrypt from 'bcryptjs';
import {
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;

  const repoMock = {
    findOne: jest.fn(),
    create: jest.fn(),
    getAllUsers: jest.fn(),
    deleteUserById: jest.fn(),
    changeUserRole: jest.fn(),
    updateUserDetails: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: repoMock },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  it('should create a user with hashed password', async () => {
    repoMock.findOne.mockRejectedValueOnce(new Error('not found'));
    repoMock.create.mockResolvedValueOnce({ _id: '1', email: 'a@b.com' });

    const hashSpy = jest
      .spyOn(bcrypt, 'hash')
      .mockResolvedValueOnce('hashed_pw' as any);

    const dto: any = { email: 'a@b.com', password: 'Qw123456!' };
    const result = await service.create(dto);

    expect(repoMock.findOne).toHaveBeenCalledWith({ email: 'a@b.com' });
    expect(hashSpy).toHaveBeenCalledWith('Qw123456!', 10);
    expect(repoMock.create).toHaveBeenCalledWith({
      ...dto,
      password: 'hashed_pw',
    });
    expect(result).toEqual({ _id: '1', email: 'a@b.com' });
  });

  it('should throw if email already exists on create', async () => {
    repoMock.findOne.mockResolvedValueOnce({ email: 'a@b.com' });

    await expect(
      service.create({ email: 'a@b.com', password: 'Qw123456!' } as any),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('should verify user when password is valid', async () => {
    repoMock.findOne.mockResolvedValueOnce({
      email: 'a@b.com',
      password: 'hashed',
    });
    jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true as any);

    const user = await service.verifyUser('a@b.com', 'Qw123456!');

    expect(repoMock.findOne).toHaveBeenCalledWith({ email: 'a@b.com' });
    expect(user).toEqual({ email: 'a@b.com', password: 'hashed' });
  });

  it('should throw UnauthorizedException when password is invalid', async () => {
    repoMock.findOne.mockResolvedValueOnce({
      email: 'a@b.com',
      password: 'hashed',
    });
    jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(false as any);

    await expect(service.verifyUser('a@b.com', 'wrong')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('should delegate getAllUsers', async () => {
    repoMock.getAllUsers.mockResolvedValueOnce([{ email: 'x@y.com' }]);
    const result = await service.getAllUsers();
    expect(result).toEqual([{ email: 'x@y.com' }]);
  });

  it('should delegate deleteUserById', async () => {
    repoMock.deleteUserById.mockResolvedValueOnce({ deleted: true });
    const result = await service.deleteUserById('123');
    expect(result).toEqual({ deleted: true });
  });

  it('should delegate changeUserRole', async () => {
    repoMock.changeUserRole.mockResolvedValueOnce({ ok: true });
    const result = await service.changeUserRole('123', {
      role: 'admin',
    } as any);
    expect(repoMock.changeUserRole).toHaveBeenCalledWith('123', 'admin');
    expect(result).toEqual({ ok: true });
  });

  it('should delegate updateUserDetails', async () => {
    repoMock.updateUserDetails.mockResolvedValueOnce({ ok: true });
    const result = await service.updateUserDetails('123', {
      fullname: 'New',
    } as any);
    expect(result).toEqual({ ok: true });
  });
});
