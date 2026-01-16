import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddAvatarUrlToUsers1737100100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if column exists before adding
    const table = await queryRunner.getTable('users');
    const avatarUrlColumn = table?.findColumnByName('avatarUrl');

    if (!avatarUrlColumn) {
      await queryRunner.addColumn(
        'users',
        new TableColumn({
          name: 'avatarUrl',
          type: 'varchar',
          length: '500',
          isNullable: true,
        }),
      );
      console.log('Added avatarUrl column to users table');
    } else {
      console.log('avatarUrl column already exists in users table');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('users');
    const avatarUrlColumn = table?.findColumnByName('avatarUrl');

    if (avatarUrlColumn) {
      await queryRunner.dropColumn('users', 'avatarUrl');
      console.log('Dropped avatarUrl column from users table');
    }
  }
}
