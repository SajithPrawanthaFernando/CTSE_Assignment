import { UsersRepository } from './users.repository';

describe('UsersRepository', () => {
  let repo: UsersRepository;

  beforeEach(() => {
    // userModel isn't used directly in these tests because we mock base methods
    repo = new UsersRepository({} as any);

    // Mock inherited methods from AbstractRepository
    (repo as any).find = jest.fn();
    (repo as any).findOneAndDelete = jest.fn();
    (repo as any).findOneAndUpdate = jest.fn();
  });

  it('getAllUsers should call find({})', async () => {
    const users = [{ email: 'a@b.com' }, { email: 'c@d.com' }];
    (repo as any).find.mockResolvedValueOnce(users);

    const result = await repo.getAllUsers();

    expect((repo as any).find).toHaveBeenCalledWith({});
    expect(result).toEqual(users);
  });

  it('deleteUserById should call findOneAndDelete with _id', async () => {
    const deletedUser = { _id: '123', email: 'x@y.com' };
    (repo as any).findOneAndDelete.mockResolvedValueOnce(deletedUser);

    const result = await repo.deleteUserById('123');

    expect((repo as any).findOneAndDelete).toHaveBeenCalledWith({ _id: '123' });
    expect(result).toEqual(deletedUser);
  });

  it('changeUserRole should call findOneAndUpdate with $set roles array', async () => {
    const updatedUser = { _id: '123', roles: ['admin'] };
    (repo as any).findOneAndUpdate.mockResolvedValueOnce(updatedUser);

    const result = await repo.changeUserRole('123', 'admin');

    expect((repo as any).findOneAndUpdate).toHaveBeenCalledWith(
      { _id: '123' },
      { $set: { roles: ['admin'] } },
    );
    expect(result).toEqual(updatedUser);
  });

  it('updateUserDetails should call findOneAndUpdate with provided fields', async () => {
    const updatedUser = { _id: '123', fullname: 'New Name' };
    (repo as any).findOneAndUpdate.mockResolvedValueOnce(updatedUser);

    const updateFields = { fullname: 'New Name', address: 'Colombo' } as any;

    const result = await repo.updateUserDetails('123', updateFields);

    expect((repo as any).findOneAndUpdate).toHaveBeenCalledWith(
      { _id: '123' },
      updateFields,
    );
    expect(result).toEqual(updatedUser);
  });
});
